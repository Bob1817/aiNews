"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configUtils = exports.env = void 0;
// 配置类型定义
const env_1 = require("./env");
Object.defineProperty(exports, "env", { enumerable: true, get: function () { return env_1.env; } });
const utils_1 = require("./utils");
Object.defineProperty(exports, "configUtils", { enumerable: true, get: function () { return utils_1.configUtils; } });
// 默认导出配置工具
exports.default = utils_1.configUtils;
//# sourceMappingURL=types.js.map