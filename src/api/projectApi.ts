import axios from 'axios'
import { Project } from '@/types/project'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// リクエストインターセプター（認証トークン付加）
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const projectApi = {
  // プロジェクト一覧取得
  async getAll(): Promise<{data: Project[]}> {
    const response = await api.get('/projects')
    return response.data
  },

  // プロジェクト詳細取得
  async getById(id: string): Promise<Project> {
    const response = await api.get(`/projects/${id}`)
    return response.data.data
  },

  // プロジェクト作成
  async create(project: any): Promise<{data: any}> {
    const response = await api.post('/projects', project)
    return response.data
  },

  // プロジェクト更新
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const response = await api.put(`/projects/${id}`, updates)
    return response.data.data
  },

  // プロジェクト削除
  async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`)
  },
}