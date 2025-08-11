// 日影規制情報の型定義
export interface ShadowRegulation {
  targetArea: string           // 規制対象地域
  targetBuildings: string      // 規制対象建築物
  measurementHeight: string    // 測定面高さ
  measurementTime: string      // 測定時間帯
  range5to10m: string         // 5-10m範囲の許容時間
  rangeOver10m: string        // 10m超範囲の許容時間
  isLoading: boolean
  error?: string
}

export interface ZoningInfo {
  zoningType: string          // 用途地域
  buildingCoverageRatio: number // 建ぺい率
  floorAreaRatio: number      // 容積率
  heightLimit: string         // 高さ制限
  heightDistrict: string      // 高度地区
}

// 行政指導・要綱項目の型定義
export interface AdministrativeGuidanceItem {
  id: string // 内部ID（キャメルケース）
  name: string // 表示名
  description?: string // 説明
  isRequired: boolean // 必須かどうか
  applicableConditions?: string // 適用条件
}

// 最小限の一般的な規制データベース（建築基準法の最低基準）
const getDefaultRegulations = (): { zoning: Partial<ZoningInfo>, shadow: Partial<ShadowRegulation> } => ({
  zoning: {
    heightDistrict: '高度地区（要確認）',
  },
  shadow: {
    targetArea: '住居系地域（詳細要確認）',
    targetBuildings: '規制対象建築物（要確認）',
    measurementHeight: '測定面高さ（要確認）',
    measurementTime: '冬至日 午前8時〜午後4時（一般的）',
    range5to10m: '許容時間（要確認）',
    rangeOver10m: '許容時間（要確認）',
  }
})

// 住所から自治体名を抽出
function extractMunicipality(address: string): string | null {
  const patterns = [
    /([^\s]+区)/,
    /([^\s]+市)/,
    /([^\s]+町)/,
    /([^\s]+村)/
  ]
  
  for (const pattern of patterns) {
    const match = address.match(pattern)
    if (match) {
      return match[1]
    }
  }
  return null
}

// 都道府県を抽出する関数
function extractPrefecture(address: string): string | null {
  const prefecturePattern = /(東京都|北海道|(?:京都|大阪)府|(?:埼玉|千葉|神奈川|愛知|福岡|兵庫|静岡|茨城|広島|新潟|宮城|長野|岐阜|福島|群馬|栃木|岡山|三重|熊本|鹿児島|山口|愛媛|長崎|沖縄|滋賀|奈良|青森|岩手|秋田|山形|石川|富山|福井|山梨|和歌山|香川|徳島|高知|佐賀|大分|宮崎|島根|鳥取)県)/
  const match = address.match(prefecturePattern)
  return match ? match[1] : null
}

// Web検索と自然言語解析による規制情報の取得
async function analyzeRegulationWithAI(municipality: string, address: string): Promise<{ zoning: Partial<ZoningInfo>, shadow: Partial<ShadowRegulation>, administrativeGuidance: AdministrativeGuidanceItem[] }> {
  try {
    // 都道府県を抽出
    const prefecture = extractPrefecture(address)
    if (!prefecture) {
      console.warn('都道府県を特定できませんでした:', address)
    }
    
    // Step 1: Web検索で自治体の条例情報を取得
    const searchResults = await searchMunicipalityRegulations(municipality, address, prefecture)
    
    // Step 2: OpenAI APIで条例テキストを解析
    const analysisResult = await analyzeRegulationText(searchResults, municipality, address)
    
    return analysisResult
  } catch (error) {
    console.warn('Web検索に失敗、フォールバックデータを使用:', error)
    
    // フォールバック: 一般的な規制データを使用
    const baseData = getDefaultRegulations()

    // 住所ベースの基本的な推定（ハードコードを避けて一般的な値を使用）
    let enhancedData = { ...baseData }
    // 住宅系地域の一般的な用途地域を推定（具体的なエリア名は使用しない）
    if (address.includes('住宅地') || address.match(/\d+丁目|\d+-\d+/)) {
      enhancedData.zoning.zoningType = '住居系地域（詳細確認要）'
      enhancedData.zoning.buildingCoverageRatio = 60 // 一般的な住居系地域の標準値
      enhancedData.zoning.floorAreaRatio = 200 // 一般的な住居系地域の標準値
      enhancedData.zoning.heightLimit = '要確認'
    }

    // 最小限のデフォルト行政指導項目（一般的に必要となる項目のみ）
    const defaultAdministrativeGuidance: AdministrativeGuidanceItem[] = [
      {
        id: 'buildingGuidance',
        name: '建築確認申請',
        description: '建築基準法に基づく確認申請',
        isRequired: true,
        applicableConditions: 'すべての建築物'
      }
    ]

    return {
      ...enhancedData,
      administrativeGuidance: defaultAdministrativeGuidance
    }
  }
}

// Azure AI Services Bing Search Agentを使用して自治体の規制情報を取得
async function searchMunicipalityRegulations(municipality: string, _address: string, prefecture: string | null): Promise<string> {
  // 動的に検索クエリを生成（基本的な建築規制関連キーワードのみ）
  const baseKeywords = ['都市計画', '建築規制', '条例', 'site:*.go.jp OR site:*.lg.jp']
  const searchQueries = [
    `${municipality} ${baseKeywords.join(' ')}`
  ]
  
  let combinedResults = ''
  
  for (const query of searchQueries) {
    try {
      console.log(`検索中: ${query}`)
      
      // バックエンドのWeb検索APIを使用
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/websearch/regulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          query: query,
          prefecture: prefecture || '東京都', // デフォルトは東京都
          city: municipality,
        }),
      })

      if (response.ok) {
        const apiResponse = await response.json()
        console.log(`検索結果取得: ${apiResponse.success ? 'SUCCESS' : 'FAILED'}`)
        
        if (apiResponse.success && apiResponse.data) {
          const data = apiResponse.data
          let resultText = ''
          
          // 文字化けを修正する関数
          const sanitizeText = (text: string) => {
            return text
              .replace(/Ã¥Â®Â/g, '宅') // 文字化けした「宅」を修正
              .replace(/å®å°/g, '宅地') // 文字化けした「宅地」を修正
              .replace(/[^\x00-\x7F\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '') // 不正な文字を除去
          }
          
          // 都市計画情報
          if (data.urbanPlanning && Object.keys(data.urbanPlanning).length > 0) {
            resultText += `\n都市計画情報:\n`
            if (data.urbanPlanning.useDistrict) resultText += `用途地域: ${sanitizeText(data.urbanPlanning.useDistrict)}\n`
            if (data.urbanPlanning.buildingCoverageRatio) resultText += `建ぺい率: ${sanitizeText(data.urbanPlanning.buildingCoverageRatio)}\n`
            if (data.urbanPlanning.floorAreaRatio) resultText += `容積率: ${sanitizeText(data.urbanPlanning.floorAreaRatio)}\n`
            if (data.urbanPlanning.heightRestriction) resultText += `高度制限: ${sanitizeText(data.urbanPlanning.heightRestriction)}\n`
          }
          
          // 日影規制情報
          if (data.sunlightRegulation && Object.keys(data.sunlightRegulation).length > 0) {
            resultText += `\n日影規制:\n`
            if (data.sunlightRegulation.measurementHeight) resultText += `測定面: ${sanitizeText(data.sunlightRegulation.measurementHeight)}\n`
            if (data.sunlightRegulation.timeRange) resultText += `測定時間: ${sanitizeText(data.sunlightRegulation.timeRange)}\n`
            if (data.sunlightRegulation.shadowTimeLimit) resultText += `日影時間制限: ${sanitizeText(data.sunlightRegulation.shadowTimeLimit)}\n`
          }
          
          // 行政指導・要綱
          if (data.administrativeGuidance && data.administrativeGuidance.length > 0) {
            resultText += `\n行政指導・要綱:\n`
            data.administrativeGuidance.forEach((guidance: string) => {
              resultText += `- ${sanitizeText(guidance)}\n`
            })
          }
          
          if (resultText) {
            combinedResults += `\n=== ${query} ===\n${resultText}\n`
          }
        }
      } else {
        const errorText = await response.text()
        console.warn(`検索API応答エラー (${response.status}):`, errorText)
        
        // 401エラー（認証失敗）の場合は、以降の検索をスキップ
        if (response.status === 401) {
          console.warn('認証エラーのため、Web検索をスキップしてフォールバックデータを使用します')
          break
        }
      }
    } catch (error) {
      console.warn(`検索クエリ "${query}" でエラー:`, error)
    }
    
    // API制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return combinedResults || '検索結果を取得できませんでした'
}

// OpenAI APIで条例テキストを解析
async function analyzeRegulationText(searchText: string, municipality: string, address: string): Promise<{ zoning: Partial<ZoningInfo>, shadow: Partial<ShadowRegulation>, administrativeGuidance: AdministrativeGuidanceItem[] }> {
  const prompt = `
以下は「${municipality}」の建築規制・都市計画・行政指導に関するWeb検索結果です。この情報を解析して、「${address}」に適用される具体的な規制情報をJSON形式で回答してください。

検索結果:
${searchText}

回答形式（JSON）:
{
  "zoning": {
    "zoningType": "用途地域名",
    "buildingCoverageRatio": 建ぺい率の数値,
    "floorAreaRatio": 容積率の数値,
    "heightLimit": "高さ制限",
    "heightDistrict": "高度地区名"
  },
  "shadow": {
    "targetArea": "日影規制対象地域",
    "targetBuildings": "規制対象建築物",
    "measurementHeight": "測定面高さ",
    "measurementTime": "測定時間帯",
    "range5to10m": "5-10m範囲の許容時間",
    "rangeOver10m": "10m超範囲の許容時間"
  },
  "administrativeGuidance": [
    {
      "id": "urbanPlanningAct",
      "name": "都市計画法開発行為",
      "description": "1000㎡以上の開発行為に適用",
      "isRequired": false,
      "applicableConditions": "敷地面積1000㎡以上"
    },
    {
      "id": "buildingGuidance",
      "name": "建築指導要綱",
      "description": "自治体独自の建築指導",
      "isRequired": true,
      "applicableConditions": "すべての建築物"
    }
  ]
}

解析指針：
1. 都市計画情報の優先順位：
   - 都市計画図・用途地域図の情報を最優先
   - 自治体公式サイトの都市計画情報を重視
   - 建築基準法の一般規定を基準として活用

2. 用途地域別の標準的な数値：
   - 第一種住居地域：建ぺい率60%、容積率200%
   - 近隣商業地域：建ぺい率80%、容積率300%
   - 商業地域：建ぺい率80%、容積率400-800%
   - 工業地域：建ぺい率60%、容積率200%

3. 住所による推定：
   - 住宅地域や住居表示 → 住居系用途地域
   - 駅周辺・商店街 → 商業系用途地域
   - 工場地帯 → 工業系用途地域

4. 高度地区の推定：
   - 住居系地域 → 第二種高度地区が多い
   - 商業系地域 → 第三種高度地区や指定なしが多い

5. 行政指導・要綱の解析：
   - 自治体の公式サイトから具体的な要綱名を抽出
   - 建築物の規模・用途に応じた適用条件を判定
   - 必須項目と任意項目を区別
   - 一般的な行政指導項目：
     * 都市計画法開発行為（1000㎡以上）
     * 建築指導要綱（自治体独自）
     * みどりの条例（緑化義務）
     * 景観条例・景観計画
     * 中高層建築物に関する条例（3階以上）
     * 福祉環境整備要綱（バリアフリー）
     * 宅地造成規制
     * 盛土規制法

6. 情報が不足している場合：
   - 建築基準法の最低基準を適用
   - 類似地域の一般的な数値を参考
   - 保守的な数値を採用（より厳しい制限を仮定）
   - 一般的な行政指導項目を推定適用

注意：最終的な建築計画では必ず自治体への確認が必要である旨を含めること
`

  try {
    console.log('Azure OpenAI APIで条例テキストを解析中...')
    
    // Azure OpenAI API呼び出し
    const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || 'https://meiji-chatbot.openai.azure.com/'
    const deploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'
    const apiVersion = import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-12-01-preview'
    
    const response = await fetch(`${endpoint}openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': import.meta.env.VITE_AZURE_OPENAI_API_KEY || 'aaafe1f43e4445c0ab80ae152bc60cb4',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'あなたは建築法規の専門家です。自治体の条例や規制を正確に解析し、構造化された情報として提供してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''
      
      // JSONを抽出して解析
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const analysisResult = JSON.parse(jsonMatch[0])
        
        // administrativeGuidanceが存在しない場合は空配列を設定
        if (!analysisResult.administrativeGuidance) {
          analysisResult.administrativeGuidance = []
        }
        
        return analysisResult
      }
    }
    
    throw new Error('OpenAI APIからの応答解析に失敗')
  } catch (error) {
    console.error('OpenAI API解析エラー:', error)
    throw error
  }
}

// メイン関数：住所から規制情報を取得
export async function fetchRegulationInfo(address: string): Promise<{
  zoning: ZoningInfo,
  shadow: ShadowRegulation,
  administrativeGuidance: AdministrativeGuidanceItem[]
}> {
  try {
    console.log(`規制情報取得開始: ${address}`)
    const municipality = extractMunicipality(address)
    
    if (!municipality) {
      throw new Error('自治体を特定できませんでした')
    }

    console.log(`自治体特定: ${municipality}`)

    // AIによる規制情報解析（Web検索 + OpenAI解析）
    const analysisResult = await analyzeRegulationWithAI(municipality, address)

    return {
      zoning: {
        zoningType: analysisResult.zoning.zoningType || '用途地域不明',
        buildingCoverageRatio: analysisResult.zoning.buildingCoverageRatio || 60,
        floorAreaRatio: analysisResult.zoning.floorAreaRatio || 200,
        heightLimit: analysisResult.zoning.heightLimit || '要確認',
        heightDistrict: analysisResult.zoning.heightDistrict || '高度地区不明',
      },
      shadow: {
        targetArea: analysisResult.shadow.targetArea || '規制地域不明',
        targetBuildings: analysisResult.shadow.targetBuildings || '規制対象不明',
        measurementHeight: analysisResult.shadow.measurementHeight || '1.5m',
        measurementTime: analysisResult.shadow.measurementTime || '冬至日 午前8時〜午後4時',
        range5to10m: analysisResult.shadow.range5to10m || '3時間以内',
        rangeOver10m: analysisResult.shadow.rangeOver10m || '2時間以内',
        isLoading: false,
      },
      administrativeGuidance: analysisResult.administrativeGuidance || []
    }
  } catch (error) {
    return {
      zoning: {
        zoningType: '取得失敗',
        buildingCoverageRatio: 0,
        floorAreaRatio: 0,
        heightLimit: '要確認',
        heightDistrict: '取得失敗',
      },
      shadow: {
        targetArea: '情報取得に失敗しました',
        targetBuildings: '再度お試しください',
        measurementHeight: '-',
        measurementTime: '-',
        range5to10m: '-',
        rangeOver10m: '-',
        isLoading: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      },
      administrativeGuidance: []
    }
  }
}

// リアルタイム規制チェック（建物情報との照合）
export function checkRegulationCompliance(
  buildingInfo: any,
  shadowRegulation: ShadowRegulation
): {
  isCompliant: boolean,
  violations: string[],
  warnings: string[]
} {
  const violations: string[] = []
  const warnings: string[] = []

  // 高さチェック
  if (buildingInfo.maxHeight > 10000) { // 10m = 10000mm
    if (shadowRegulation.targetBuildings.includes('10m超')) {
      warnings.push('建物高さが10mを超えるため、日影規制の対象となります')
    }
  }

  // 軒高チェック（概算：最高高さの85%程度）
  const estimatedEaveHeight = buildingInfo.maxHeight * 0.85
  if (estimatedEaveHeight > 7000) { // 7m = 7000mm
    if (shadowRegulation.targetBuildings.includes('軒高7m超')) {
      warnings.push('軒高が7mを超える可能性があり、日影規制の対象となる場合があります')
    }
  }

  // 階数チェック
  if (buildingInfo.floors >= 3) {
    if (shadowRegulation.targetBuildings.includes('地上3階以上')) {
      warnings.push('地上3階以上の建物のため、日影規制の対象となります')
    }
  }

  return {
    isCompliant: violations.length === 0,
    violations,
    warnings
  }
}