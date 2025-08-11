import axios from 'axios'
import { ProjectDB } from '../models/project.model'
import { AppError } from '../middleware/error.middleware'

interface Text2BIMRequest {
  projectDescription: string
  buildingType: string
  floors: number
  area: number
  structure: string
  units?: number
}

interface Text2BIMResponse {
  success: boolean
  ifcFileUrl?: string
  modelId?: string
  error?: string
}

export class Text2BIMService {
  private static readonly baseUrl = process.env.TEXT2BIM_SERVICE_URL || 'http://localhost:8001'
  private static readonly apiKey = process.env.TEXT2BIM_API_KEY

  static async generateBIM(project: ProjectDB): Promise<Text2BIMResponse> {
    try {
      // プロジェクト情報からText2BIM用のプロンプトを生成
      const projectDescription = this.generateProjectDescription(project)

      const request: Text2BIMRequest = {
        projectDescription,
        buildingType: project.building_usage,
        floors: project.building_floors,
        area: project.building_area || 100,
        structure: project.building_structure,
        units: project.building_units || undefined,
      }

      // Text2BIM APIを呼び出し
      const response = await axios.post(
        `${this.baseUrl}/api/generate-bim`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'X-API-Key': this.apiKey }),
          },
          timeout: 300000, // 5分のタイムアウト
        }
      )

      return response.data
    } catch (error) {
      console.error('Text2BIM API error:', error)
      
      // フォールバック: Text2BIMが利用できない場合はダミーレスポンスを返す
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'Text2BIM service is not available. Please ensure the service is running.',
        }
      }

      throw new AppError(500, 'Failed to generate BIM model')
    }
  }

  private static generateProjectDescription(project: ProjectDB): string {
    const parts = []

    // 基本情報
    parts.push(`${project.building_usage}を計画しています。`)
    parts.push(`構造は${project.building_structure}で、${project.building_floors}階建てです。`)
    
    // 面積情報
    parts.push(`建築面積は${project.building_area || 100}㎡、`)
    if (project.building_total_floor_area) {
      parts.push(`延床面積は${project.building_total_floor_area}㎡です。`)
    }

    // 住戸情報（共同住宅の場合）
    if (project.building_usage === '共同住宅' && project.building_units) {
      parts.push(`総戸数は${project.building_units}戸です。`)
    }

    // 敷地情報
    parts.push(`敷地面積は${project.site_area}㎡で、`)
    if (project.site_zoning_type) {
      parts.push(`用途地域は${project.site_zoning_type}です。`)
    }

    // 高さ情報
    parts.push(`最高高さは${project.building_max_height}mm、`)
    parts.push(`基礎高さは100mmです。`)

    // 特記事項
    if (project.special_notes) {
      parts.push(`特記事項: ${project.special_notes}`)
    }

    return parts.join(' ')
  }

  static async callText2BIMPythonAPI(projectId: string, prompt: string): Promise<any> {
    try {
      // Python Text2BIM APIを直接呼び出す場合の実装
      const response = await axios.post(
        `${this.baseUrl}/plan_designer`,
        {
          query: prompt,
          model: 'gpt',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      )

      return response.data
    } catch (error) {
      console.error('Text2BIM Python API error:', error)
      throw new AppError(500, 'Failed to call Text2BIM Python API')
    }
  }
}