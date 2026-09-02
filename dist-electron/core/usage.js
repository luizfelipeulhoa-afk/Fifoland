"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateRealtimeCostBrl = estimateRealtimeCostBrl;
exports.estimateReasoningCostBrl = estimateReasoningCostBrl;
const USD_TO_BRL_ESTIMATE = 5.5;
function estimateRealtimeCostBrl(usage, model) {
    const mini = model.includes("mini");
    const textInput = mini ? 0.6 : 4;
    const textOutput = mini ? 2.4 : 24;
    const audioInput = mini ? 10 : 32;
    const audioOutput = mini ? 20 : 64;
    const usd = ((usage.inputTextTokens ?? 0) * textInput +
        (usage.outputTextTokens ?? 0) * textOutput +
        (usage.inputAudioTokens ?? 0) * audioInput +
        (usage.outputAudioTokens ?? 0) * audioOutput) /
        1_000_000;
    return usd * USD_TO_BRL_ESTIMATE;
}
function estimateReasoningCostBrl(inputTokens, outputTokens, model, cachedInputTokens = 0) {
    const rates = model.includes("gpt-5-mini")
        ? { input: 0.25, output: 2 }
        : model.includes("luna")
            ? { input: 1, output: 6 }
            : model.includes("terra")
                ? { input: 2.5, output: 15 }
                : { input: 5, output: 30 };
    const input = Math.max(0, inputTokens);
    const cached = Math.min(input, Math.max(0, cachedInputTokens));
    const cachedRate = rates.input / 10;
    const longContext = input > 272_000;
    return (((((input - cached) * rates.input + cached * cachedRate) * (longContext ? 2 : 1) +
        Math.max(0, outputTokens) * rates.output * (longContext ? 1.5 : 1)) /
        1_000_000) *
        USD_TO_BRL_ESTIMATE);
}
