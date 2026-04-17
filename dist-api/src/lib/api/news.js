"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentNews = getRecentNews;
exports.getSavedNews = getSavedNews;
exports.createSavedNews = createSavedNews;
exports.updateSavedNews = updateSavedNews;
exports.publishNews = publishNews;
exports.testNewsApi = testNewsApi;
const api_1 = require("@/lib/api");
function getRecentNews(userId) {
    return (0, api_1.apiRequest)(`/api/news/recent?userId=${encodeURIComponent(userId)}`);
}
function getSavedNews(userId) {
    return (0, api_1.apiRequest)(`/api/news/saved?userId=${encodeURIComponent(userId)}`);
}
function createSavedNews(payload) {
    return (0, api_1.apiRequest)('/api/news/saved', (0, api_1.withJsonBody)(payload, { method: 'POST' }));
}
function updateSavedNews(id, payload) {
    return (0, api_1.apiRequest)(`/api/news/saved/${id}`, (0, api_1.withJsonBody)(payload, { method: 'PUT' }));
}
function publishNews(id, platforms) {
    return (0, api_1.apiRequest)(`/api/news/publish/${id}`, (0, api_1.withJsonBody)({ platforms }, { method: 'POST' }));
}
function testNewsApi(payload) {
    return (0, api_1.apiRequest)('/api/news/test-api', (0, api_1.withJsonBody)(payload, { method: 'POST' }));
}
