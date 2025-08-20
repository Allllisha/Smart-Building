import { Router } from 'express'
import { ProjectController } from '../controllers/project.controller'

const router = Router()

// プロジェクト一覧取得
router.get('/', ProjectController.getAll)

// プロジェクト詳細取得
router.get('/:id', ProjectController.getById)

// プロジェクト作成
router.post('/', ProjectController.create)

// プロジェクト更新
router.put('/:id', ProjectController.update)

// プロジェクトのプレビュー画像更新
router.put('/:id/preview-image', ProjectController.updatePreviewImage)

// プロジェクト削除
router.delete('/:id', ProjectController.delete)

export default router