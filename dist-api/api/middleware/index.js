"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validators = exports.authMiddleware = exports.securityMiddleware = void 0;
// 中间件系统主入口
__exportStar(require("./security"), exports);
__exportStar(require("./auth"), exports);
__exportStar(require("./validators"), exports);
// 重新导出常用中间件
const security_1 = __importDefault(require("./security"));
exports.securityMiddleware = security_1.default;
const auth_1 = __importDefault(require("./auth"));
exports.authMiddleware = auth_1.default;
const validators_1 = __importDefault(require("./validators"));
exports.validators = validators_1.default;
// 默认导出安全中间件集合
exports.default = {
    security: security_1.default,
    auth: auth_1.default,
    validators: validators_1.default,
};
//# sourceMappingURL=index.js.map