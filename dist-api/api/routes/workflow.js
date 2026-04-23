"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowRoutes = void 0;
const express_1 = __importDefault(require("express"));
const WorkflowController_1 = require("../controllers/WorkflowController");
const router = express_1.default.Router();
exports.workflowRoutes = router;
const workflowController = new WorkflowController_1.WorkflowController();
router.get('/', (req, res) => workflowController.list(req, res));
router.post('/', (req, res) => workflowController.create(req, res));
router.get('/executions', (req, res) => workflowController.listExecutions(req, res));
router.get('/executions/:executionId/artifacts/:artifactId/download', (req, res) => workflowController.downloadArtifact(req, res));
router.post('/parse-command', (req, res) => workflowController.parseCommand(req, res));
router.get('/:id', (req, res) => workflowController.get(req, res));
router.put('/:id', (req, res) => workflowController.update(req, res));
router.delete('/:id', (req, res) => workflowController.delete(req, res));
router.post('/:id/execute', (req, res) => workflowController.execute(req, res));
//# sourceMappingURL=workflow.js.map