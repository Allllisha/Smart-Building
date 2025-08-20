import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import 'express-async-errors'

import projectRoutes from './routes/project.routes'
import estimationRoutes from './routes/estimation.routes'
import bimRoutes from './routes/bim.routes'
import webSearchRoutes from './routes/websearch.routes'
import aiRoutes from './routes/ai.routes'
import cityPlanningRoutes from './routes/cityplanning.routes'
import { errorHandler } from './middleware/error.middleware'

// 環境変数の読み込み
dotenv.config({ path: '../.env' })

const app = express()
const PORT = process.env.WEBSITES_PORT || process.env.PORT || process.env.API_PORT || 8000

// ミドルウェア
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ヘルスチェック
app.get('/', (_, res) => {
  res.json({ status: 'ok', service: 'Smart Building Planner API', timestamp: new Date().toISOString() })
})

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// APIルート
app.use('/api/projects', projectRoutes)
app.use('/api/estimation', estimationRoutes)
app.use('/api', bimRoutes)
app.use('/api/websearch', webSearchRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/cityplanning', cityPlanningRoutes)

// エラーハンドリング
app.use(errorHandler)

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})