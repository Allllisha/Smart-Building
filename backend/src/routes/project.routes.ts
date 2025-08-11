import { Router } from 'express'
import { ProjectController } from '../controllers/project.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

// 認証ミドルウェアを適用
router.use(authenticate)

// プロジェクト一覧取得
router.get('/', ProjectController.getAll)

// プロジェクト詳細取得
router.get('/:id', ProjectController.getById)

// プロジェクト作成
router.post('/', ProjectController.create)

// プロジェクト更新
router.put('/:id', ProjectController.update)

// プロジェクト削除
router.delete('/:id', ProjectController.delete)

export default router