import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { responseCostBrl } from "./pricing";

const port = Number(process.env.FIFONES_API_PORT ?? 8787);
const openAiKey = process.env.OPENAI_API_KEY;
const apiToken = process.env.FIFONES_API_TOKEN;
const dataDir = process.env.FIFONES_API_DATA_DIR ?? path.join(process.cwd(), ".fifones-api");
const ledgerPath = path.join(dataDir, "cost-ledger.json");
const monthlyBudgetBrl = Number(process.env.FIFONES_API_MONTHLY_BUDGET_BRL ?? 30);
const realtimeReservationBrl = Number(
  process.env.FIFONES_API_REALTIME_RESERVATION_BRL ?? 0.5
);
const upstreamTimeoutMs = Number(process.env.FIFONES_API_TIMEOUT_MS ?? 45_000);
const usdToBrl = Number(process.env.FIFONES_API_USD_TO_BRL ?? 5.5);

interface Ledger {
  month: string;
  spentBrl: number;
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

async function readLedger(): Promise<Ledger> {
  try {
    const parsed = JSON.parse(await fs.readFile(ledgerPath, "utf8")) as Ledger;
    return parsed.month === monthKey() ? parsed : { month: monthKey(), spentBrl: 0 };
  } catch {
    return { month: monthKey(), spentBrl: 0 };
  }
}

async function addSpend(amountBrl: number): Promise<Ledger> {
  const ledger = await readLedger();
  ledger.spentBrl = Math.max(0, ledger.spentBrl + Math.max(0, amountBrl));
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(ledgerPath, JSON.stringify(ledger, null, 2), "utf8");
  return ledger;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": process.env.FIFONES_API_ALLOW_ORIGIN ?? "*"
  });
  response.end(JSON.stringify(body));
}

function requestToken(request: IncomingMessage): string | undefined {
  const authorization = request.headers.authorization ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : undefined;
}

function isAuthorized(request: IncomingMessage): boolean {
  if (!apiToken) return false;
  return requestToken(request) === apiToken;
}

async function readBody(request: IncomingMessage, maxBytes = 12 * 1024 * 1024): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) throw new Error("Payload excede o limite do API.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function requestModel(body: Buffer): string {
  try {
    const parsed = JSON.parse(body.toString("utf8")) as { model?: string };
    return parsed.model?.trim() || "gpt-5.6-sol";
  } catch {
    return "gpt-5.6-sol";
  }
}

function latestStreamingCost(sse: string, model: string): number {
  let cost = 0;
  for (const line of sse.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      cost = Math.max(cost, responseCostBrl(JSON.parse(data), model, usdToBrl));
    } catch {
      // Partial/non-JSON events carry no billable usage record.
    }
  }
  return cost;
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 1): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), upstreamTimeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function proxyOpenAi(
  request: IncomingMessage,
  response: ServerResponse,
  endpoint: "/v1/responses" | "/v1/realtime/calls"
): Promise<void> {
  if (!openAiKey) {
    sendJson(response, 503, { error: { message: "OPENAI_API_KEY não configurada no API." } });
    return;
  }

  const ledger = await readLedger();
  if (ledger.spentBrl >= monthlyBudgetBrl) {
    sendJson(response, 429, { error: { message: "Orçamento mensal do Fifones API atingido." } });
    return;
  }

  const body = await readBody(request);
  const model = requestModel(body);
  const contentType = request.headers["content-type"] ?? "application/octet-stream";
  const safetyIdentifier = request.headers["openai-safety-identifier"];
  const upstreamHeaders: Record<string, string> = {
    Authorization: `Bearer ${openAiKey}`,
    "Content-Type": contentType
  };
  if (typeof safetyIdentifier === "string") {
    upstreamHeaders["OpenAI-Safety-Identifier"] = safetyIdentifier;
  }
  const wantsStream = endpoint === "/v1/responses" && body.toString("utf8").includes('"stream":true');
  const upstream = await fetchWithRetry(`https://api.openai.com${endpoint}`, {
    method: "POST",
    headers: upstreamHeaders,
    body
  });
  if (!upstream.ok) {
    const upstreamBody = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") ?? contentType });
    response.end(upstreamBody);
    return;
  }

  if (wantsStream && upstream.body) {
    response.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": process.env.FIFONES_API_ALLOW_ORIGIN ?? "*"
    });
    let usageTail = "";
    for await (const chunk of upstream.body as unknown as AsyncIterable<Uint8Array>) {
      const buffer = Buffer.from(chunk);
      response.write(buffer);
      usageTail = (usageTail + buffer.toString("utf8")).slice(-512_000);
    }
    response.end();
    await addSpend(latestStreamingCost(usageTail, model));
    return;
  }

  const upstreamBody = Buffer.from(await upstream.arrayBuffer());

  const contentTypeResponse = upstream.headers.get("content-type") ?? "application/json";
  response.writeHead(upstream.status, {
    "Content-Type": contentTypeResponse,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": process.env.FIFONES_API_ALLOW_ORIGIN ?? "*"
  });
  response.end(upstreamBody);

  let parsed: unknown = undefined;
  try { parsed = JSON.parse(upstreamBody.toString("utf8")); } catch { /* multipart/audio or text */ }
  const estimated = endpoint === "/v1/realtime/calls" ? realtimeReservationBrl : responseCostBrl(parsed, model, usdToBrl);
  await addSpend(estimated);
}

async function proxyTranscription(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!openAiKey) { sendJson(response, 503, { error: { message: "OPENAI_API_KEY não configurada no API." } }); return; }
  const ledger = await readLedger();
  if (ledger.spentBrl >= monthlyBudgetBrl) { sendJson(response, 429, { error: { message: "Orçamento mensal do Fifones API atingido." } }); return; }
  const body = await readBody(request);
  const contentType = typeof request.headers["content-type"] === "string" ? request.headers["content-type"] : "multipart/form-data";
  const upstream = await fetchWithRetry("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": contentType },
    body
  });
  const result = Buffer.from(await upstream.arrayBuffer());
  response.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") ?? "application/json", "Access-Control-Allow-Origin": process.env.FIFONES_API_ALLOW_ORIGIN ?? "*" });
  response.end(result);
  if (upstream.ok) await addSpend(0.02);
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": process.env.FIFONES_API_ALLOW_ORIGIN ?? "*",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, OpenAI-Safety-Identifier",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
      });
      response.end();
      return;
    }

    if (request.method === "GET" && request.url === "/health") {
      const ledger = await readLedger();
      sendJson(response, 200, {
        ok: true,
        service: "fifones-api",
        month: ledger.month,
        spentBrl: Number(ledger.spentBrl.toFixed(4)),
        budgetBrl: monthlyBudgetBrl,
        remainingBrl: Number(Math.max(0, monthlyBudgetBrl - ledger.spentBrl).toFixed(4))
      });
      return;
    }

    if (!isAuthorized(request)) {
      sendJson(response, 401, { error: { message: "Token do Fifones API inválido." } });
      return;
    }

    if (request.method === "POST" && request.url === "/v1/responses") {
      await proxyOpenAi(request, response, "/v1/responses");
      return;
    }
    if (request.method === "POST" && request.url === "/v1/realtime/calls") {
      await proxyOpenAi(request, response, "/v1/realtime/calls");
      return;
    }
    if (request.method === "POST" && request.url === "/v1/audio/transcriptions") {
      await proxyTranscription(request, response);
      return;
    }

    sendJson(response, 404, { error: { message: "Rota não encontrada." } });
  } catch (error) {
    sendJson(response, 500, {
      error: { message: error instanceof Error ? error.message : "Erro interno do API." }
    });
  }
});

if (!apiToken) {
  console.error("FIFONES_API_TOKEN é obrigatório; API não iniciado.");
  process.exitCode = 1;
} else {
  server.listen(port, "127.0.0.1", () => {
    console.log(`Fifones API ouvindo em http://127.0.0.1:${port}`);
  });
}
