import { Router } from 'express'
import { EstimationController } from '../controllers/estimation.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

// 認証を一時的にスキップ（デバッグ用）
// router.use(authenticate)

// 見積もり計算
router.post('/projects/:projectId/estimation', EstimationController.calculate)
router.post('/:projectId/calculate', EstimationController.calculate)

// 見積もり取得
router.get('/projects/:projectId/estimation', EstimationController.get)
router.get('/:projectId', EstimationController.get)

export default router