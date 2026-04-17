"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = getCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
const api_1 = require("@/lib/api");
function getCategories() {
    return (0, api_1.apiRequest)('/api/categories');
}
function createCategory(payload) {
    return (0, api_1.apiRequest)('/api/categories', (0, api_1.withJsonBody)(payload, { method: 'POST' }));
}
function updateCategory(id, payload) {
    return (0, api_1.apiRequest)(`/api/categories/${id}`, (0, api_1.withJsonBody)(payload, { method: 'PUT' }));
}
function deleteCategory(id) {
    return (0, api_1.apiRequest)(`/api/categories/${id}`, { method: 'DELETE' });
}
