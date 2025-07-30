import { Project, CostBreakdown } from '@/types/project'
import { UnitPrices } from '@/components/UnitPriceEditor'

export interface CalculationData {
  totalFloorArea: number
  structureCoefficient: number
  structureName: string
  structureCostDifference: number
  structureCostPercentage: string
  
  // 環境・エネルギー関連
  sunlightHours: number
  sunlightEfficiencyRatio: number
  currentHeatingCostRatio: number
  currentCoolingCostRatio: number
  annualEnergyCost: number
  heatingCostReduction: number
  
  // 最適化提案関連  
  roofArea: number
  solarPowerSavings: number
  insulationUpgradeCost: number
  annualHvacSavings: number
  
  // 法規制関連
  maxHeightMm: number
  potentialExtraFloors: number
  potentialAreaIncrease: number
  potentialCostIncrease: number
}

/**
 * プロジェクトデータから構造化された計算データを生成
 */
export function generateCalculationData(
  project: Project,
  breakdown: CostBreakdown,
  totalCost: number,
  prices: UnitPrices
): CalculationData {
  const totalFloorArea = project.buildingInfo.totalFloorArea || 
                        project.buildingInfo.buildingArea * project.buildingInfo.floors
  const structureCoefficient = prices.structureCoefficients[
    project.buildingInfo.structure as keyof typeof prices.structureCoefficients
  ] || 1.0
  
  // 構造による影響計算
  const standardStructureCoefficient = 1.0
  const structureCostDifference = (structureCoefficient - standardStructureCoefficient) * totalFloorArea * prices.structure
  const structureCostPercentage = ((breakdown.structure / totalCost) * 100).toFixed(1)
  
  // 環境・日照効果計算
  const sunlightHours = prices.environmental.annualSunlightHours
  const averageSunlightHours = 1800 // 全国平均
  const sunlightEfficiencyRatio = Math.min(sunlightHours / averageSunlightHours, 1.2) // 最大20%向上
  const heatingCostReduction = Math.round((sunlightEfficiencyRatio - 1) * 100)
  
  const currentHeatingCostRatio = prices.operationalCost.heatingCostRatio
  const currentCoolingCostRatio = prices.operationalCost.coolingCostRatio
  const annualEnergyCost = totalFloorArea * prices.operationalCost.annualEnergyCostPerSqm
  
  // 太陽光発電効果計算
  const roofArea = project.buildingInfo.buildingArea * 0.6 // 屋根面積の60%を使用可能と仮定
  const solarPowerSavings = Math.round(roofArea * prices.operationalCost.solarPowerGenerationPerSqm)
  
  // 断熱仕様向上効果計算
  const insulationUpgradeCost = Math.round(totalFloorArea * prices.detailedPrices.insulation * 0.5) // 断熱工事の50%増額と仮定
  const hvacSavingsRatio = 0.3 // 30%削減と仮定
  const annualHvacSavings = Math.round(annualEnergyCost * (currentHeatingCostRatio + currentCoolingCostRatio) * hvacSavingsRatio)
  
  // 高さ制限による影響計算
  const maxHeightMm = project.buildingInfo.maxHeight
  const potentialExtraFloors = Math.max(0, Math.floor((maxHeightMm - 15000) / 3000)) // 15mを超えた分で追加可能階数を計算
  const potentialAreaIncrease = potentialExtraFloors * project.buildingInfo.buildingArea
  const potentialCostIncrease = Math.round(potentialAreaIncrease * prices.structure * structureCoefficient / 10000)
  
  return {
    totalFloorArea,
    structureCoefficient,
    structureName: project.buildingInfo.structure,
    structureCostDifference,
    structureCostPercentage,
    
    sunlightHours,
    sunlightEfficiencyRatio,
    currentHeatingCostRatio,
    currentCoolingCostRatio,
    annualEnergyCost,
    heatingCostReduction,
    
    roofArea,
    solarPowerSavings,
    insulationUpgradeCost,
    annualHvacSavings,
    
    maxHeightMm,
    potentialExtraFloors,
    potentialAreaIncrease,
    potentialCostIncrease,
  }
}

/**
 * AI分析APIを呼び出して分析レポートを取得
 */
export async function generateAIAnalysis(
  project: Project,
  breakdown: CostBreakdown,
  totalCost: number,
  prices: UnitPrices
): Promise<string> {
  console.log('🤖 generateAIAnalysis called from frontend')
  const calculationData = generateCalculationData(project, breakdown, totalCost, prices)
  
  try {
    const apiUrl = `${import.meta.env.VITE_API_URL}/ai/analysis`
    console.log('🚀 Calling AI analysis API at', apiUrl)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project,
        breakdown,
        totalCost,
        prices,
        calculationData
      }),
    })
    
    console.log('📡 API response status:', response.status)
    
    if (!response.ok) {
      throw new Error('AI分析APIの呼び出しに失敗しました')
    }
    
    const result = await response.json()
    
    if (result.success) {
      return result.analysis
    } else {
      throw new Error('AI分析の生成に失敗しました')
    }
    
  } catch (error) {
    console.error('AI analysis error:', error)
    
    // フォールバック: 計算ベースのテンプレート分析を返す
    return generateFallbackAnalysis(calculationData, totalCost)
  }
}

/**
 * フォールバック分析生成（APIが失敗した場合）
 */
function generateFallbackAnalysis(calculationData: CalculationData, totalCost: number): string {
  return `
【AI による見積もり分析レポート】

1. コスト構成の特徴
- 総工事費 ${(totalCost / 10000).toLocaleString()}万円のうち、躯体工事が${calculationData.structureCostPercentage}%を占めています。
- ${calculationData.structureName}の採用により、構造係数${calculationData.structureCoefficient}が適用され、${calculationData.structureCostDifference >= 0 ? '追加' : '削減'}費用は約${Math.abs(Math.round(calculationData.structureCostDifference / 10000))}万円となっています。

2. 環境要因の影響
- 年間日照時間${calculationData.sunlightHours.toLocaleString()}時間（全国平均比${Math.round(calculationData.sunlightEfficiencyRatio * 100)}%）により、暖房費を約${Math.max(0, calculationData.heatingCostReduction)}%削減できる見込みです。
- 現在の暖房費率${(calculationData.currentHeatingCostRatio * 100).toFixed(0)}%、冷房費率${(calculationData.currentCoolingCostRatio * 100).toFixed(0)}%の設定に基づく効果です。

3. 法規制への対応
- 現在の設計高さ${(calculationData.maxHeightMm / 1000).toFixed(1)}mは法規制に適合しています。
- ${calculationData.potentialExtraFloors > 0 ? `さらに${calculationData.potentialExtraFloors}階の増築が可能で、約${calculationData.potentialCostIncrease}万円の追加投資により延床面積を${calculationData.potentialAreaIncrease}㎡拡大できます。` : '現在の設計が最適な高さとなっています。'}

4. 最適化の提案
- 太陽光パネルの設置（屋根面積${Math.round(calculationData.roofArea)}㎡想定）により、年間約${calculationData.solarPowerSavings.toLocaleString()}円の電気代削減が可能です。
- 高断熱仕様への変更（追加費用：約${Math.round(calculationData.insulationUpgradeCost / 10000)}万円）により、年間の冷暖房費約${calculationData.annualHvacSavings.toLocaleString()}円（30%）の削減が期待できます。投資回収期間は約${Math.round(calculationData.insulationUpgradeCost / calculationData.annualHvacSavings)}年です。

※ この分析は計算データに基づくテンプレート分析です。AI APIが利用できない場合のフォールバック表示となります。
`
}