"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.updateConfig = updateConfig;
const api_1 = require("@/lib/api");
function getConfig(userId) {
    return (0, api_1.apiRequest)(`/api/config?userId=${encodeURIComponent(userId)}`);
}
function updateConfig(payload) {
    return (0, api_1.apiRequest)('/api/config', (0, api_1.withJsonBody)(payload, { method: 'PUT' }));
}
