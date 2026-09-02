"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const node_http_1 = require("node:http");
const electron_1 = require("electron");
const demo_js_1 = require("../core/demo.js");
const interviews_js_1 = require("../core/interviews.js");
const purpose_js_1 = require("../core/purpose.js");
const retrieval_js_1 = require("../core/retrieval.js");
const safety_js_1 = require("../core/safety.js");
const usage_js_1 = require("../core/usage.js");
const ai_routing_js_1 = require("../core/ai-routing.js");
const proactive_js_1 = require("../core/proactive.js");
const database_js_1 = require("./database.js");
const vision_js_1 = require("../core/vision.js");
const openai_js_1 = require("./openai.js");
const security_js_1 = require("./security.js");
let mainWindow = null;
let database;
let keyStore;
let apiKeyPath;
let fifonesApiTokenPath;
let fifonesApiToken;
let googleTokenPath;
let tray = null;
let compactMode = false;
let auraOnly = false;
let reminderTimer = null;
let budgetOverride = false;
let isQuitting = false;
let lastProactiveFingerprint = "";
let lastProactiveAt = 0;
let googleProactiveEvents = [];
let googleProactiveEventsAt = 0;
function kokoroScriptPath() {
    return electron_1.app.isPackaged
        ? node_path_1.default.join(process.resourcesPath, "app.asar.unpacked", "scripts", "kokoro-tts.py")
        : node_path_1.default.resolve(__dirname, "..", "..", "scripts", "kokoro-tts.py");
}
async function resolveKokoroPython() {
    const candidates = [
        process.env.FIFONES_KOKORO_PYTHON,
        node_path_1.default.join(electron_1.app.getPath("documents"), "Codex", ".kokoro", "Scripts", "python.exe")
    ].filter((candidate) => Boolean(candidate));
    for (const candidate of candidates) {
        try {
            await node_fs_1.promises.access(candidate);
            return candidate;
        }
        catch {
            // Try the next configured location.
        }
    }
    return null;
}
async function runKokoro(python, text, voice) {
    const script = kokoroScriptPath();
    await node_fs_1.promises.access(script);
    const output = node_path_1.default.join(node_os_1.default.tmpdir(), `fifones-kokoro-${(0, node_crypto_1.randomUUID)()}.wav`);
    try {
        await new Promise((resolve, reject) => {
            const child = (0, node_child_process_1.spawn)(python, [script, "--text", text, "--voice", voice, "--output", output], {
                windowsHide: true
            });
            let stderr = "";
            const timer = setTimeout(() => child.kill(), 90_000);
            child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
            child.on("error", reject);
            child.on("close", (code) => {
                clearTimeout(timer);
                if (code === 0)
                    resolve();
                else
                    reject(new Error(stderr.trim() || "O Kokoro nÃƒÂ£o conseguiu gerar o ÃƒÂ¡udio local."));
            });
        });
        return await node_fs_1.promises.readFile(output);
    }
    finally {
        await node_fs_1.promises.unlink(output).catch(() => undefined);
    }
}
function apiKeyAvailable() {
    try {
        return electron_1.safeStorage.isEncryptionAvailable();
    }
    catch {
        return false;
    }
}
async function readApiKey() {
    try {
        const encrypted = await node_fs_1.promises.readFile(apiKeyPath);
        return electron_1.safeStorage.decryptString(encrypted);
    }
    catch (error) {
        if (error.code === "ENOENT")
            return undefined;
        throw error;
    }
}
function ownApiBaseUrl() {
    return database?.getSettings().aiApiBaseUrl || process.env.FIFONES_API_BASE_URL || undefined;
}
function ownApiConfigured() {
    return Boolean(ownApiBaseUrl() && (fifonesApiToken || process.env.FIFONES_API_TOKEN));
}
function aiCredential(storedOpenAiKey) {
    return ownApiConfigured() ? fifonesApiToken || process.env.FIFONES_API_TOKEN : storedOpenAiKey;
}
async function readFifonesApiToken() {
    try {
        return electron_1.safeStorage.decryptString(await node_fs_1.promises.readFile(fifonesApiTokenPath));
    }
    catch (error) {
        if (error.code === "ENOENT")
            return undefined;
        throw error;
    }
}
async function writeFifonesApiToken(token) {
    if (!apiKeyAvailable())
        throw new Error("A proteÃ§Ã£o de credenciais do Windows nÃ£o estÃ¡ disponÃ­vel.");
    if (token.trim().length < 8)
        throw new Error("O token do Fifones API parece curto demais.");
    await node_fs_1.promises.writeFile(fifonesApiTokenPath, electron_1.safeStorage.encryptString(token.trim()), { mode: 0o600 });
    fifonesApiToken = token.trim();
}
async function writeApiKey(key) {
    if (!apiKeyAvailable()) {
        throw new Error("A proteÃ§Ã£o de credenciais do Windows nÃ£o estÃ¡ disponÃ­vel.");
    }
    if (!key.startsWith("sk-")) {
        throw new Error("A chave parece invÃ¡lida. Use uma chave da OpenAI iniciada por sk-.");
    }
    const encrypted = electron_1.safeStorage.encryptString(key.trim());
    await node_fs_1.promises.writeFile(apiKeyPath, encrypted, { mode: 0o600 });
}
async function readGoogleToken() {
    try {
        const encrypted = await node_fs_1.promises.readFile(googleTokenPath);
        return JSON.parse(electron_1.safeStorage.decryptString(encrypted));
    }
    catch (error) {
        if (error.code === "ENOENT")
            return undefined;
        throw error;
    }
}
async function writeGoogleToken(token) {
    if (!apiKeyAvailable()) {
        throw new Error("A proteÃ§Ã£o de credenciais do Windows nÃ£o estÃ¡ disponÃ­vel.");
    }
    await node_fs_1.promises.writeFile(googleTokenPath, electron_1.safeStorage.encryptString(JSON.stringify(token)), { mode: 0o600 });
}
async function getGoogleAccessToken() {
    const token = await readGoogleToken();
    if (!token)
        throw new Error("Google Calendar ainda nÃ£o estÃ¡ conectado.");
    if (token.expiresAt > Date.now() + 60_000)
        return token.accessToken;
    if (!token.refreshToken)
        throw new Error("A autorizaÃ§Ã£o do Google expirou. Conecte novamente.");
    const clientId = database.getSettings().googleCalendarClientId;
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            refresh_token: token.refreshToken,
            grant_type: "refresh_token"
        })
    });
    if (!response.ok)
        throw new Error("NÃ£o foi possÃ­vel renovar o acesso ao Google Calendar.");
    const body = (await response.json());
    const refreshed = {
        ...token,
        accessToken: body.access_token,
        expiresAt: Date.now() + body.expires_in * 1000
    };
    await writeGoogleToken(refreshed);
    return refreshed.accessToken;
}
async function listGoogleCalendarEvents() {
    const accessToken = await getGoogleAccessToken();
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
    const query = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "20"
    });
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${query}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok)
        throw new Error("NÃ£o foi possÃ­vel ler sua agenda do Google.");
    const body = (await response.json());
    return (body.items ?? []).map((event) => ({
        id: event.id,
        title: event.summary ?? "Evento sem tÃ­tulo",
        start: event.start?.dateTime ?? event.start?.date ?? timeMin,
        end: event.end?.dateTime ?? event.end?.date,
        location: event.location,
        htmlLink: event.htmlLink
    }));
}
async function connectGoogleCalendar() {
    const clientId = database.getSettings().googleCalendarClientId.trim();
    if (!clientId) {
        throw new Error("Adicione primeiro o Client ID de aplicativo para computador.");
    }
    const state = (0, node_crypto_1.randomBytes)(24).toString("hex");
    const verifier = (0, node_crypto_1.randomBytes)(48).toString("base64url");
    const challenge = (0, node_crypto_1.createHash)("sha256").update(verifier).digest("base64url");
    const server = (0, node_http_1.createServer)();
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
        server.close();
        throw new Error("NÃ£o foi possÃ­vel abrir o retorno seguro do Google.");
    }
    const redirectUri = `http://127.0.0.1:${address.port}/oauth/callback`;
    const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorization.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/calendar.events.readonly",
        access_type: "offline",
        prompt: "consent",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256"
    }).toString();
    const codePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            server.close();
            reject(new Error("A conexÃ£o com o Google expirou. Tente novamente."));
        }, 120_000);
        server.on("request", (request, response) => {
            const callback = new URL(request.url ?? "/", redirectUri);
            if (callback.pathname !== "/oauth/callback")
                return;
            clearTimeout(timeout);
            const returnedState = callback.searchParams.get("state");
            const code = callback.searchParams.get("code");
            response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            response.end("<h2>Google Calendar conectado ao Fifones.</h2><p>VocÃª pode fechar esta janela.</p>");
            server.close();
            if (returnedState !== state || !code) {
                reject(new Error("O retorno do Google nÃ£o pÃ´de ser validado."));
            }
            else {
                resolve(code);
            }
        });
    });
    await electron_1.shell.openExternal(authorization.toString());
    const code = await codePromise;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            code,
            code_verifier: verifier,
            grant_type: "authorization_code",
            redirect_uri: redirectUri
        })
    });
    if (!tokenResponse.ok)
        throw new Error("O Google nÃ£o aceitou a autorizaÃ§Ã£o.");
    const body = (await tokenResponse.json());
    await writeGoogleToken({
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
        expiresAt: Date.now() + body.expires_in * 1000
    });
    return listGoogleCalendarEvents();
}
async function activePurposeContract() {
    const contract = database.activeContract();
    if (contract && !(0, purpose_js_1.validateContractPurpose)(contract).aligned) {
        await database.stopContract(contract.id);
        return undefined;
    }
    return contract;
}
async function bootstrap() {
    await database.open();
    await activePurposeContract();
    return {
        settings: database.getSettings(),
        stats: database.getStats(),
        memories: database.listMemories(),
        contracts: database.listContracts(),
        messages: database.listMessages(),
        tasks: database.listTasks(),
        calendarEvents: database.listCalendarEvents(),
        gamification: database.getGamification(),
        reminders: database.listReminders(),
        proposals: database.listProposals(),
        pendingApprovals: database.listPendingApprovals(),
        auditEvents: database.listAuditEvents(),
        skills: database.getSkills(),
        people: database.listPeople(),
        usageBudget: database.getUsageBudget(),
        googleCalendarConnected: Boolean(await readGoogleToken()),
        hasApiKey: Boolean((await readApiKey()) || ownApiConfigured()),
        hasOwnApiToken: Boolean(fifonesApiToken || process.env.FIFONES_API_TOKEN),
        encryptionAvailable: keyStore.isAvailable()
    };
}
function handle(channel, action) {
    electron_1.ipcMain.handle(channel, async (_event, ...args) => {
        try {
            return await action(...args);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Erro inesperado.";
            throw new Error(message);
        }
    });
}
function isWithinQuietHours(settings, date = new Date()) {
    const minutes = date.getHours() * 60 + date.getMinutes();
    const parse = (value) => {
        const [hour, minute] = value.split(":").map(Number);
        return hour * 60 + minute;
    };
    const start = parse(settings.quietHoursStart);
    const end = parse(settings.quietHoursEnd);
    return start <= end
        ? minutes >= start && minutes < end
        : minutes >= start || minutes < end;
}
function summonMainWindow() {
    if (!mainWindow)
        return;
    if (mainWindow.isMinimized())
        mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
}
function showNotification(title, body, view) {
    if (!electron_1.Notification.isSupported())
        return;
    const notification = new electron_1.Notification({
        title,
        body,
        silent: false,
        timeoutType: "default"
    });
    notification.on("click", () => {
        summonMainWindow();
        mainWindow?.webContents.send("app:navigate", view);
    });
    notification.show();
}
function setCompactMode(next) {
    if (!mainWindow)
        return compactMode;
    compactMode = next;
    auraOnly = false;
    const workArea = electron_1.screen.getPrimaryDisplay().workAreaSize;
    if (compactMode) {
        mainWindow.setMinimumSize(380, 560);
        mainWindow.setSize(Math.min(420, workArea.width), Math.min(640, workArea.height), true);
        mainWindow.setAlwaysOnTop(database.getSettings().compactAlwaysOnTop, "floating");
        mainWindow.center();
    }
    else {
        mainWindow.setAlwaysOnTop(false);
        mainWindow.setMinimumSize(Math.min(960, workArea.width), Math.min(640, workArea.height));
        mainWindow.setSize(Math.min(1320, Math.max(960, workArea.width - 24)), Math.min(820, Math.max(640, workArea.height - 24)), true);
        mainWindow.center();
    }
    mainWindow.webContents.send("window:compact-mode", compactMode);
    mainWindow.webContents.send("window:aura-only", false);
    summonMainWindow();
    return compactMode;
}
function setAuraOnly(next) {
    if (!mainWindow)
        return auraOnly;
    const workArea = electron_1.screen.getPrimaryDisplay().workAreaSize;
    auraOnly = next;
    compactMode = true;
    if (auraOnly) {
        mainWindow.setMinimumSize(230, 270);
        mainWindow.setSize(Math.min(250, workArea.width), Math.min(290, workArea.height), true);
    }
    else {
        mainWindow.setMinimumSize(380, 560);
        mainWindow.setSize(Math.min(420, workArea.width), Math.min(640, workArea.height), true);
    }
    mainWindow.setAlwaysOnTop(database.getSettings().compactAlwaysOnTop, "floating");
    mainWindow.center();
    mainWindow.webContents.send("window:compact-mode", true);
    mainWindow.webContents.send("window:aura-only", auraOnly);
    summonMainWindow();
    return auraOnly;
}
function registerGlobalShortcut(shortcut) {
    electron_1.globalShortcut.unregisterAll();
    try {
        return electron_1.globalShortcut.register(shortcut, () => {
            setCompactMode(!compactMode);
        });
    }
    catch {
        return false;
    }
}
function createTray() {
    const iconPath = node_path_1.default.join(electron_1.app.getAppPath(), "assets", "fifones-icon.png");
    const image = electron_1.nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
    tray = new electron_1.Tray(image);
    tray.setToolTip("Fifones");
    const refreshMenu = () => {
        tray?.setContextMenu(electron_1.Menu.buildFromTemplate([
            {
                label: "Abrir Hoje",
                click: () => {
                    summonMainWindow();
                    mainWindow?.webContents.send("app:navigate", "today");
                }
            },
            {
                label: compactMode ? "Sair do modo compacto" : "Abrir modo compacto",
                click: () => {
                    setCompactMode(!compactMode);
                    refreshMenu();
                }
            },
            { type: "separator" },
            { label: "Encerrar", click: () => electron_1.app.quit() }
        ]));
    };
    tray.on("click", summonMainWindow);
    refreshMenu();
}
async function checkDueReminders() {
    const settings = database.getSettings();
    if (!settings.proactiveEnabled || isWithinQuietHours(settings))
        return;
    for (const reminder of database.dueReminders()) {
        if (reminder.followupCount >= settings.maxFollowups) {
            await database.cancelReminder(reminder.id);
            continue;
        }
        const task = database.getTask(reminder.taskId);
        if (!task || task.status !== "pending") {
            await database.cancelReminder(reminder.id);
            continue;
        }
        showNotification("Fifones te lembra", task.title, "today");
        await database.markReminderShown(reminder.id);
    }
}
async function checkProactivePulse() {
    const settings = database.getSettings();
    if (!settings.proactiveEnabled || isWithinQuietHours(settings))
        return;
    if (Date.now() - googleProactiveEventsAt > 5 * 60_000 && await readGoogleToken()) {
        try {
            googleProactiveEvents = await listGoogleCalendarEvents();
            googleProactiveEventsAt = Date.now();
        }
        catch {
            googleProactiveEvents = [];
        }
    }
    const events = [...database.listCalendarEvents(), ...googleProactiveEvents.map((event) => ({
            id: `google:${event.id}`,
            title: event.title,
            start: event.start,
            end: event.end,
            color: "blue",
            createdAt: event.start,
            updatedAt: event.start
        }))];
    const signal = (0, proactive_js_1.findProactiveSignal)(database.listTasks(), events);
    if (!signal)
        return;
    if (!(await database.recordProactiveSignal(signal)))
        return;
    showNotification(signal.title, signal.body, signal.view);
}
function registerIpc() {
    handle("app:bootstrap", bootstrap);
    handle("security:lock", async () => database.close());
    handle("security:unlock", bootstrap);
    handle("api-key:set", async (key) => {
        await writeApiKey(key);
        await database.updateSettings({ demoMode: false });
        return { ok: true };
    });
    handle("api-key:clear", async () => {
        await node_fs_1.promises.rm(apiKeyPath, { force: true });
        await database.updateSettings({ demoMode: true });
        return { ok: true };
    });
    handle("fifones-api-token:set", async (token) => {
        await writeFifonesApiToken(token);
        await database.updateSettings({ demoMode: false });
        return { ok: true };
    });
    handle("fifones-api-token:clear", async () => {
        await node_fs_1.promises.rm(fifonesApiTokenPath, { force: true });
        fifonesApiToken = undefined;
        return { ok: true };
    });
    handle("fifones-api:test", async () => {
        const baseUrl = ownApiBaseUrl();
        const token = aiCredential(await readApiKey());
        if (!baseUrl || !token)
            return { ok: false, message: "Informe a URL e o token do Fifones API." };
        const response = await fetch(new URL("/health", baseUrl), { headers: { Authorization: `Bearer ${token}` } });
        return response.ok ? { ok: true, message: "ConexÃ£o com o Fifones API confirmada." } : { ok: false, message: `API respondeu ${response.status}.` };
    });
    handle("proactive:decision", (fingerprint, decision) => database.decideProactiveSignal(fingerprint, decision));
    handle("settings:update", async (patch) => {
        const previous = database.getSettings();
        const settings = await database.updateSettings(patch);
        if (patch.globalShortcut &&
            !registerGlobalShortcut(settings.globalShortcut)) {
            await database.updateSettings({ globalShortcut: previous.globalShortcut });
            registerGlobalShortcut(previous.globalShortcut);
            throw new Error("Esse atalho nÃ£o pÃ´de ser registrado. Tente outra combinaÃ§Ã£o.");
        }
        if (patch.launchAtLogin !== undefined) {
            electron_1.app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
        }
        if (patch.compactAlwaysOnTop !== undefined && compactMode) {
            mainWindow?.setAlwaysOnTop(settings.compactAlwaysOnTop, "floating");
        }
        return settings;
    });
    handle("memories:list", () => database.listMemories());
    handle("memories:save", (input) => database.saveMemory(input));
    handle("memories:review", (id, status) => database.reviewMemory(id, status));
    handle("memories:delete", async (id) => {
        await database.deleteMemory(id);
        return { ok: true };
    });
    handle("contracts:create", (input) => {
        const purpose = (0, purpose_js_1.validateContractPurpose)(input);
        if (!purpose.aligned) {
            throw new Error(purpose.reason ?? "O contrato precisa estar ligado ao seu desenvolvimento pessoal.");
        }
        return database.createContract(input);
    });
    handle("contracts:stop", (id) => database.stopContract(id));
    handle("contracts:delete", async (id) => {
        await database.deleteContract(id);
        return { ok: true };
    });
    handle("chat:save-realtime-message", (message) => database.saveMessage(message));
    handle("tasks:list", () => database.listTasks());
    handle("tasks:save", (input) => database.saveTask(input));
    handle("tasks:status", (id, status) => database.updateTaskStatus(id, status));
    handle("tasks:delete", async (id) => {
        await database.deleteTask(id);
        return { ok: true };
    });
    handle("calendar:list", () => database.listCalendarEvents());
    handle("calendar:save", (input) => database.saveCalendarEvent(input));
    handle("calendar:delete", async (id) => {
        await database.deleteCalendarEvent(id);
        return { ok: true };
    });
    handle("tasks:propose-from-text", (text, sourceMessageId) => database.proposeTaskFromText(text, sourceMessageId));
    handle("proposals:resolve", (id, decision) => database.resolveProposal(id, decision));
    handle("actions:list-pending", () => database.listPendingApprovals());
    handle("actions:resolve", (id, decision) => database.resolveActionApproval(id, decision));
    handle("audit:list", (limit) => database.listAuditEvents(limit));
    handle("reminders:snooze", (id, minutes) => database.snoozeReminder(id, minutes));
    handle("reminders:cancel", (id) => database.cancelReminder(id));
    handle("people:list", () => database.listPeople());
    handle("people:save", (input) => database.savePerson(input));
    handle("people:delete", async (id) => {
        await database.deletePerson(id);
        return { ok: true };
    });
    handle("calendar:google-connect", connectGoogleCalendar);
    handle("calendar:google-list", listGoogleCalendarEvents);
    handle("calendar:google-disconnect", async () => {
        await node_fs_1.promises.rm(googleTokenPath, { force: true });
        return { ok: true };
    });
    handle("usage:record-realtime", (usage) => {
        const model = database.getSettings().realtimeModel;
        return database.recordUsage("realtime", model, (0, usage_js_1.estimateRealtimeCostBrl)(usage, model));
    });
    handle("usage:override", (enabled) => {
        budgetOverride = enabled;
        const budget = database.getUsageBudget();
        return { ...budget, blocked: budget.blocked && !budgetOverride };
    });
    handle("window:toggle-compact", () => ({ compact: setCompactMode(!compactMode) }));
    handle("window:toggle-aura-only", () => ({ auraOnly: setAuraOnly(!auraOnly) }));
    handle("chat:send", async (request) => {
        const budget = database.getUsageBudget();
        if (budget.blocked && !budgetOverride) {
            throw new Error("Seu limite mensal estimado chegou a R$30. Libere uma exceÃ§Ã£o em Privacidade para continuar usando a API.");
        }
        const userMessage = {
            id: (0, node_crypto_1.randomUUID)(),
            role: "user",
            content: request.text,
            createdAt: new Date().toISOString(),
            mode: request.mode
        };
        await database.saveMessage(userMessage);
        let activeContract = database.activeContract();
        if (activeContract && (0, safety_js_1.isStopPhrase)(request.text)) {
            await database.stopContract(activeContract.id);
            activeContract = undefined;
            const stoppedMessage = {
                id: (0, node_crypto_1.randomUUID)(),
                role: "assistant",
                content: [
                    "### O que parece estar acontecendo",
                    "VocÃª pediu para parar.",
                    "",
                    "### O melhor contraponto",
                    "Nenhum. Consentimento retirado nÃ£o Ã© assunto para negociaÃ§Ã£o.",
                    "",
                    "### EvidÃªncias e incertezas",
                    "O contrato ativo foi encerrado localmente e a persuasÃ£o foi bloqueada.",
                    "",
                    "### A decisÃ£o continua sua",
                    "Podemos continuar apenas em reflexÃ£o, simulaÃ§Ã£o ou contraditÃ³rio."
                ].join("\n"),
                createdAt: new Date().toISOString(),
                mode: "reflection"
            };
            await database.saveMessage(stoppedMessage);
            return { message: stoppedMessage, usedMemoryIds: [], demo: true };
        }
        const purpose = (0, purpose_js_1.assessPurposeRequest)(request.text);
        if (!purpose.aligned) {
            const boundaryMessage = {
                id: (0, node_crypto_1.randomUUID)(),
                role: "assistant",
                content: (0, purpose_js_1.purposeBoundaryResponse)(),
                createdAt: new Date().toISOString(),
                mode: "reflection"
            };
            await database.saveMessage(boundaryMessage);
            return { message: boundaryMessage, usedMemoryIds: [], demo: true };
        }
        activeContract = await activePurposeContract();
        const safety = (0, safety_js_1.decideMode)(request.text, request.mode, activeContract);
        const ranked = (0, retrieval_js_1.retrieveMemories)(request.text, database.listMemories());
        const memories = ranked.map((item) => item.memory);
        const settings = database.getSettings();
        const route = (0, ai_routing_js_1.chooseAiRoute)({
            workload: "conversation",
            budgetRemainingBrl: Math.max(0, budget.limitBrl - budget.estimatedBrl),
            demoMode: settings.demoMode,
            allowCloud: true,
            ownApiBaseUrl: ownApiConfigured() ? ownApiBaseUrl() : undefined,
            preferredTextModel: settings.reasoningModel,
            preferredRealtimeModel: settings.realtimeModel
        });
        const storedOpenAiKey = await readApiKey();
        const apiKey = aiCredential(storedOpenAiKey);
        let message;
        let demo = settings.demoMode || !apiKey;
        if (demo) {
            message = {
                id: (0, node_crypto_1.randomUUID)(),
                role: "assistant",
                content: (0, demo_js_1.demoAdvisorResponse)({
                    text: request.text,
                    mode: safety.effectiveMode,
                    memories,
                    contract: activeContract,
                    highRisk: safety.highRisk,
                    contractRequired: safety.contractRequired
                }),
                createdAt: new Date().toISOString(),
                mode: safety.effectiveMode,
                highRisk: safety.highRisk,
                citations: memories.map((memory) => ({
                    id: memory.id,
                    title: memory.title,
                    source: memory.source,
                    confidence: memory.confidence
                }))
            };
        }
        else {
            if (!apiKey) {
                throw new Error("Configure uma chave da OpenAI ou ative o modo demonstraÃ§Ã£o.");
            }
            const encryptionKey = await keyStore.getKey();
            const responseArgs = {
                apiKey,
                text: request.text,
                mode: safety.effectiveMode,
                memories,
                contract: activeContract,
                highRisk: safety.highRisk,
                settings,
                safetyIdentifier: (0, openai_js_1.deriveSafetyIdentifier)(encryptionKey),
                recentMessages: database.listMessages(10).slice(0, -1),
                apiBaseUrl: route.baseUrl,
                model: route.model,
                voiceReply: request.voiceReply,
                language: request.language
            };
            let result;
            try {
                result = await (0, openai_js_1.createReasonedResponse)(responseArgs);
            }
            catch (error) {
                if (!ownApiConfigured() || !storedOpenAiKey)
                    throw error;
                result = await (0, openai_js_1.createReasonedResponse)({
                    ...responseArgs,
                    apiKey: storedOpenAiKey,
                    apiBaseUrl: undefined
                });
            }
            message = result.message;
            await database.recordUsage("reasoning", route.model, result.estimatedCostBrl);
            demo = false;
        }
        await database.saveMessage(message);
        return {
            message,
            usedMemoryIds: memories.map((memory) => memory.id),
            demo
        };
    });
    handle("audio:transcribe", async (audio, mimeType) => {
        const storedOpenAiKey = await readApiKey();
        const apiKey = aiCredential(storedOpenAiKey);
        if (!apiKey)
            throw new Error("Configure sua chave da OpenAI para transcrever voz.");
        const encryptionKey = await keyStore.getKey();
        const transcriptionArgs = {
            apiKey,
            audio,
            mimeType,
            safetyIdentifier: (0, openai_js_1.deriveSafetyIdentifier)(encryptionKey),
            apiBaseUrl: ownApiBaseUrl(),
            language: database.getSettings().voiceLanguage
        };
        let text;
        try {
            text = await (0, openai_js_1.transcribeAudio)(transcriptionArgs);
        }
        catch (error) {
            if (!ownApiConfigured() || !storedOpenAiKey)
                throw error;
            text = await (0, openai_js_1.transcribeAudio)({
                ...transcriptionArgs,
                apiKey: storedOpenAiKey,
                apiBaseUrl: undefined
            });
        }
        return { text };
    });
    handle("audio:local-tts-status", async () => {
        const python = await resolveKokoroPython();
        if (!python) {
            return {
                available: false,
                message: "Kokoro ainda nÃƒÂ£o estÃƒÂ¡ instalado neste computador."
            };
        }
        try {
            await node_fs_1.promises.access(kokoroScriptPath());
            return { available: true, message: "Kokoro local estÃƒÂ¡ pronto para ser testado." };
        }
        catch {
            return { available: false, message: "O arquivo local do Kokoro nÃƒÂ£o foi encontrado." };
        }
    });
    handle("audio:local-tts", async (text, voice) => {
        const cleanText = text.trim().slice(0, 2_000);
        if (!cleanText)
            throw new Error("NÃƒÂ£o hÃƒÂ¡ texto para transformar em ÃƒÂ¡udio.");
        const python = await resolveKokoroPython();
        if (!python)
            throw new Error("Kokoro nÃƒÂ£o estÃƒÂ¡ instalado. Selecione a voz do Windows enquanto isso.");
        const audio = await runKokoro(python, cleanText, voice);
        return { audioBase64: audio.toString("base64") };
    });
    handle("realtime:connect", async (request) => {
        const budget = database.getUsageBudget();
        if (budget.blocked && !budgetOverride) {
            throw new Error("O limite mensal estimado foi atingido. Libere uma exceÃ§Ã£o em Privacidade para abrir nova conversa.");
        }
        const storedOpenAiKey = await readApiKey();
        const apiKey = aiCredential(storedOpenAiKey);
        if (!apiKey)
            throw new Error("Configure sua chave da OpenAI para usar voz ao vivo.");
        const settings = database.getSettings();
        if (settings.demoMode) {
            throw new Error("Desative o modo demonstraÃ§Ã£o para iniciar uma sessÃ£o de voz.");
        }
        const contract = await activePurposeContract();
        const safety = (0, safety_js_1.decideMode)("", request.mode, contract);
        const coreMemories = database
            .listMemories()
            .filter((memory) => memory.status === "confirmed" &&
            memory.sensitivity !== "restricted" &&
            ["fact", "experience", "value", "goal", "decision_pattern", "preference"].includes(memory.category))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 12);
        const interviewModule = request.experience === "interview"
            ? interviews_js_1.INTERVIEW_MODULES.find((item) => item.id === request.interviewModuleId)
            : undefined;
        if (request.experience === "interview" && !interviewModule) {
            throw new Error("MÃ³dulo de entrevista nÃ£o encontrado.");
        }
        const encryptionKey = await keyStore.getKey();
        const realtimeArgs = {
            apiKey,
            sdp: request.sdp,
            mode: safety.effectiveMode,
            memories: coreMemories,
            contract,
            highRisk: false,
            settings,
            safetyIdentifier: (0, openai_js_1.deriveSafetyIdentifier)(encryptionKey),
            recentMessages: database.listMessages(10),
            apiBaseUrl: ownApiBaseUrl(),
            instructions: interviewModule
                ? (0, interviews_js_1.buildVoiceInterviewPrompt)({
                    module: interviewModule,
                    memories: coreMemories
                })
                : undefined
        };
        let sdp;
        try {
            sdp = await (0, openai_js_1.createRealtimeCall)(realtimeArgs);
        }
        catch (error) {
            if (!ownApiConfigured() || !storedOpenAiKey)
                throw error;
            sdp = await (0, openai_js_1.createRealtimeCall)({
                ...realtimeArgs,
                apiKey: storedOpenAiKey,
                apiBaseUrl: undefined
            });
        }
        return { sdp };
    });
    handle("data:export", async () => {
        const result = await electron_1.dialog.showSaveDialog({
            title: "Exportar meus dados do Fifones",
            defaultPath: `eco-export-${new Date().toISOString().slice(0, 10)}.json`,
            filters: [{ name: "JSON", extensions: ["json"] }]
        });
        if (result.canceled || !result.filePath)
            return { canceled: true };
        await node_fs_1.promises.writeFile(result.filePath, JSON.stringify(database.exportBundle(), null, 2), "utf8");
        return { canceled: false, path: result.filePath };
    });
    handle("data:delete-all", async () => {
        await database.deleteAllData();
        await node_fs_1.promises.rm(googleTokenPath, { force: true });
        return { ok: true };
    });
    handle("window:summon", summonMainWindow);
    handle("vision:take-screenshot", async () => {
        return await (0, vision_js_1.captureScreen)();
    });
}
async function createWindow() {
    const preloadPath = node_path_1.default.join(__dirname, "preload.js");
    const iconPath = node_path_1.default.join(electron_1.app.getAppPath(), "assets", "fifones-icon.png");
    const workArea = electron_1.screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = Math.min(1320, Math.max(960, workArea.width - 24));
    const windowHeight = Math.min(820, Math.max(640, workArea.height - 24));
    mainWindow = new electron_1.BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        minWidth: Math.min(960, windowWidth),
        minHeight: Math.min(640, windowHeight),
        center: true,
        icon: iconPath,
        backgroundColor: "#11110f",
        titleBarStyle: "hidden",
        titleBarOverlay: {
            color: "#11110f",
            symbolColor: "#d4d0c8",
            height: 40
        },
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            backgroundThrottling: false
        }
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https://"))
            void electron_1.shell.openExternal(url);
        return { action: "deny" };
    });
    mainWindow.on("close", (event) => {
        if (isQuitting)
            return;
        event.preventDefault();
        mainWindow?.hide();
    });
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
        await mainWindow.loadURL(devServerUrl);
    }
    else {
        await mainWindow.loadFile(node_path_1.default.join(electron_1.app.getAppPath(), "dist", "index.html"));
    }
}
electron_1.app.whenReady().then(async () => {
    electron_1.app.setAppUserModelId("com.fifones.conselheiro");
    const userDataPath = electron_1.app.getPath("userData");
    keyStore = new security_js_1.SecureKeyStore(userDataPath);
    apiKeyPath = node_path_1.default.join(userDataPath, "openai.key");
    fifonesApiTokenPath = node_path_1.default.join(userDataPath, "fifones-api.key");
    fifonesApiToken = await readFifonesApiToken();
    googleTokenPath = node_path_1.default.join(userDataPath, "google-calendar.key");
    database = new database_js_1.EncryptedDatabase(userDataPath, keyStore, (0, database_js_1.resolveSqlWasmPath)(electron_1.app.getAppPath(), process.resourcesPath, electron_1.app.isPackaged));
    await database.open();
    registerIpc();
    await createWindow();
    createTray();
    if (!registerGlobalShortcut(database.getSettings().globalShortcut)) {
        await database.updateSettings({ globalShortcut: "CommandOrControl+Shift+F" });
        registerGlobalShortcut("CommandOrControl+Shift+F");
    }
    electron_1.app.setLoginItemSettings({ openAtLogin: database.getSettings().launchAtLogin });
    reminderTimer = setInterval(() => {
        void checkDueReminders();
        checkProactivePulse();
    }, 30_000);
    void checkDueReminders();
    checkProactivePulse();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            void createWindow();
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
electron_1.app.on("before-quit", () => {
    isQuitting = true;
    if (reminderTimer)
        clearInterval(reminderTimer);
    electron_1.globalShortcut.unregisterAll();
    void database?.close();
});
