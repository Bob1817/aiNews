"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = isAuthenticated;
exports.setAuthSession = setAuthSession;
exports.clearAuthSession = clearAuthSession;
exports.subscribeToAuthChange = subscribeToAuthChange;
const AUTH_EVENT = 'auth-change';
function isAuthenticated() {
    return !!localStorage.getItem('user');
}
function setAuthSession(user, profile) {
    localStorage.setItem('user', JSON.stringify(user));
    if (profile !== undefined) {
        localStorage.setItem('userProfile', JSON.stringify(profile));
    }
    window.dispatchEvent(new Event(AUTH_EVENT));
}
function clearAuthSession() {
    localStorage.removeItem('user');
    localStorage.removeItem('userProfile');
    window.dispatchEvent(new Event(AUTH_EVENT));
}
function subscribeToAuthChange(callback) {
    window.addEventListener(AUTH_EVENT, callback);
    window.addEventListener('storage', callback);
    return () => {
        window.removeEventListener(AUTH_EVENT, callback);
        window.removeEventListener('storage', callback);
    };
}
