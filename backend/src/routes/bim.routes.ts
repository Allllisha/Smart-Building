import { Router } from 'express'
import multer from 'multer'
import { BIMController } from '../controllers/bim.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

// Multer設定 - メモリストレージを使用
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // IFCファイルのみ許可
    if (file.mimetype === 'application/octet-stream' || file.originalname.toLowerCase().endsWith('.ifc')) {
      cb(null, true)
    } else {
      cb(new Error('Only IFC files are allowed'))
    }
  },
})

// すべてのルートに認証を適用
router.use(authenticate)

// BIMモデル生成（Text2BIM）
router.post('/projects/:projectId/bim/generate', BIMController.generate)

// プロジェクトのBIMファイル一覧取得
router.get('/projects/:projectId/bim', BIMController.getByProject)

// IFCファイルアップロード
router.post('/projects/:projectId/bim/upload', upload.single('ifcFile'), BIMController.uploadIFC)

export default router