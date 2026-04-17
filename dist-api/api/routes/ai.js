"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRoutes = void 0;
const express_1 = __importDefault(require("express"));
const AIController_1 = require("../controllers/AIController");
const router = express_1.default.Router();
exports.aiRoutes = router;
const aiController = new AIController_1.AIController();
// AI 对话
router.post('/chat', (req, res) => aiController.chat(req, res));
// AI 新闻创作
router.post('/compose', (req, res) => aiController.compose(req, res));
