import express from 'express'
import { WorkflowController } from '../controllers/WorkflowController'

const router = express.Router()
const workflowController = new WorkflowController()

router.get('/', (req, res) => workflowController.list(req, res))
router.post('/', (req, res) => workflowController.create(req, res))
router.get('/executions', (req, res) => workflowController.listExecutions(req, res))
router.get('/executions/:executionId/artifacts/:artifactId/download', (req, res) =>
  workflowController.downloadArtifact(req, res)
)
router.post('/parse-command', (req, res) => workflowController.parseCommand(req, res))
router.get('/:id', (req, res) => workflowController.get(req, res))
router.put('/:id', (req, res) => workflowController.update(req, res))
router.delete('/:id', (req, res) => workflowController.delete(req, res))
router.post('/:id/execute', (req, res) => workflowController.execute(req, res))

export { router as workflowRoutes }
