"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = getUserProfile;
exports.updateUserProfile = updateUserProfile;
const api_1 = require("@/lib/api");
function getUserProfile(userId) {
    return (0, api_1.apiRequest)(`/api/user/profile?userId=${encodeURIComponent(userId)}`);
}
function updateUserProfile(payload) {
    return (0, api_1.apiRequest)('/api/user/profile', (0, api_1.withJsonBody)(payload, { method: 'PUT' }));
}
