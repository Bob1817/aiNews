"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chat = chat;
const api_1 = require("@/lib/api");
function chat(payload) {
    return (0, api_1.apiRequest)('/api/ai/chat', (0, api_1.withJsonBody)(payload, { method: 'POST' }));
}
