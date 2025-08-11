import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'smart_building_planner',
  user: process.env.DB_USER || 'smart_building_user',
  password: process.env.DB_PASSWORD || 'smart_building_pass',
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '20000'), // 20秒に延長
  ssl: process.env.NODE_ENV === 'production' 
    ? { 
        rejectUnauthorized: false
      } 
    : false,
})

// デバッグ用に接続情報をログ出力（パスワードは隠す）
console.log('Database connection config:', {
  host: pool.options.host,
  port: pool.options.port,
  database: pool.options.database,
  user: pool.options.user,
  ssl: pool.options.ssl,
  connectionTimeoutMillis: pool.options.connectionTimeoutMillis,
})

export const query = async (text: string, params?: any[]) => {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  console.log('Executed query', { text, duration, rows: res.rowCount })
  return res
}

export const getClient = () => {
  return pool.connect()
}

export default pool