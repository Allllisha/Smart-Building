const express = require('express');
const router = express.Router();

// AI分析レポート生成エンドポイント
router.post('/analysis', async (req, res) => {
  try {
    const {
      project,
      breakdown,
      totalCost,
      prices,
      calculationData
    } = req.body;

    // Azure OpenAI Service呼び出し用のプロンプト構築
    const analysisPrompt = `
あなたは建築コスト分析の専門家です。以下の詳細な計算データに基づいて、建築プロジェクトの見積もり分析レポートを日本語で作成してください。

【プロジェクト情報】
- 名称: ${project.name}
- 所在地: ${project.location.address}
- 構造: ${project.buildingInfo.structure}
- 規模: ${project.buildingInfo.floors}階建 / ${project.buildingInfo.units || 0}戸
- 延床面積: ${calculationData.totalFloorArea}㎡
- 建築面積: ${project.buildingInfo.buildingArea}㎡

【コスト分析データ】
- 総工事費: ${(totalCost / 10000).toLocaleString()}万円
- 延床面積単価: ${Math.round(totalCost / calculationData.totalFloorArea).toLocaleString()}円/㎡

構造係数の影響:
- 採用構造の係数: ${calculationData.structureCoefficient}
- 標準構造との差額: ${calculationData.structureCostDifference >= 0 ? '追加' : '削減'}${Math.abs(Math.round(calculationData.structureCostDifference / 10000))}万円
- 躯体工事の構成比: ${calculationData.structureCostPercentage}%

【環境・エネルギー分析】
年間日照時間: ${calculationData.sunlightHours}時間（全国平均比${Math.round(calculationData.sunlightEfficiencyRatio * 100)}%）
現在の設定:
- 暖房費率: ${(calculationData.currentHeatingCostRatio * 100).toFixed(0)}%
- 冷房費率: ${(calculationData.currentCoolingCostRatio * 100).toFixed(0)}%
- 年間エネルギーコスト: ${calculationData.annualEnergyCost.toLocaleString()}円
暖房費削減効果: ${Math.max(0, calculationData.heatingCostReduction)}%

【最適化提案の計算根拠】
太陽光発電:
- 利用可能屋根面積: ${Math.round(calculationData.roofArea)}㎡
- 年間発電効果: ${calculationData.solarPowerSavings.toLocaleString()}円

断熱仕様向上:
- 追加投資額: ${Math.round(calculationData.insulationUpgradeCost / 10000)}万円
- 年間冷暖房費削減: ${calculationData.annualHvacSavings.toLocaleString()}円（30%削減）
- 投資回収期間: ${Math.round(calculationData.insulationUpgradeCost / calculationData.annualHvacSavings)}年

【法規制への適合状況】
- 現在の設計高さ: ${(calculationData.maxHeightMm / 1000).toFixed(1)}m
- 追加可能階数: ${calculationData.potentialExtraFloors}階
- 追加可能面積: ${calculationData.potentialAreaIncrease}㎡
- 追加投資で拡大可能面積: ${calculationData.potentialCostIncrease}万円

以下の形式で分析レポートを作成してください:

【AI による見積もり分析レポート】

1. コスト構成の特徴
（躯体工事の構成比と構造係数の影響を具体的な数値で説明）

2. 環境要因の影響
（日照条件と現在の設定に基づく暖房費削減効果を説明）

3. 法規制への対応
（建築高さと法規制適合状況、追加投資の可能性を説明）

4. 最適化の提案
（太陽光発電と断熱向上の具体的な投資対効果を説明）

※すべて提供された計算データに基づいて、専門的で分かりやすい解説をしてください。
`;

    // 実際のAzure OpenAI Service呼び出し
    // 本番環境では適切なAPIキーとエンドポイントを設定
    const openaiResponse = await fetch(`${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-02-15-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'あなたは建築コスト分析の専門家です。提供されたデータに基づいて正確で分かりやすい分析レポートを作成してください。'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!openaiResponse.ok) {
      // フォールバック: API失敗時は構造化されたテンプレートを返す
      console.warn('Azure OpenAI API failed, using fallback template');
      const fallbackAnalysis = generateFallbackAnalysis(calculationData, totalCost);
      return res.json({
        success: true,
        analysis: fallbackAnalysis,
        source: 'fallback'
      });
    }

    const aiResult = await openaiResponse.json();
    const aiAnalysis = aiResult.choices[0].message.content;

    res.json({
      success: true,
      analysis: aiAnalysis,
      source: 'ai'
    });

  } catch (error) {
    console.error('AI analysis generation error:', error);
    
    // エラー時もフォールバックを提供
    const fallbackAnalysis = generateFallbackAnalysis(req.body.calculationData, req.body.totalCost);
    res.json({
      success: true,
      analysis: fallbackAnalysis,
      source: 'fallback'
    });
  }
});

// フォールバック分析生成関数
function generateFallbackAnalysis(calculationData, totalCost) {
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
`;
}

module.exports = router;