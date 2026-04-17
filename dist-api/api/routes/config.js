"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configRoutes = void 0;
const express_1 = __importDefault(require("express"));
const ConfigController_1 = require("../controllers/ConfigController");
const router = express_1.default.Router();
exports.configRoutes = router;
const configController = new ConfigController_1.ConfigController();
// 获取配置
router.get('/', (req, res) => configController.getConfig(req, res));
// 保存配置
router.post('/', (req, res) => configController.saveConfig(req, res));
router.put('/', (req, res) => configController.saveConfig(req, res));
