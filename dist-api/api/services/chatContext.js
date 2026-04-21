"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clampContextBlock = clampContextBlock;
exports.buildBoundedHistorySection = buildBoundedHistorySection;
exports.buildBoundedReferenceSection = buildBoundedReferenceSection;
function normalizeWhitespace(value) {
    return value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}
function clampContextBlock(value, maxChars) {
    const normalized = normalizeWhitespace(value);
    if (normalized.length <= maxChars) {
        return normalized;
    }
    return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}
function buildOlderSummary(history, maxSummaryChars) {
    if (history.length === 0) {
        return '';
    }
    const summaryLines = history.map((item) => {
        const label = item.role === 'user' ? '用户' : '助手';
        return `- ${label}：${clampContextBlock(item.content, 70)}`;
    });
    return clampContextBlock(summaryLines.join('\n'), maxSummaryChars);
}
function buildBoundedHistorySection(history = [], options) {
    if (!history.length) {
        return '';
    }
    const preserveRecentMessages = options?.preserveRecentMessages ?? 8;
    const maxMessageChars = options?.maxMessageChars ?? 360;
    const maxSummaryChars = options?.maxSummaryChars ?? 420;
    const olderMessages = history.slice(0, Math.max(0, history.length - preserveRecentMessages));
    const recentMessages = history.slice(-preserveRecentMessages);
    const sections = [];
    if (olderMessages.length > 0) {
        sections.push(`较早对话摘要：\n${buildOlderSummary(olderMessages, maxSummaryChars)}`);
    }
    const recentSection = recentMessages
        .map((item) => `${item.role === 'user' ? '用户' : '助手'}：${clampContextBlock(item.content, maxMessageChars)}`)
        .join('\n');
    sections.push(`最近对话记录：\n${recentSection}`);
    return `${sections.join('\n\n')}\n\n`;
}
function buildBoundedReferenceSection(news, maxChars) {
    const sections = [
        `引用新闻标题：${news.title}`,
        news.source ? `引用新闻来源：${news.source}` : '',
        news.publishedAt ? `引用新闻发布时间：${news.publishedAt}` : '',
        news.url ? `引用新闻原文：${news.url}` : '',
        `引用新闻内容：${clampContextBlock(news.content, Math.max(80, maxChars - 120))}`,
    ].filter(Boolean);
    return clampContextBlock(sections.join('\n'), maxChars);
}
//# sourceMappingURL=chatContext.js.map