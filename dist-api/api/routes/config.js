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
router.get('/active-model', (req, res) => configController.getActiveAIModel(req, res));
router.get('/workspace/asset', (req, res) => configController.getWorkspaceAsset(req, res));
router.post('/workspace/upload', (req, res) => configController.uploadWorkspaceAsset(req, res));
router.post('/workspace/import-folder', (req, res) => configController.importWorkspaceFolder(req, res));
router.post('/workspace/open-folder', (req, res) => configController.openWorkspaceFolder(req, res));
// 保存配置
router.post('/', (req, res) => configController.saveConfig(req, res));
router.put('/', (req, res) => configController.saveConfig(req, res));
// 测试 AI 模型连通性
router.post('/test-ai', (req, res) => configController.testAIModel(req, res));
// 切换 AI 模型
router.post('/switch-model', (req, res) => configController.switchAIModel(req, res));
// 删除 AI 模型
router.post('/delete-model', (req, res) => configController.deleteAIModel(req, res));
//# sourceMappingURL=config.js.map