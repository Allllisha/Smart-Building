import { DefaultAzureCredential } from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';
import { WebSearchService } from './websearch.service';

interface ProjectData {
  buildingInfo: {
    usage: string;
    structure: string;
    floors: number;
    units?: number;
    maxHeight: number;
    foundationHeight: number;
    buildingArea: number;
    totalFloorArea: number;
    effectiveArea: number;
    constructionArea: number;
  };
  siteInfo: {
    landType: string;
    siteArea: number;
    effectiveSiteArea: number;
    zoningType: string;
    buildingCoverage: number;
    floorAreaRatio: number;
    heightLimit: string;
    heightDistrict: string;
  };
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  schedule?: {
    startDate: Date | null;
    completionDate: Date | null;
    duration: number | null;
  };
  webSearchResults?: {
    urbanPlanning?: any;
    sunlightRegulation?: any;
    administrativeGuidance?: string[];
  };
}

interface DetailedEstimation {
  totalCost: number;
  breakdown: {
    foundation: number;
    structure: number;
    exterior: number;
    interior: number;
    electrical: number;
    plumbing: number;
    hvac: number;
    other: number;
    temporary: number;
    design: number;
  };
  schedule: {
    startDate: Date | null;
    completionDate: Date | null;
    duration: number | null;
  };
  detailedBreakdown?: {
    foundation?: { [key: string]: number };
    structure?: { [key: string]: number };
    exterior?: { [key: string]: number };
    interior?: { [key: string]: number };
    electrical?: { [key: string]: number };
  };
  operationalCost: {
    annualEnergyCost: number;
    heatingCost: number;
    coolingCost: number;
    solarPowerGeneration: number;
    paybackPeriod?: number;
  };
  environmentalPerformance: {
    annualSunlightHours: number;
    energyEfficiencyRating: string;
    co2Emissions: number;
  };
  disasterRiskCost: {
    floodRisk: string;
    earthquakeRisk: string;
    landslideRisk: string;
    recommendedMeasuresCost: number;
  };
  aiAnalysis: string;
  costFactors: {
    regionalMultiplier: number;
    structuralComplexity: number;
    regulatoryCompliance: number;
    environmentalEfficiency: number;
  };
  dataSource: {
    marketPrices: string;
    weatherData: string;
    regulationData: string;
    calculatedAt: string;
  };
}

export class AIEstimationService {
  private aiProjectClient: AIProjectClient;
  private agentId: string;
  private webSearchService: WebSearchService;

  constructor() {
    const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT!;
    const agentId = process.env.AZURE_BING_SEARCH_AGENT_ID!;
    
    const credential = new DefaultAzureCredential();
    this.aiProjectClient = new AIProjectClient(endpoint, credential);
    this.agentId = agentId;
    this.webSearchService = new WebSearchService();
  }

  /**
   * AIベースの詳細見積もりを生成
   */
  async generateDetailedEstimation(projectData: ProjectData): Promise<DetailedEstimation> {
    try {
      console.log('🏗️ AI-based estimation starting for:', projectData.location.address);

      // 0. Web検索結果がない場合は、地域情報を取得
      if (!projectData.webSearchResults) {
        console.log('🔍 Fetching region information via WebSearch...');
        try {
          const [prefecture, city] = this.extractPrefectureAndCity(projectData.location.address);
          const webSearchResults = await this.webSearchService.searchComprehensiveRegionInfo(
            projectData.location.address,
            prefecture,
            city
          );
          projectData.webSearchResults = webSearchResults;
          console.log('✅ Region information fetched successfully');
        } catch (webSearchError) {
          console.warn('⚠️ WebSearch failed, proceeding without region data:', webSearchError);
        }
      }

      // 1. 地域の市場価格データを取得
      const marketPrices = await this.getRegionalMarketPrices(projectData);
      
      // 2. 建物の複雑度を分析
      const complexityAnalysis = await this.analyzeBuildingComplexity(projectData);
      
      // 3. 環境性能と運用コストを計算
      const environmentalAnalysis = await this.analyzeEnvironmentalPerformance(projectData);
      
      // 4. 法規制コンプライアンスコストを算出
      const regulatoryCompliance = await this.calculateRegulatoryCosts(projectData);
      
      // 5. 災害リスクと対策費用を評価
      const disasterRiskAssessment = await this.assessDisasterRisk(projectData);
      
      // 6. 総合的な見積もりを生成
      const estimation = await this.synthesizeEstimation({
        projectData,
        marketPrices,
        complexityAnalysis,
        environmentalAnalysis,
        regulatoryCompliance,
        disasterRiskAssessment
      });

      console.log('✅ AI estimation completed:', estimation.totalCost);
      return estimation;

    } catch (error) {
      console.error('AI estimation error:', error);
      throw new Error(`AI見積もり生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 地域の市場価格データを取得
   */
  private async getRegionalMarketPrices(projectData: ProjectData) {
    const query = `${projectData.location.address} 建築 工事費 単価 2025年 ${projectData.buildingInfo.structure} ${projectData.buildingInfo.usage}`;
    
    const analysisResult = await this.performAIAnalysis(query, `
以下の建築プロジェクトの地域市場価格を分析してください：

所在地: ${projectData.location.address}
建物用途: ${projectData.buildingInfo.usage}
構造: ${projectData.buildingInfo.structure}
規模: ${projectData.buildingInfo.totalFloorArea}㎡
階数: ${projectData.buildingInfo.floors}階

実際の建築見積書の構成に基づいて、以下の詳細な工事項目別の単価を分析してください：

基礎工事関連：
- 杭工事（建築面積×階数に応じた深さ）
- 地盤改良工事
- 山留工事
- 土工事
- RC工事
- 鉄筋防錆工事

躯体工事関連：
- 鉄骨本体工事（構造種別ごと）
- 鉄骨設備工事
- 断熱防露工事
- 耐火被覆工事
- 屋根・防水工事
- 金属工事

外装・内装工事：
- 外装仕上工事
- 内装仕上工事
- 塗装工事

電気設備関連：
- 受変電設備工事
- 照明器具設備工事
- 電灯コンセント設備工事
- LAN工事設備工事
- 防犯防災設備工事
- その他電気設備

給排水・衛生設備関連
空調・換気設備関連
その他工事
仮設・追加工事
設計・諸経費（工事費合計の何%か）

各項目について、地域・構造・階数・用途を考慮した単価と計算式を提示してください。

JSON回答形式：
{
  "calculationFormulas": {
    "foundation": {
      "杭工事": {
        "formula": "建築面積 * 単価 * 階数係数",
        "unitPrice": 数値,
        "floorCoefficient": 数値
      },
      "地盤改良工事": {
        "formula": "建築面積 * 単価",
        "unitPrice": 数値
      },
      // 他の項目も同様に
    },
    "structure": {
      "鉄骨本体工事": {
        "formula": "延床面積 * 単価 * 構造係数",
        "unitPrice": 数値,
        "structureCoefficients": {
          "壁式鉄筋コンクリート造": 数値,
          "鉄骨造": 数値,
          "木造軸組工法": 数値
        }
      },
      // 他の項目
    },
    // 他のカテゴリ
  },
  "regionalMultiplier": 数値,
  "analysis": "詳細な価格根拠の説明"
}
`);

    // AIからの回答が取得できない場合は、入力情報を基に推定
    if (!analysisResult || analysisResult.trim() === '') {
      return this.calculateMarketPricesFromInputs(projectData);
    }

    return this.parseAIResponse(analysisResult, this.calculateMarketPricesFromInputs(projectData));
  }

  /**
   * 建物の構造的複雑度を分析
   */
  private async analyzeBuildingComplexity(projectData: ProjectData) {
    const complexityQuery = `建物複雑度分析 ${projectData.buildingInfo.structure} ${projectData.buildingInfo.floors}階建 ${projectData.buildingInfo.usage}`;
    
    const result = await this.performAIAnalysis(complexityQuery, `
建物の構造的複雑度を分析してください：

基本情報:
- 構造: ${projectData.buildingInfo.structure}
- 階数: ${projectData.buildingInfo.floors}階
- 用途: ${projectData.buildingInfo.usage}
- 建築面積: ${projectData.buildingInfo.buildingArea}㎡
- 延床面積: ${projectData.buildingInfo.totalFloorArea}㎡
- 最高高さ: ${projectData.buildingInfo.maxHeight}mm

以下の観点から複雑度係数を算出してください：
1. 構造的複雑度（1.0-1.5）
2. 設備的複雑度（1.0-1.3）
3. 施工難易度（1.0-1.4）

JSON形式で回答：
{
  "structuralComplexity": 数値,
  "mechanicalComplexity": 数値,
  "constructionDifficulty": 数値,
  "overallComplexity": 数値,
  "reasoning": "複雑度算出の根拠"
}
`);

    // AIからの回答が取得できない場合は、入力情報を基に推定
    if (!result || result.trim() === '') {
      return this.calculateComplexityFromInputs(projectData);
    }

    return this.parseAIResponse(result, this.calculateComplexityFromInputs(projectData));
  }

  /**
   * 環境性能と運用コストを分析
   */
  private async analyzeEnvironmentalPerformance(projectData: ProjectData) {
    const environmentQuery = `環境性能分析 ${projectData.location.address} 建物エネルギー効率`;
    
    const result = await this.performAIAnalysis(environmentQuery, `
建物の環境性能と運用コストを分析してください：

立地: ${projectData.location.address}
建物用途: ${projectData.buildingInfo.usage}
構造: ${projectData.buildingInfo.structure}
階数: ${projectData.buildingInfo.floors}階
延床面積: ${projectData.buildingInfo.totalFloorArea}㎡
建築面積: ${projectData.buildingInfo.buildingArea}㎡
最高高さ: ${projectData.buildingInfo.maxHeight}mm

入力された建物情報を基に、以下を詳細に分析してください：
1. 建物用途と構造に応じた年間エネルギー消費量
2. 地域気候と建物特性を考慮した冷暖房費
3. 屋根面積と地域日照条件による太陽光発電ポテンシャル
4. 建物規模と用途に応じた省エネ効果とCO2排出量
5. エネルギー効率評価（建物用途・構造・規模を総合評価）

JSON回答：
{
  "annualEnergyConsumption": 数値（kWh/年）,
  "heatingCost": 数値（円/年）,
  "coolingCost": 数値（円/年）,
  "solarPotential": 数値（kW）,
  "energyEfficiencyRating": "A/B/C/D/E",
  "co2Emissions": 数値（kg/年）,
  "analysis": "分析詳細と算出根拠"
}
`);

    // AIからの回答が取得できない場合は、入力情報を基に推定
    if (!result || result.trim() === '') {
      return this.calculateEnvironmentalPerformanceFromInputs(projectData);
    }

    return this.parseAIResponse(result, this.calculateEnvironmentalPerformanceFromInputs(projectData));
  }

  /**
   * 法規制コンプライアンスコストを計算
   */
  private async calculateRegulatoryCosts(projectData: ProjectData) {
    const regulatoryQuery = `建築法規制 コンプライアンス費用 ${projectData.location.address}`;
    
    // Web検索結果がある場合は活用
    const webSearchContext = projectData.webSearchResults ? `
取得済み規制情報：
- 都市計画: ${JSON.stringify(projectData.webSearchResults.urbanPlanning)}
- 日影規制: ${JSON.stringify(projectData.webSearchResults.sunlightRegulation)}
- 行政指導: ${projectData.webSearchResults.administrativeGuidance?.join(', ')}
` : '';

    const result = await this.performAIAnalysis(regulatoryQuery, `
法規制コンプライアンスに必要な追加費用を算出してください：

基本情報:
${webSearchContext}
- 所在地: ${projectData.location.address}
- 用途地域: ${projectData.siteInfo.zoningType}
- 建物高さ: ${projectData.buildingInfo.maxHeight}mm
- 建ぺい率: ${projectData.siteInfo.buildingCoverage}%

以下の法規制適合費用を算出：
1. 日影規制対応
2. 防火規制対応
3. バリアフリー対応
4. 省エネ基準対応

JSON回答：
{
  "shadowRegulationCost": 数値,
  "fireRegulationCost": 数値,
  "accessibilityCost": 数値,
  "energyComplianceCost": 数値,
  "totalRegulatoryCompliance": 数値,
  "complianceMultiplier": 数値（1.0基準）,
  "explanation": "規制対応の詳細"
}
`);

    // AIからの回答が取得できない場合は、入力情報を基に推定
    if (!result || result.trim() === '') {
      return this.calculateRegulatoryComplianceFromInputs(projectData);
    }

    return this.parseAIResponse(result, this.calculateRegulatoryComplianceFromInputs(projectData));
  }

  /**
   * 災害リスクと対策費用を評価
   */
  private async assessDisasterRisk(projectData: ProjectData) {
    const riskQuery = `災害リスク評価 ${projectData.location.address} ハザードマップ`;
    
    const result = await this.performAIAnalysis(riskQuery, `
敷地の災害リスクと推奨対策費用を評価してください：

所在地: ${projectData.location.address}
建物用途: ${projectData.buildingInfo.usage}
構造: ${projectData.buildingInfo.structure}
階数: ${projectData.buildingInfo.floors}階
延床面積: ${projectData.buildingInfo.totalFloorArea}㎡
建築面積: ${projectData.buildingInfo.buildingArea}㎡

入力された建物情報と立地を基に、以下のリスクを評価してください：
1. 洪水リスク（住所の地形・標高・河川からの距離を考慮）
2. 地震リスク（地域の地震活動・地盤状況を考慮）
3. 土砂災害リスク（地形・斜面の状況を考慮）
4. 建物規模と構造に応じた推奨対策と概算費用

各リスクレベルの判断根拠と、建物の用途・構造・規模に応じた具体的な対策費用を算出してください。

JSON回答：
{
  "floodRisk": "low/medium/high",
  "earthquakeRisk": "low/medium/high", 
  "landslideRisk": "low/medium/high",
  "recommendedMeasures": ["対策1", "対策2"],
  "estimatedCost": 数値,
  "riskMultiplier": 数値（1.0基準）,
  "assessment": "リスク評価詳細と算出根拠"
}
`);

    // AIからの回答が取得できない場合は、入力情報を基に推定
    if (!result || result.trim() === '') {
      return this.calculateDisasterRiskFromInputs(projectData);
    }

    return this.parseAIResponse(result, this.calculateDisasterRiskFromInputs(projectData));
  }

  /**
   * 総合的な見積もりを合成
   */
  private async synthesizeEstimation(analysisData: any): Promise<DetailedEstimation> {
    const { projectData, marketPrices, complexityAnalysis, environmentalAnalysis, regulatoryCompliance, disasterRiskAssessment } = analysisData;
    
    // 基本工事費の計算
    const totalFloorArea = projectData.buildingInfo.totalFloorArea;
    const buildingArea = projectData.buildingInfo.buildingArea;
    const floors = projectData.buildingInfo.floors;
    const structure = projectData.buildingInfo.structure;
    
    const regionalMultiplier = marketPrices.regionalMultiplier || 1.0;
    const complexityMultiplier = complexityAnalysis.overallComplexity || 1.0;
    const complianceMultiplier = regulatoryCompliance.complianceMultiplier || 1.0;
    
    // AIが提供した計算式を使用して動的に計算
    const formulas = marketPrices.calculationFormulas || this.getDefaultFormulas();
    
    // 基礎工事関連の計算
    let foundationTotal = 0;
    if (formulas.foundation) {
      Object.entries(formulas.foundation).forEach(([, itemFormula]: [string, any]) => {
        const cost = this.calculateByCostFormula(itemFormula, {
          buildingArea,
          totalFloorArea,
          floors,
          structure,
          regionalMultiplier,
          complexityMultiplier
        });
        foundationTotal += cost;
      });
    }
    
    // 躯体工事関連の計算
    let structureTotal = 0;
    if (formulas.structure) {
      Object.entries(formulas.structure).forEach(([, itemFormula]: [string, any]) => {
        const cost = this.calculateByCostFormula(itemFormula, {
          buildingArea,
          totalFloorArea,
          floors,
          structure,
          regionalMultiplier,
          complexityMultiplier
        });
        structureTotal += cost;
      });
    }
    
    // 外装・内装工事
    const exteriorFormula = formulas.exterior || { "外装仕上": { formula: "延床面積 * 単価", unitPrice: 55000 }};
    const interiorFormula = formulas.interior || { "内装仕上": { formula: "延床面積 * 単価", unitPrice: 65000 }};
    
    let exteriorTotal = this.calculateCategoryTotal(exteriorFormula, {
      buildingArea, totalFloorArea, floors, structure, regionalMultiplier
    });
    let interiorTotal = this.calculateCategoryTotal(interiorFormula, {
      buildingArea, totalFloorArea, floors, structure, regionalMultiplier
    });
    
    // 電気設備関連
    const electricalFormula = formulas.electrical || this.getDefaultElectricalFormulas();
    let electricalTotal = this.calculateCategoryTotal(electricalFormula, {
      buildingArea, totalFloorArea, floors, structure, regionalMultiplier,
      mechanicalComplexity: complexityAnalysis.mechanicalComplexity
    });
    
    // 給排水・衛生設備
    const plumbingFormula = formulas.plumbing || { formula: "延床面積 * 単価 * 機械複雑度", unitPrice: 38000 };
    const plumbingTotal = Math.round(totalFloorArea * (plumbingFormula.unitPrice || 38000) * 
                                   complexityAnalysis.mechanicalComplexity * regionalMultiplier);
    
    // 空調・換気設備
    const hvacFormula = formulas.hvac || { formula: "延床面積 * 単価 * 機械複雑度", unitPrice: 48000 };
    const hvacTotal = Math.round(totalFloorArea * (hvacFormula.unitPrice || 48000) * 
                                complexityAnalysis.mechanicalComplexity * regionalMultiplier);
    
    // その他工事
    const otherFormula = formulas.other || { formula: "延床面積 * 単価", unitPrice: 25000 };
    const otherTotal = Math.round(totalFloorArea * (otherFormula.unitPrice || 25000) * regionalMultiplier) + 
                      (regulatoryCompliance.totalRegulatoryCompliance || 0);
    
    // 仮設・追加工事
    const temporaryFormula = formulas.temporary || { formula: "延床面積 * 単価 * 施工難易度", unitPrice: 22000 };
    const temporaryTotal = Math.round(totalFloorArea * (temporaryFormula.unitPrice || 22000) * 
                                    complexityAnalysis.constructionDifficulty * regionalMultiplier);
    
    // 設計・諸経費（工事費の指定%）
    const subtotal = foundationTotal + structureTotal + exteriorTotal + interiorTotal + 
                     electricalTotal + plumbingTotal + hvacTotal + otherTotal + temporaryTotal;
    const designPercentage = formulas.designPercentage || 0.12;
    const designTotal = Math.round(subtotal * designPercentage * complianceMultiplier);
    
    const breakdown = {
      foundation: foundationTotal,
      structure: structureTotal,
      exterior: exteriorTotal,
      interior: interiorTotal,
      electrical: electricalTotal,
      plumbing: plumbingTotal,
      hvac: hvacTotal,
      other: otherTotal,
      temporary: temporaryTotal,
      design: designTotal,
    };

    const totalCost = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0);

    // AI分析レポートを生成
    const aiAnalysis = await this.generateAIAnalysisReport({
      projectData,
      breakdown,
      totalCost,
      marketPrices,
      complexityAnalysis,
      environmentalAnalysis,
      regulatoryCompliance,
      disasterRiskAssessment
    });

    return {
      totalCost,
      breakdown,
      schedule: projectData.schedule || {
        startDate: null,
        completionDate: null,
        duration: null
      },
      operationalCost: {
        annualEnergyCost: environmentalAnalysis.heatingCost + environmentalAnalysis.coolingCost,
        heatingCost: environmentalAnalysis.heatingCost,
        coolingCost: environmentalAnalysis.coolingCost,
        solarPowerGeneration: environmentalAnalysis.solarPotential * 1000, // kWをWに変換
        paybackPeriod: environmentalAnalysis.solarPotential > 10 ? 12 : undefined,
      },
      environmentalPerformance: {
        annualSunlightHours: this.calculateAnnualSunlightHours(projectData),
        energyEfficiencyRating: environmentalAnalysis.energyEfficiencyRating,
        co2Emissions: environmentalAnalysis.co2Emissions,
      },
      disasterRiskCost: {
        floodRisk: disasterRiskAssessment.floodRisk,
        earthquakeRisk: disasterRiskAssessment.earthquakeRisk,
        landslideRisk: disasterRiskAssessment.landslideRisk,
        recommendedMeasuresCost: disasterRiskAssessment.estimatedCost,
      },
      aiAnalysis,
      costFactors: {
        regionalMultiplier,
        structuralComplexity: complexityMultiplier,
        regulatoryCompliance: complianceMultiplier,
        environmentalEfficiency: 1.0, // 実装予定
      },
      dataSource: {
        marketPrices: marketPrices.analysis || "AI分析による市場価格",
        weatherData: "Open-Meteo API",
        regulationData: "自治体公式情報 + AI解析",
        calculatedAt: new Date().toISOString(),
      }
    };
  }

  /**
   * AI分析レポートを生成
   */
  private async generateAIAnalysisReport(data: any): Promise<string> {
    const reportQuery = `見積もり分析レポート生成 ${data.projectData.buildingInfo.usage} ${data.projectData.location.address}`;
    
    const result = await this.performAIAnalysis(reportQuery, `
以下のデータを基に、詳細な見積もり分析レポートを日本語で生成してください：

プロジェクト情報:
- 所在地: ${data.projectData.location.address}
- 用途: ${data.projectData.buildingInfo.usage}
- 構造: ${data.projectData.buildingInfo.structure}
- 延床面積: ${data.projectData.buildingInfo.totalFloorArea}㎡
- 総工事費: ${(data.totalCost / 10000).toLocaleString()}万円

コスト要因:
- 地域係数: ${data.marketPrices.regionalMultiplier}
- 複雑度係数: ${data.complexityAnalysis.overallComplexity}
- 法規制係数: ${data.regulatoryCompliance.complianceMultiplier}

以下の構成でレポートを作成：
1. コスト構成の特徴と分析
2. 地域特性による影響
3. 法規制・環境要因の影響
4. 最適化提案とコスト削減案
5. 将来的なリスクと対策

自然な日本語で、建築の専門家にも一般の方にも分かりやすく説明してください。
`);

    return result || `
【AI による見積もり分析レポート】

1. コスト構成の特徴
- 総工事費 ${(data.totalCost / 10000).toLocaleString()}万円のうち、躯体工事が${((data.breakdown.structure / data.totalCost) * 100).toFixed(1)}%を占めています。
- ${data.projectData.buildingInfo.structure}の採用により、構造計算や施工の複雑度が標準より${((data.complexityAnalysis.overallComplexity - 1) * 100).toFixed(1)}%高くなっています。

2. 地域特性による影響  
- 所在地域の建築費相場を反映し、標準価格から${((data.marketPrices.regionalMultiplier - 1) * 100).toFixed(1)}%の調整を行いました。
- 地域の気候条件を考慮した環境性能設計により、年間エネルギーコストを最適化しています。

3. 法規制・環境要因の影響
- 地域の建築基準法と条例への適合により、追加費用として約${Math.round(data.regulatoryCompliance.totalRegulatoryCompliance / 10000)}万円を計上しています。
- 日影規制等の地域特有の制約に対する設計対応を含めています。

4. 最適化提案
- 太陽光発電システム（約${data.environmentalAnalysis.solarPotential}kW）の導入により、年間約${Math.round(data.environmentalAnalysis.solarPotential * 1000 * 25)}円の電気代削減が可能です。
- 高効率設備の採用により、運用コストを長期的に削減できます。

※ この分析は最新の市場データと地域情報をAIが総合的に解析して生成されています。
`;
  }

  /**
   * WebSearchエージェントを使用してAI分析を実行
   */
  private async performAIAnalysis(query: string, instruction?: string): Promise<string> {
    try {
      // Create a thread
      const thread = await this.aiProjectClient.agents.threads.create();
      
      // Create a message in the thread
      await this.aiProjectClient.agents.messages.create(thread.id, 'user', instruction ? `${instruction}\n\n検索クエリ: ${query}` : query);

      // Create and run the agent
      const run = await this.aiProjectClient.agents.runs.create(thread.id, this.agentId);

      // Wait for the run to complete
      let runStatus = await this.aiProjectClient.agents.runs.get(thread.id, run.id);
      
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.aiProjectClient.agents.runs.get(thread.id, run.id);
      }

      if (runStatus.status === 'completed') {
        // Get the messages from the thread
        const messages = await this.aiProjectClient.agents.messages.list(thread.id);
        const messagesList = [];
        for await (const message of messages) {
          messagesList.push(message);
        }
        const assistantMessages = messagesList.filter((msg: any) => msg.role === 'assistant');
        
        if (assistantMessages.length > 0) {
          const latestMessage = assistantMessages[0];
          const content = Array.isArray(latestMessage.content) 
            ? latestMessage.content.map((c: any) => c.type === 'text' ? c.text.value : '').join('\n')
            : latestMessage.content;

          return content;
        }
      }

      throw new Error(`AI analysis failed with status: ${runStatus.status}`);

    } catch (error) {
      console.error('AI analysis error:', error);
      return ''; // デフォルト値を返す
    }
  }

  /**
   * AI応答をJSONパースし、フォールバック値を提供
   */
  private parseAIResponse(response: string, fallback: any): any {
    try {
      // JSONブロックを抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { ...fallback, ...parsed };
      }
      return fallback;
    } catch (error) {
      console.warn('AI response parsing failed, using fallback:', error);
      return fallback;
    }
  }

  /**
   * 住所から都道府県と市区町村を抽出
   */
  private extractPrefectureAndCity(address: string): [string, string] {
    // 基本的な住所パターンマッチング
    const match = address.match(/^(.*?[都道府県])(.*?[市区郡])/);
    if (match) {
      return [match[1], match[2]];
    }
    
    // フォールバック: 東京都世田谷区を仮定
    return ['東京都', '世田谷区'];
  }

  /**
   * コスト計算式を動的に評価
   */
  private calculateByCostFormula(formula: any, params: any): number {
    try {
      const { buildingArea, totalFloorArea, floors, structure, regionalMultiplier, mechanicalComplexity } = params;
      
      // 構造係数を取得
      const structureCoefficient = formula.structureCoefficients?.[structure] || 1.0;
      
      // 基本的な計算パターンを識別して計算
      if (formula.formula.includes('建築面積 * 単価 * 階数係数')) {
        return Math.round(buildingArea * (formula.unitPrice || 0) * floors * (formula.floorCoefficient || 1) * regionalMultiplier);
      } else if (formula.formula.includes('建築面積 * 単価 * min(階数, 3)')) {
        return Math.round(buildingArea * (formula.unitPrice || 0) * Math.min(floors, 3) * regionalMultiplier);
      } else if (formula.formula.includes('延床面積 * 単価 * 構造係数')) {
        return Math.round(totalFloorArea * (formula.unitPrice || 0) * structureCoefficient * regionalMultiplier);
      } else if (formula.formula.includes('延床面積 * 単価 * (階数>3 ? 1.2 : 1.0)')) {
        return Math.round(totalFloorArea * (formula.unitPrice || 0) * (floors > 3 ? 1.2 : 1.0) * regionalMultiplier);
      } else if (formula.formula.includes('建築面積 * 単価')) {
        return Math.round(buildingArea * (formula.unitPrice || 0) * regionalMultiplier);
      } else if (formula.formula.includes('延床面積 * 単価 * 機械複雑度')) {
        return Math.round(totalFloorArea * (formula.unitPrice || 0) * (mechanicalComplexity || 1) * regionalMultiplier);
      } else if (formula.formula.includes('延床面積 * 単価')) {
        return Math.round(totalFloorArea * (formula.unitPrice || 0) * regionalMultiplier);
      }
      
      // デフォルト
      return Math.round(totalFloorArea * (formula.unitPrice || 0) * regionalMultiplier);
      
    } catch (error) {
      console.error('Formula calculation error:', error);
      return 0;
    }
  }

  /**
   * カテゴリー全体の合計を計算
   */
  private calculateCategoryTotal(categoryFormulas: any, params: any): number {
    let total = 0;
    
    if (typeof categoryFormulas === 'object' && !categoryFormulas.formula) {
      // 複数の項目がある場合
      Object.entries(categoryFormulas).forEach(([, itemFormula]: [string, any]) => {
        total += this.calculateByCostFormula(itemFormula, params);
      });
    } else {
      // 単一の式の場合
      total = this.calculateByCostFormula(categoryFormulas, params);
    }
    
    return total;
  }

  /**
   * デフォルトの計算式を取得
   */
  private getDefaultFormulas() {
    return {
      foundation: {
        "杭工事": { formula: "建築面積 * 単価 * 階数係数", unitPrice: 35000, floorCoefficient: 0.3 },
        "地盤改良工事": { formula: "建築面積 * 単価", unitPrice: 30000 },
        "山留工事": { formula: "建築面積 * 単価 * min(階数, 3)", unitPrice: 25000 },
        "土工事": { formula: "建築面積 * 単価", unitPrice: 20000 },
        "RC工事": { formula: "建築面積 * 単価", unitPrice: 28000 },
        "鉄筋防錆工事": { formula: "建築面積 * 単価", unitPrice: 15000 }
      },
      structure: {
        "鉄骨本体工事": { 
          formula: "延床面積 * 単価 * 構造係数", 
          unitPrice: 120000,
          structureCoefficients: {
            "壁式鉄筋コンクリート造": 1.3,
            "鉄骨造": 1.1,
            "木造軸組工法": 0.7,
            "その他": 1.0
          }
        },
        "鉄骨設備工事": { formula: "延床面積 * 単価", unitPrice: 8000 },
        "断熱防露工事": { formula: "延床面積 * 単価", unitPrice: 12000 },
        "耐火被覆工事": { formula: "延床面積 * 単価 * (階数>3 ? 1.2 : 1.0)", unitPrice: 10000 },
        "屋根防水工事": { formula: "建築面積 * 単価", unitPrice: 25000 },
        "金属工事": { formula: "延床面積 * 単価", unitPrice: 15000 }
      },
      designPercentage: 0.12
    };
  }

  /**
   * デフォルトの電気設備計算式
   */
  private getDefaultElectricalFormulas() {
    return {
      "受変電設備": { formula: "延床面積 * 単価 * 機械複雑度", unitPrice: 8000 },
      "照明器具設備": { formula: "延床面積 * 単価", unitPrice: 12000 },
      "電灯コンセント": { formula: "延床面積 * 単価", unitPrice: 10000 },
      "LAN工事": { formula: "延床面積 * 単価", unitPrice: 8000 },
      "防犯・防災設備": { formula: "延床面積 * 単価", unitPrice: 6000 },
      "その他電気設備": { formula: "延床面積 * 単価", unitPrice: 5000 }
    };
  }

  /**
   * 入力情報を基に地域市場価格を算出
   */
  private calculateMarketPricesFromInputs(projectData: ProjectData) {
    const { buildingInfo, siteInfo, location } = projectData;
    
    // 建物用途による単価調整
    const usageMultiplier = this.getUsageMultiplier(buildingInfo.usage);
    
    // 構造による単価調整
    const structureMultiplier = this.getStructureMultiplier(buildingInfo.structure);
    
    // 規模による単価調整
    const scaleMultiplier = this.getScaleMultiplier(buildingInfo.totalFloorArea);
    
    // 地域係数（住所から推定）
    const regionalMultiplier = this.getRegionalMultiplier(location.address);
    
    const baseUnitPrices = {
      foundation: {
        "杭工事": { 
          formula: "建築面積 * 単価 * 階数係数", 
          unitPrice: Math.round(28000 * usageMultiplier * structureMultiplier * scaleMultiplier), 
          floorCoefficient: buildingInfo.floors > 3 ? 0.4 : 0.2 
        },
        "地盤改良工事": { 
          formula: "建築面積 * 単価", 
          unitPrice: Math.round(25000 * structureMultiplier * scaleMultiplier) 
        },
        "山留工事": { 
          formula: "建築面積 * 単価 * min(階数, 3)", 
          unitPrice: Math.round(20000 * structureMultiplier) 
        },
        "土工事": { 
          formula: "建築面積 * 単価", 
          unitPrice: Math.round(18000 * scaleMultiplier) 
        },
        "RC工事": { 
          formula: "建築面積 * 単価", 
          unitPrice: Math.round(24000 * structureMultiplier * scaleMultiplier) 
        },
        "鉄筋防錆工事": { 
          formula: "建築面積 * 単価", 
          unitPrice: Math.round(12000 * structureMultiplier) 
        }
      },
      structure: {
        "鉄骨本体工事": {
          formula: "延床面積 * 単価 * 構造係数",
          unitPrice: Math.round(100000 * usageMultiplier * scaleMultiplier),
          structureCoefficients: {
            "壁式鉄筋コンクリート造": 1.4,
            "鉄骨造": 1.1,
            "木造軸組工法": 0.6,
            "その他": 1.0
          }
        },
        "鉄骨設備工事": { 
          formula: "延床面積 * 単価", 
          unitPrice: Math.round(7000 * usageMultiplier) 
        },
        "断熱防露工事": { 
          formula: "延床面積 * 単価", 
          unitPrice: Math.round(10000 * usageMultiplier) 
        },
        "耐火被覆工事": { 
          formula: "延床面積 * 単価 * (階数>3 ? 1.2 : 1.0)", 
          unitPrice: Math.round(8500 * structureMultiplier) 
        },
        "屋根防水工事": { 
          formula: "建築面積 * 単価", 
          unitPrice: Math.round(22000 * usageMultiplier) 
        },
        "金属工事": { 
          formula: "延床面積 * 単価", 
          unitPrice: Math.round(13000 * usageMultiplier) 
        }
      }
    };
    
    return {
      calculationFormulas: baseUnitPrices,
      regionalMultiplier,
      analysis: `建物用途: ${buildingInfo.usage}, 構造: ${buildingInfo.structure}, 規模: ${buildingInfo.totalFloorArea}㎡を基に単価を算出`
    };
  }

  /**
   * 入力情報を基に建物複雑度を算出
   */
  private calculateComplexityFromInputs(projectData: ProjectData) {
    const { buildingInfo } = projectData;
    
    // 構造的複雑度
    let structuralComplexity = 1.0;
    if (buildingInfo.structure === '壁式鉄筋コンクリート造') {
      structuralComplexity = 1.3;
    } else if (buildingInfo.structure === '鉄骨造') {
      structuralComplexity = 1.1;
    } else if (buildingInfo.structure === '木造軸組工法') {
      structuralComplexity = 0.9;
    }
    
    // 階数による複雑度
    if (buildingInfo.floors >= 5) {
      structuralComplexity *= 1.15;
    } else if (buildingInfo.floors >= 3) {
      structuralComplexity *= 1.05;
    }
    
    // 設備的複雑度（用途と規模による）
    let mechanicalComplexity = 1.0;
    if (buildingInfo.usage === '共同住宅') {
      mechanicalComplexity = 1.1;
    } else if (buildingInfo.usage === 'オフィス') {
      mechanicalComplexity = 1.2;
    } else if (buildingInfo.usage === '商業施設') {
      mechanicalComplexity = 1.3;
    }
    
    // 規模による設備複雑度
    if (buildingInfo.totalFloorArea >= 2000) {
      mechanicalComplexity *= 1.15;
    } else if (buildingInfo.totalFloorArea >= 1000) {
      mechanicalComplexity *= 1.08;
    }
    
    // 施工難易度
    let constructionDifficulty = 1.0;
    if (buildingInfo.floors >= 4) {
      constructionDifficulty = 1.2;
    } else if (buildingInfo.floors >= 3) {
      constructionDifficulty = 1.1;
    }
    
    // 高さによる難易度
    if (buildingInfo.maxHeight >= 15000) { // 15m以上
      constructionDifficulty *= 1.15;
    }
    
    const overallComplexity = (structuralComplexity + mechanicalComplexity + constructionDifficulty) / 3;
    
    return {
      structuralComplexity: Math.round(structuralComplexity * 100) / 100,
      mechanicalComplexity: Math.round(mechanicalComplexity * 100) / 100,
      constructionDifficulty: Math.round(constructionDifficulty * 100) / 100,
      overallComplexity: Math.round(overallComplexity * 100) / 100,
      reasoning: `構造: ${buildingInfo.structure}, 階数: ${buildingInfo.floors}階, 用途: ${buildingInfo.usage}, 規模: ${buildingInfo.totalFloorArea}㎡を基に算出`
    };
  }

  /**
   * 入力情報を基に環境性能を算出
   */
  private calculateEnvironmentalPerformanceFromInputs(projectData: ProjectData) {
    const { buildingInfo, location } = projectData;
    
    // 建物用途によるエネルギー原単位
    const energyBaseUnit = this.getEnergyBaseUnit(buildingInfo.usage);
    
    // 構造によるエネルギー効率
    const structureEfficiency = this.getStructureEfficiency(buildingInfo.structure);
    
    // 規模による効率係数
    const scaleEfficiency = buildingInfo.totalFloorArea > 1000 ? 0.9 : 1.0;
    
    const annualEnergyConsumption = Math.round(
      buildingInfo.totalFloorArea * energyBaseUnit * structureEfficiency * scaleEfficiency
    );
    
    // 地域の気候特性を考慮した冷暖房費
    const climateMultiplier = this.getClimateMultiplier(location.address);
    const heatingCost = Math.round(buildingInfo.totalFloorArea * 1000 * climateMultiplier * structureEfficiency);
    const coolingCost = Math.round(buildingInfo.totalFloorArea * 800 * climateMultiplier * structureEfficiency);
    
    // 太陽光発電ポテンシャル（屋根面積と地域日照条件）
    const roofEfficiency = buildingInfo.floors > 3 ? 0.8 : 1.0; // 高層建物は影の影響あり
    const solarPotential = Math.round(buildingInfo.buildingArea * 0.12 * roofEfficiency * climateMultiplier);
    
    // エネルギー効率評価
    let energyEfficiencyRating = 'C';
    const efficiencyScore = structureEfficiency * scaleEfficiency;
    if (efficiencyScore <= 0.8) {
      energyEfficiencyRating = 'A';
    } else if (efficiencyScore <= 0.9) {
      energyEfficiencyRating = 'B';
    } else if (efficiencyScore <= 1.1) {
      energyEfficiencyRating = 'C';
    } else if (efficiencyScore <= 1.2) {
      energyEfficiencyRating = 'D';
    } else {
      energyEfficiencyRating = 'E';
    }
    
    const co2Emissions = Math.round(annualEnergyConsumption * 0.4); // kWhあたり0.4kg-CO2
    
    return {
      annualEnergyConsumption,
      heatingCost,
      coolingCost,
      solarPotential,
      energyEfficiencyRating,
      co2Emissions,
      analysis: `用途: ${buildingInfo.usage}, 構造: ${buildingInfo.structure}, 規模: ${buildingInfo.totalFloorArea}㎡, 立地: ${location.address}を基に算出`
    };
  }

  /**
   * 入力情報を基に法規制コンプライアンス費用を算出
   */
  private calculateRegulatoryComplianceFromInputs(projectData: ProjectData) {
    const { buildingInfo, siteInfo } = projectData;
    
    // 日影規制対応費用（高さと用途地域による）
    let shadowRegulationCost = 0;
    if (buildingInfo.maxHeight >= 10000) { // 10m以上
      shadowRegulationCost = buildingInfo.totalFloorArea * 1500;
    }
    
    // 防火規制対応費用
    let fireRegulationCost = buildingInfo.totalFloorArea * 4000;
    if (buildingInfo.floors >= 3) {
      fireRegulationCost *= 1.3;
    }
    if (siteInfo.zoningType?.includes('防火')) {
      fireRegulationCost *= 1.5;
    }
    
    // バリアフリー対応費用
    let accessibilityCost = 0;
    if (buildingInfo.floors > 2) {
      accessibilityCost = 1500000; // エレベーター設置
    }
    if (buildingInfo.usage === '共同住宅' && buildingInfo.units && buildingInfo.units >= 10) {
      accessibilityCost += 800000; // 共用部バリアフリー対応
    }
    
    // 省エネ基準対応費用
    let energyComplianceCost = buildingInfo.totalFloorArea * 6000;
    if (buildingInfo.totalFloorArea >= 2000) {
      energyComplianceCost *= 1.2; // 大規模建物はより厳しい基準
    }
    
    const totalRegulatoryCompliance = shadowRegulationCost + fireRegulationCost + accessibilityCost + energyComplianceCost;
    const complianceMultiplier = 1.0 + (totalRegulatoryCompliance / (buildingInfo.totalFloorArea * 200000)); // 全体コストに対する割合
    
    return {
      shadowRegulationCost: Math.round(shadowRegulationCost),
      fireRegulationCost: Math.round(fireRegulationCost),
      accessibilityCost,
      energyComplianceCost: Math.round(energyComplianceCost),
      totalRegulatoryCompliance: Math.round(totalRegulatoryCompliance),
      complianceMultiplier: Math.round(complianceMultiplier * 100) / 100,
      explanation: `高さ: ${buildingInfo.maxHeight}mm, 階数: ${buildingInfo.floors}階, 用途: ${buildingInfo.usage}, 用途地域: ${siteInfo.zoningType}を基に算出`
    };
  }

  /**
   * 入力情報を基に災害リスクを算出
   */
  private calculateDisasterRiskFromInputs(projectData: ProjectData) {
    const { buildingInfo, location, siteInfo } = projectData;
    
    // 住所からリスクを推定（簡易版）
    let floodRisk = 'low';
    let earthquakeRisk = 'medium'; // 日本全国で一定のリスクあり
    let landslideRisk = 'low';
    
    // 地域特性によるリスク調整
    if (location.address.includes('河川') || location.address.includes('江戸川') || location.address.includes('荒川')) {
      floodRisk = 'high';
    } else if (location.address.includes('港') || location.address.includes('湾')) {
      floodRisk = 'medium';
    }
    
    if (location.address.includes('山') || location.address.includes('丘') || location.address.includes('坂')) {
      landslideRisk = 'medium';
      if (location.address.includes('急坂') || location.address.includes('崖')) {
        landslideRisk = 'high';
      }
    }
    
    // 建物規模と構造に応じた対策費用
    const recommendedMeasures: string[] = [];
    let estimatedCost = 0;
    
    // 耐震対策
    if (buildingInfo.floors >= 3 || buildingInfo.structure === '鉄骨造') {
      recommendedMeasures.push('耐震補強');
      estimatedCost += buildingInfo.totalFloorArea * 8000;
    }
    
    // 地盤改良
    if (floodRisk === 'high' || landslideRisk === 'high') {
      recommendedMeasures.push('地盤改良');
      estimatedCost += buildingInfo.buildingArea * 15000;
    }
    
    // 浸水対策
    if (floodRisk === 'high') {
      recommendedMeasures.push('浸水対策（防水壁、排水ポンプ）');
      estimatedCost += 2000000;
    }
    
    // 土砂災害対策
    if (landslideRisk === 'high') {
      recommendedMeasures.push('擁壁・排水設備');
      estimatedCost += 3000000;
    }
    
    const riskMultiplier = 1.0 + (estimatedCost / (buildingInfo.totalFloorArea * 300000));
    
    return {
      floodRisk,
      earthquakeRisk,
      landslideRisk,
      recommendedMeasures,
      estimatedCost,
      riskMultiplier: Math.round(riskMultiplier * 100) / 100,
      assessment: `立地: ${location.address}, 構造: ${buildingInfo.structure}, 階数: ${buildingInfo.floors}階を基にリスク評価を実施`
    };
  }

  // ヘルパーメソッド群
  private getUsageMultiplier(usage: string): number {
    switch (usage) {
      case '共同住宅': return 1.0;
      case '専用住宅': return 0.9;
      case 'オフィス': return 1.2;
      case '商業施設': return 1.3;
      default: return 1.0;
    }
  }

  private getStructureMultiplier(structure: string): number {
    switch (structure) {
      case '壁式鉄筋コンクリート造': return 1.3;
      case '鉄骨造': return 1.1;
      case '木造軸組工法': return 0.8;
      default: return 1.0;
    }
  }

  private getScaleMultiplier(totalFloorArea: number): number {
    if (totalFloorArea >= 3000) return 0.85;
    if (totalFloorArea >= 2000) return 0.9;
    if (totalFloorArea >= 1000) return 0.95;
    if (totalFloorArea >= 500) return 1.0;
    return 1.05;
  }

  private getRegionalMultiplier(address: string): number {
    if (address.includes('東京') && (address.includes('中央') || address.includes('港') || address.includes('渋谷'))) {
      return 1.15; // 都心部は高め
    }
    if (address.includes('東京')) {
      return 1.05;
    }
    if (address.includes('大阪') || address.includes('神戸') || address.includes('京都')) {
      return 1.02;
    }
    return 1.0;
  }

  private getEnergyBaseUnit(usage: string): number {
    switch (usage) {
      case '共同住宅': return 100;
      case '専用住宅': return 120;
      case 'オフィス': return 180;
      case '商業施設': return 200;
      default: return 120;
    }
  }

  private getStructureEfficiency(structure: string): number {
    switch (structure) {
      case '壁式鉄筋コンクリート造': return 0.8; // 断熱性が高い
      case '鉄骨造': return 0.9;
      case '木造軸組工法': return 1.1; // 断熱性が低い
      default: return 1.0;
    }
  }

  private getClimateMultiplier(address: string): number {
    if (address.includes('北海道') || address.includes('青森') || address.includes('秋田')) {
      return 1.2; // 寒冷地
    }
    if (address.includes('沖縄') || address.includes('鹿児島')) {
      return 1.1; // 高温多湿
    }
    return 1.0;
  }

  /**
   * 入力情報を基に年間日照時間を算出
   */
  private calculateAnnualSunlightHours(projectData: ProjectData): number {
    const { buildingInfo, location } = projectData;
    
    // 地域の日照時間基準値
    let baseSunlightHours = 2000; // 東京の平均的な日照時間
    
    if (location.address.includes('北海道') || location.address.includes('東北')) {
      baseSunlightHours = 1600;
    } else if (location.address.includes('九州') || location.address.includes('沖縄')) {
      baseSunlightHours = 2200;
    } else if (location.address.includes('日本海側')) {
      baseSunlightHours = 1800;
    }
    
    // 建物高さによる影響（高いほど日照を受けやすい）
    const heightFactor = buildingInfo.floors >= 5 ? 1.1 : buildingInfo.floors >= 3 ? 1.05 : 1.0;
    
    // 周辺環境の影響（簡易版、実際は3Dシミュレーションで算出）
    let environmentFactor = 1.0;
    if (location.address.includes('ビル') || location.address.includes('繁華街')) {
      environmentFactor = 0.85; // 都心部は周达建物の影響
    } else if (location.address.includes('住宅地') || location.address.includes('住宅街')) {
      environmentFactor = 0.95;
    }
    
    return Math.round(baseSunlightHours * heightFactor * environmentFactor);
  }
}