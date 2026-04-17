"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.register = register;
const api_1 = require("@/lib/api");
function login(payload) {
    return (0, api_1.apiRequest)('/api/user/login', (0, api_1.withJsonBody)(payload, { method: 'POST' }));
}
function register(payload) {
    return (0, api_1.apiRequest)('/api/user/register', (0, api_1.withJsonBody)(payload, { method: 'POST' }));
}
