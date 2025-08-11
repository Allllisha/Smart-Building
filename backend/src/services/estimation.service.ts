import { getOpenAIClient, AZURE_OPENAI_DEPLOYMENT } from '../config/azure'
import { ProjectDB } from '../models/project.model'
import { query } from '../config/database'

interface EstimationData {
  totalCost: number
  breakdown: {
    foundation: number
    structure: number
    exterior: number
    interior: number
    electrical: number
    plumbing: number
    hvac: number
    other: number
    temporary: number
    design: number
  }
  schedule: {
    startDate: Date | null
    completionDate: Date | null
    duration: number | null // 月数
  }
  aiAnalysis: string
}

export class EstimationService {
  static async calculateEstimation(project: ProjectDB): Promise<EstimationData> {
    const totalFloorArea = project.building_total_floor_area || 
                          (project.building_area || 100) * project.building_floors

    // 基本単価（円/㎡）
    const unitPrices = {
      foundation: 50000,
      structure: 150000,
      exterior: 80000,
      interior: 100000,
      electrical: 40000,
      plumbing: 35000,
      hvac: 45000,
      other: 30000,
      temporary: 20000,
    }

    // 構造による補正係数
    const structureCoefficient = {
      '鉄骨鉄筋コンクリート造': 1.3,
      '鉄筋コンクリート造': 1.2,
      '壁式鉄筋コンクリート造': 1.15,
      '木造': 0.8,
      'その他': 1.0,
    }[project.building_structure] || 1.0

    // コスト内訳計算
    const breakdown = {
      foundation: Math.round((project.building_area || 100) * unitPrices.foundation * structureCoefficient),
      structure: Math.round(totalFloorArea * unitPrices.structure * structureCoefficient),
      exterior: Math.round(totalFloorArea * unitPrices.exterior),
      interior: Math.round(totalFloorArea * unitPrices.interior),
      electrical: Math.round(totalFloorArea * unitPrices.electrical),
      plumbing: Math.round(totalFloorArea * unitPrices.plumbing),
      hvac: Math.round(totalFloorArea * unitPrices.hvac),
      other: Math.round(totalFloorArea * unitPrices.other),
      temporary: Math.round(totalFloorArea * unitPrices.temporary),
      design: Math.round(totalFloorArea * 50000),
    }

    const totalCost = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0)

    // スケジュール情報を追加
    const schedule = {
      startDate: project.construction_start_date,
      completionDate: project.construction_completion_date,
      duration: this.calculateDuration(project.construction_start_date, project.construction_completion_date)
    }

    // AI分析を生成（スケジュール情報も含める）
    const aiAnalysis = await this.generateAIAnalysis(project, breakdown, totalCost, schedule)

    return {
      totalCost,
      breakdown,
      schedule,
      aiAnalysis,
    }
  }

  static calculateDuration(startDate: Date | null, completionDate: Date | null): number | null {
    if (!startDate || !completionDate) return null
    
    const start = new Date(startDate)
    const completion = new Date(completionDate)
    const diffTime = completion.getTime() - start.getTime()
    const diffMonths = Math.round(diffTime / (1000 * 60 * 60 * 24 * 30))
    
    return diffMonths > 0 ? diffMonths : null
  }

  static async generateAIAnalysis(
    project: ProjectDB,
    breakdown: any,
    totalCost: number,
    schedule: { startDate: Date | null, completionDate: Date | null, duration: number | null }
  ): Promise<string> {
    try {
      const client = getOpenAIClient()

      const scheduleInfo = schedule.startDate && schedule.completionDate 
        ? `
スケジュール情報：
- 着工予定日: ${schedule.startDate.toLocaleDateString('ja-JP')}
- 竣工予定日: ${schedule.completionDate.toLocaleDateString('ja-JP')}
- 工期: ${schedule.duration}ヶ月`
        : `
スケジュール情報：
- 着工予定日: 未設定
- 竣工予定日: 未設定
- 工期: 未設定`

      const prompt = `
以下の建築プロジェクトの見積もり分析レポートを作成してください：

プロジェクト情報：
- 建物用途: ${project.building_usage}
- 構造: ${project.building_structure}
- 階数: ${project.building_floors}階
- 延床面積: ${project.building_total_floor_area || (project.building_area || 100) * project.building_floors}㎡
- 最高高さ: ${project.building_max_height}mm
- 敷地面積: ${project.site_area}㎡
- 用途地域: ${project.site_zoning_type || '未指定'}
${scheduleInfo}

見積もり情報：
- 総工事費: ${(totalCost / 10000).toLocaleString()}万円
- 躯体工事費の割合: ${((breakdown.structure / totalCost) * 100).toFixed(1)}%

以下の観点から分析してください：
1. コスト構成の特徴
2. 構造と費用の関係
3. 工期とスケジュールの妥当性
4. 費用最適化の提案

具体的な数値を含めて、建築主に分かりやすく説明してください。スケジュール情報が設定されている場合は、工期の妥当性についてもコメントしてください。
`

      const response = await client.chat.completions.create({
        model: AZURE_OPENAI_DEPLOYMENT,
        messages: [
          {
            role: 'system',
            content: 'あなたは建築コスト分析の専門家です。技術的に正確で、かつ建築主にも理解しやすい説明を提供してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })

      return response.choices[0]?.message?.content || this.getDefaultAnalysis(project, breakdown, totalCost, schedule)
    } catch (error) {
      console.error('AI analysis generation error:', error)
      return this.getDefaultAnalysis(project, breakdown, totalCost, schedule)
    }
  }

  static getDefaultAnalysis(project: ProjectDB, breakdown: any, totalCost: number, schedule: { startDate: Date | null, completionDate: Date | null, duration: number | null }): string {
    const scheduleAnalysis = schedule.startDate && schedule.completionDate
      ? `
3. スケジュール分析
- 着工予定: ${schedule.startDate.toLocaleDateString('ja-JP')}
- 竣工予定: ${schedule.completionDate.toLocaleDateString('ja-JP')}
- 工期: ${schedule.duration}ヶ月
- ${project.building_floors}階建て、延床面積${project.building_total_floor_area || (project.building_area || 100) * project.building_floors}㎡の${project.building_structure}として、工期は標準的な範囲内です。`
      : `
3. スケジュール分析
- 着工予定日と竣工予定日が未設定です。
- プロジェクトの詳細なスケジュール計画の策定をお勧めします。`

    return `
【AI による見積もり分析レポート】

1. コスト構成の特徴
- 総工事費 ${(totalCost / 10000).toLocaleString()}万円のうち、躯体工事が${((breakdown.structure / totalCost) * 100).toFixed(1)}%を占めています。
- ${project.building_structure}の採用により、標準的な建築と比較して構造費が${project.building_structure === '壁式鉄筋コンクリート造' ? '約20%高く' : '約20%低く'}なっています。

2. 構造と費用の関係
- 選択された構造によるコストへの影響を説明。
- 構造別の標準的なコスト傾向を示します。
${scheduleAnalysis}

4. 費用最適化の提案
- コストパフォーマンスの高い設計・施工方法の提案。
- 費用対効果の高い改善点を提示します。
`
  }

  static async saveEstimation(projectId: string, estimation: EstimationData): Promise<void> {
    await query(`
      INSERT INTO estimations (
        project_id, total_cost,
        cost_foundation, cost_structure, cost_exterior, cost_interior,
        cost_electrical, cost_plumbing, cost_hvac, cost_other,
        cost_temporary, cost_design,
        ai_analysis
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      ON CONFLICT (project_id) DO UPDATE SET
        total_cost = EXCLUDED.total_cost,
        cost_foundation = EXCLUDED.cost_foundation,
        cost_structure = EXCLUDED.cost_structure,
        cost_exterior = EXCLUDED.cost_exterior,
        cost_interior = EXCLUDED.cost_interior,
        cost_electrical = EXCLUDED.cost_electrical,
        cost_plumbing = EXCLUDED.cost_plumbing,
        cost_hvac = EXCLUDED.cost_hvac,
        cost_other = EXCLUDED.cost_other,
        cost_temporary = EXCLUDED.cost_temporary,
        cost_design = EXCLUDED.cost_design,
        ai_analysis = EXCLUDED.ai_analysis,
        updated_at = CURRENT_TIMESTAMP
    `, [
      projectId, estimation.totalCost,
      estimation.breakdown.foundation, estimation.breakdown.structure,
      estimation.breakdown.exterior, estimation.breakdown.interior,
      estimation.breakdown.electrical, estimation.breakdown.plumbing,
      estimation.breakdown.hvac, estimation.breakdown.other,
      estimation.breakdown.temporary, estimation.breakdown.design,
      estimation.aiAnalysis,
    ])
  }
}