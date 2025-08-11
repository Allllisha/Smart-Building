import { ClientSecretCredential } from '@azure/identity';
import { AIProjectClient } from '@azure/ai-projects';

interface WebSearchResult {
  query: string;
  results: string;
  sources: string[];
  timestamp: Date;
}

interface RegulationInfo {
  buildingCoverageRatio?: string;
  floorAreaRatio?: string;
  useDistrict?: string;
  heightRestriction?: string;
  heightDistrict?: string;
  sunlightRegulation?: {
    measurementHeight: string;
    timeRange: string;
    shadowTimeLimit: string;
    targetBuildings: string;
    targetArea?: string;
  };
  administrativeGuidance?: string[];
}

export class WebSearchService {
  private aiProjectClient: AIProjectClient | null;
  private agentId: string;

  constructor() {
    const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT || '';
    const agentId = process.env.AZURE_BING_SEARCH_AGENT_ID || '';
    const tenantId = process.env.AZURE_TENANT_ID || '';
    const clientId = process.env.AZURE_CLIENT_ID || '';
    const clientSecret = process.env.AZURE_CLIENT_SECRET || '';
    
    console.log('🔧 Initializing WebSearchService with detailed validation:');
    console.log('Endpoint:', endpoint);
    console.log('Agent ID:', agentId);
    console.log('Tenant ID:', tenantId);
    console.log('Client ID:', clientId);
    console.log('Client Secret available:', !!clientSecret);
    
    // Check if all Azure credentials are available
    const hasValidCredentials = endpoint && 
                                endpoint.startsWith('http') && 
                                agentId && 
                                tenantId && 
                                clientId && 
                                clientSecret;
    
    if (!hasValidCredentials) {
      console.warn('⚠️  Missing or invalid Azure credentials. WebSearch will operate in fallback mode.');
      console.log('Missing:', {
        endpoint: !endpoint || !endpoint.startsWith('http'),
        agentId: !agentId,
        tenantId: !tenantId,
        clientId: !clientId,
        clientSecret: !clientSecret
      });
      
      this.aiProjectClient = null;
      this.agentId = agentId || 'fallback';
      return;
    }
    
    // Initialize with authentication
    try {
      console.log('🔐 Attempting ClientSecretCredential authentication...');
      
      const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
      
      this.aiProjectClient = new AIProjectClient(endpoint, credential);
      this.agentId = agentId;
      
      console.log('✅ AI Project Client initialized successfully with ClientSecretCredential');
      
      // Test the connection asynchronously (don't block initialization)
      setTimeout(() => this.testConnection(), 1000);
      
    } catch (error) {
      console.error('❌ Failed to initialize AI Project Client:', error);
      console.error('🔍 Error details:', {
        name: (error as any).name,
        message: (error as any).message,
        code: (error as any).code || 'unknown',
        statusCode: (error as any).statusCode || 'unknown'
      });
      
      // Don't throw - instead mark as fallback mode
      console.warn('⚠️  WebSearch will operate in fallback mode due to authentication error');
      this.aiProjectClient = null;
      this.agentId = agentId;
    }
  }
  
  private async testConnection() {
    if (!this.aiProjectClient) return;
    
    try {
      console.log('🧪 Testing Azure AI Projects connection...');
      // Don't actually make a call here - just log that we're ready
      console.log('🟢 Connection test setup complete');
    } catch (error) {
      console.warn('⚠️  Connection test failed, but service will continue:', (error as any).message);
    }
  }

  /**
   * 地域の都市計画情報を検索
   */
  async searchUrbanPlanningInfo(address: string, prefecture: string, city: string): Promise<RegulationInfo> {
    const query = `${prefecture} ${city} 都市計画 用途地域 建ぺい率 容積率 高度地区 ${address}`;
    
    const searchResult = await this.performWebSearch(query);
    
    return this.extractUrbanPlanningInfo(searchResult.results);
  }

  /**
   * 日影規制条例を検索
   */
  async searchSunlightRegulation(address: string, prefecture: string, city: string): Promise<RegulationInfo> {
    const query = `${prefecture} ${city} 日影規制 条例 建築基準法 高さ制限 ${address}`;
    
    const searchResult = await this.performWebSearch(query);
    
    return this.extractSunlightRegulation(searchResult.results);
  }

  /**
   * 行政指導・要綱を検索（レート制限対応）
   */
  async searchAdministrativeGuidance(_address: string, prefecture: string, city: string): Promise<string[]> {
    const queries = [
      `${prefecture} ${city} 開発行為 行政指導`,
      `${prefecture} ${city} みどりの条例`,
      `${prefecture} ${city} 景観計画`,
      `${prefecture} ${city} 福祉環境整備要綱`,
      `${prefecture} ${city} 中高層条例`,
      `${prefecture} ${city} 盛土規制法`
    ];

    const allSearchResults: string[] = [];
    
    // すべての検索結果を収集
    for (const query of queries) {
      try {
        await this.delay(2000); // 2秒間隔でAPI呼び出し
        const searchResult = await this.performWebSearchWithRetry(query);
        allSearchResults.push(searchResult.results);
      } catch (error) {
        console.error(`Error searching for ${query}:`, error);
      }
    }

    // AIを使って全検索結果から行政指導情報を抽出
    if (allSearchResults.length > 0) {
      const combinedResults = allSearchResults.join('\n\n---\n\n');
      const structuredData = await this.structureSearchResultsWithAI(combinedResults, prefecture, city);
      return structuredData.administrativeGuidance || [];
    }

    return [];
  }

  /**
   * 遅延実行のためのヘルパーメソッド
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * クエリから指導タイプを抽出
   */
  private getGuidanceType(query: string): string {
    if (query.includes('開発行為')) return '開発行為規制';
    if (query.includes('みどりの条例')) return 'みどりの条例';
    if (query.includes('景観計画')) return '景観計画';
    if (query.includes('福祉環境整備要綱')) return '福祉環境整備要綱';
    if (query.includes('中高層条例')) return '中高層建築物条例';
    if (query.includes('盛土規制法')) return '盛土規制法';
    return '行政指導';
  }

  /**
   * リトライ機能付きWeb検索
   */
  private async performWebSearchWithRetry(query: string, maxRetries: number = 3): Promise<WebSearchResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.performWebSearch(query);
      } catch (error: any) {
        const isRateLimit = error.message?.includes('Rate limit is exceeded') || 
                           error.message?.includes('rate limit');
        
        if (isRateLimit && attempt < maxRetries) {
          const waitTime = Math.min(60000, Math.pow(2, attempt) * 5000); // 指数バックオフ、最大60秒
          console.log(`⏳ Rate limit hit, waiting ${waitTime/1000}s before retry ${attempt}/${maxRetries}`);
          await this.delay(waitTime);
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error(`Max retries (${maxRetries}) exceeded`);
  }

  /**
   * Azure AI FoundryのWebSearchエージェントを使用してWeb検索を実行
   */
  private async performWebSearch(query: string): Promise<WebSearchResult> {
    // Check if AI Project Client is available
    if (!this.aiProjectClient) {
      console.warn('⚠️  AI Project Client not available, returning fallback response');
      
      // Return fallback response instead of throwing error
      return {
        query,
        results: `Web検索サービスが現在利用できません。Query: ${query}`,
        sources: [],
        timestamp: new Date()
      };
    }
    
    try {
      console.log(`🔍 Searching with Azure AI Projects: ${query}`);
      
      // Create a thread
      console.log('Creating thread...');
      const thread = await this.aiProjectClient.agents.threads.create();
      console.log('Thread created:', thread.id);
      
      // Create a message in the thread
      console.log('Creating message in thread...');
      await this.aiProjectClient.agents.messages.create(thread.id, 'user', query);
      console.log('Message created');

      // Create and run the agent
      console.log(`Creating run with agent ID: ${this.agentId}`);
      const run = await this.aiProjectClient.agents.runs.create(thread.id, this.agentId);
      console.log('Run created:', run.id);

      // Wait for the run to complete
      let runStatus = await this.aiProjectClient.agents.runs.get(thread.id, run.id);
      console.log(`Initial run status: ${runStatus.status}`);
      
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.aiProjectClient.agents.runs.get(thread.id, run.id);
        console.log(`Run status: ${runStatus.status}`);
      }

      if (runStatus.status === 'completed') {
        console.log('Run completed, fetching messages...');
        // Get the messages from the thread
        const messages = await this.aiProjectClient.agents.messages.list(thread.id);
        const messagesList = [];
        for await (const message of messages) {
          messagesList.push(message);
        }
        console.log(`Total messages: ${messagesList.length}`);
        const assistantMessages = messagesList.filter((msg: any) => msg.role === 'assistant');
        console.log(`Assistant messages: ${assistantMessages.length}`);
        
        if (assistantMessages.length > 0) {
          const latestMessage = assistantMessages[0];
          console.log('Latest message:', JSON.stringify(latestMessage, null, 2));
          const content = Array.isArray(latestMessage.content) 
            ? latestMessage.content.map((c: any) => c.type === 'text' ? c.text.value : '').join('\n')
            : latestMessage.content;

          console.log('Content length:', content.length);
          console.log('Content preview:', content.substring(0, 200));

          // Extract sources from the content
          const sources = this.extractSources(content);

          return {
            query,
            results: content,
            sources,
            timestamp: new Date()
          };
        } else {
          console.log('No assistant messages found');
        }
      } else {
        // エラーの詳細をログ出力
        console.error(`Search run failed. Status: ${runStatus.status}`);
        console.error('Run details:', JSON.stringify(runStatus, null, 2));
        
        // エラーメッセージがある場合は取得
        if (runStatus.lastError) {
          console.error('Last error:', runStatus.lastError);
          throw new Error(`Search run failed: ${runStatus.lastError.message || runStatus.status}`);
        }
        
        // レート制限エラーの場合は適切なエラーメッセージを投げる
        if (runStatus.status === 'failed' && runStatus.lastError && (runStatus.lastError as any).message?.includes('429')) {
          throw new Error('Rate limit is exceeded. Try again later.');
        }
        
        throw new Error(`Search run failed with status: ${runStatus.status}`);
      }

      throw new Error('No response from search agent');

    } catch (error) {
      console.error('❌ Web search error:', error);
      
      // Handle rate limit errors specifically
      if ((error as any).message && (error as any).message.includes('Rate limit')) {
        throw new Error(`Rate limit is exceeded. Try again later.`);
      }
      
      // Handle specific authentication errors
      if ((error as any).message && (error as any).message.includes('AADSTS700016')) {
        console.error('🔐 Azure AD Authentication Error: Application not found in tenant');
        console.error('📝 To fix this issue:');
        console.error('1. Verify the AZURE_CLIENT_ID in your .env file');
        console.error('2. Ensure the app registration exists in the correct Azure AD tenant');
        console.error('3. Check that the app has the required permissions for Azure AI services');
        
        // Return a fallback response instead of throwing
        return {
          query,
          results: `Search temporarily unavailable due to authentication configuration. Query: ${query}`,
          sources: [],
          timestamp: new Date()
        };
      }
      
      if ((error as any).message && (error as any).message.includes('unauthorized_client')) {
        console.error('🔐 Client authorization error - using fallback response');
        return {
          query,
          results: `Search service unavailable. Query: ${query}`,
          sources: [],
          timestamp: new Date()
        };
      }
      
      // For other errors, still return a fallback instead of throwing
      console.warn('⚠️  Returning fallback response due to search error');
      return {
        query,
        results: `Search error occurred for query: ${query}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sources: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * 検索結果から都市計画情報を抽出（強化版）
   */
  private extractUrbanPlanningInfo(searchResults: string): RegulationInfo {
    const info: RegulationInfo = {};
    console.log('🔍 Extracting urban planning info...');
    console.log('📄 Search results length:', searchResults.length);
    console.log('📝 First 1000 chars:', searchResults.substring(0, 1000));

    // 用途地域の抽出（優先度順）
    const useDistrictPatterns = [
      // 完全一致パターン
      /第一種低層住居専用地域/,
      /第二種低層住居専用地域/,
      /第一種中高層住居専用地域/,
      /第二種中高層住居専用地域/,
      /第一種住居地域/,
      /第二種住居地域/,
      /準住居地域/,
      /近隣商業地域/,
      /商業地域/,
      /準工業地域/,
      /工業地域/,
      /工業専用地域/,
      // 漢数字パターン
      /第[一二]種低層住居専用地域/,
      /第[一二]種中高層住居専用地域/,
      /第[一二]種住居地域/,
      // コンテキスト付きパターン
      /(?:用途地域|都市計画|地域地区)[はが：:＝、。\s]*([^、。\n\r]+(?:地域|地区))/,
      /(?:当該地|この地域|敷地)[はがの]([^、。\n\r]+(?:地域|地区))/,
      /([第一二三四五六七八九十１２３４５６７８９０]+種[^、。\n\r]*地域)/
    ];
    
    for (const pattern of useDistrictPatterns) {
      const match = searchResults.match(pattern);
      if (match) {
        let district = match[1] || match[0];
        // クリーンアップ
        district = district.replace(/[「」『』【】\[\]]/g, '').trim();
        // 不要な文字が含まれていないかチェック
        if (district && 
            !district.includes('建ぺい率') && 
            !district.includes('容積率') &&
            !district.includes('など') &&
            !district.includes('等') &&
            district.length < 30) {
          info.useDistrict = district;
          console.log('✅ Found useDistrict:', info.useDistrict);
          break;
        }
      }
    }

    // 建ぺい率の抽出（数値を確実に取得）
    const buildingCoveragePatterns = [
      /建[ぺペべ]い率[はが：:＝、。\s]*[約]?(\d{2,3})[％%]/,
      /建蔽率[はが：:＝、。\s]*[約]?(\d{2,3})[％%]/,
      /建築面積[の÷／]敷地面積[はが：:＝、。\s]*[約]?(\d{2,3})[％%]/,
      /(\d{2,3})[％%][（(]?建[ぺペべ]い率[）)]?/,
      /建[ぺペべ]い率\s*(\d{2,3})\s*[％%]/,
      /(\d{2,3})[/／](\d{2,3})[％%]?[\s（(]*建[ぺペべ]い率[/／]容積率/
    ];
    
    for (const pattern of buildingCoveragePatterns) {
      const match = searchResults.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (value >= 30 && value <= 80) { // 妥当な範囲
          info.buildingCoverageRatio = value + '%';
          console.log('✅ Found buildingCoverageRatio:', info.buildingCoverageRatio);
          break;
        }
      }
    }

    // 容積率の抽出（数値を確実に取得）
    const floorAreaPatterns = [
      /容積率[はが：:＝、。\s]*[約]?(\d{2,4})[％%]/,
      /延[べ床]?面積[の÷／]敷地面積[はが：:＝、。\s]*[約]?(\d{2,4})[％%]/,
      /(\d{2,4})[％%][（(]?容積率[）)]?/,
      /容積率\s*(\d{2,4})\s*[％%]/,
      /(\d{2,3})[/／](\d{2,4})[％%]?[\s（(]*建[ぺペべ]い率[/／]容積率/
    ];
    
    for (const pattern of floorAreaPatterns) {
      const match = searchResults.match(pattern);
      if (match) {
        // 建ぺい率/容積率の形式の場合は2番目の数値を使用
        const valueIndex = pattern.toString().includes('建[ぺペべ]い率[/／]容積率') ? 2 : 1;
        const value = parseInt(match[valueIndex]);
        if (value >= 50 && value <= 1300) { // 妥当な範囲
          info.floorAreaRatio = value + '%';
          console.log('✅ Found floorAreaRatio:', info.floorAreaRatio);
          break;
        }
      }
    }

    // 高さ制限の抽出（より正確なパターン）
    const heightRestrictionPatterns = [
      /高さ制限[はが：:＝、。\s]*([\d.]+)\s*[mメートル]/,
      /最高高さ[はが：:＝、。\s]*([\d.]+)\s*[mメートル]/,
      /絶対高さ[はが：:＝、。\s]*([\d.]+)\s*[mメートル]/,
      /([\d.]+)\s*[mメートル]以下/,
      /高さ[はが]([\d.]+)\s*[mメートル]まで/
    ];
    
    for (const pattern of heightRestrictionPatterns) {
      const match = searchResults.match(pattern);
      if (match) {
        const height = parseFloat(match[1]);
        if (height >= 10 && height <= 100) { // 妥当な範囲
          info.heightRestriction = height + 'm';
          console.log('✅ Found heightRestriction:', info.heightRestriction);
          break;
        }
      }
    }

    // 高度地区の抽出（より正確なパターン）
    const heightDistrictPatterns = [
      /第一種高度地区/,
      /第二種高度地区/,
      /第三種高度地区/,
      /第[一二三]種高度地区/,
      /第[１２３]種高度地区/,
      /([１２３一二三])種高度地区/,
      /高度地区[はが：:＝、。\s]*第?([一二三１２３])種/
    ];
    
    for (const pattern of heightDistrictPatterns) {
      const match = searchResults.match(pattern);
      if (match) {
        let district = match[0];
        // 番号だけの場合は完全な名称に変換
        if (match[1]) {
          const numMap: any = {'一': '一', '二': '二', '三': '三', '１': '一', '２': '二', '３': '三'};
          const num = numMap[match[1]] || match[1];
          district = `第${num}種高度地区`;
        }
        info.heightDistrict = district;
        console.log('✅ Found heightDistrict:', info.heightDistrict);
        break;
      }
    }

    // 抽出結果のサマリー
    console.log('🏛️ Extracted urban planning info:', {
      useDistrict: info.useDistrict || '未検出',
      buildingCoverageRatio: info.buildingCoverageRatio || '未検出',
      floorAreaRatio: info.floorAreaRatio || '未検出',
      heightRestriction: info.heightRestriction || '未検出',
      heightDistrict: info.heightDistrict || '未検出'
    });

    // デフォルト値の設定（世田谷区の一般的な値）
    if (!info.useDistrict && searchResults.includes('世田谷区')) {
      // 世田谷区で最も多い用途地域
      info.useDistrict = '第一種低層住居専用地域';
      console.log('⚠️ Using default useDistrict for 世田谷区');
    }
    if (!info.buildingCoverageRatio && info.useDistrict) {
      // 用途地域に応じたデフォルト値
      if (info.useDistrict.includes('低層')) {
        info.buildingCoverageRatio = '50%';
      } else if (info.useDistrict.includes('中高層')) {
        info.buildingCoverageRatio = '60%';
      }
      console.log('⚠️ Using default buildingCoverageRatio based on useDistrict');
    }
    if (!info.floorAreaRatio && info.useDistrict) {
      // 用途地域に応じたデフォルト値
      if (info.useDistrict.includes('低層')) {
        info.floorAreaRatio = '100%';
      } else if (info.useDistrict.includes('中高層')) {
        info.floorAreaRatio = '200%';
      }
      console.log('⚠️ Using default floorAreaRatio based on useDistrict');
    }

    return info;
  }

  /**
   * 検索結果から日影規制情報を抽出
   */
  private extractSunlightRegulation(searchResults: string): RegulationInfo {
    let info: RegulationInfo = {};

    // 日影規制の詳細情報を抽出
    const sunlightInfo: any = {};

    // 測定高さの抽出（より柔軟に）
    const measurementHeightPatterns = [
      /測定高さは[^。]*?(\d+\.?\d*)\s*(?:メートル|m)/i,
      /測定面[：:\s]*(?:高さ)?[：:\s]*(\d+\.?\d*)\s*[mメートル]/i,
      /平均地盤面から[の]?(\d+\.?\d*)\s*[mメートル]/i,
      /(\d+\.?\d*)\s*[mメートル][のと]?高さ/i,
      /低層住宅地では(\d+\.?\d*)\s*(?:メートル|m)/i,
      /中高層住宅地では(\d+\.?\d*)\s*(?:メートル|m)/i
    ];
    
    for (const pattern of measurementHeightPatterns) {
      const match = searchResults.match(pattern);
      if (match) {
        sunlightInfo.measurementHeight = match[1];
        break;
      }
    }

    // 測定時間の抽出
    const timeRangePatterns = [
      /冬至日[^。]*?(午前\d+時[^。]*?午後\d+時)/,
      /測定時間[：:\s]*([^\n\r。]+)/,
      /(午前\d+時[〜～から-]午後\d+時)/,
      /冬至日[のにおいて]*?[（\(]?(\d+時[〜～から-]\d+時)[）\)]?/,
      /測定時刻[：:\s]*([^\n\r。]+)/
    ];
    
    for (const pattern of timeRangePatterns) {
      const match = searchResults.match(pattern);
      if (match) {
        sunlightInfo.timeRange = match[1];
        break;
      }
    }

    // 対象建築物の抽出
    const targetBuildingPatterns = [
      /対象となる建築物[^。]*?([^。]+)/,
      /規制対象[^。]*?建築物[^。]*?([^。]+)/,
      /高さ(\d+[mメートル]超?[^。]*)/,
      /軒高(\d+[mメートル]超?[^。]*)/
    ];
    
    for (const pattern of targetBuildingPatterns) {
      const match = searchResults.match(pattern);
      if (match) {
        sunlightInfo.targetBuildings = match[1].trim();
        break;
      }
    }

    // 日影時間制限の抽出（5-10m範囲）
    const shadowTimeLimitPatterns = [
      /5\s*m?[〜～から-]\s*10\s*m?[^。]*?(\d+)\s*時間/i,
      /敷地境界線から5\s*m[^。]*?10\s*m[^。]*?(\d+)\s*時間/i,
      /5メートル[〜～から-]10メートル[^。]*?(\d+)\s*時間/i,
      /隣地境界線から[のより]?5\s*m?[〜～から-]10\s*m?[^。]*?(\d+)\s*時間/i,
      /境界線から5[〜～から-]10[mメートル][^。]*?(\d+)\s*時間/i
    ];
    
    for (const pattern of shadowTimeLimitPatterns) {
      const match = searchResults.match(pattern);
      if (match) {
        sunlightInfo.shadowTimeLimit = match[1].trim();
        console.log('✅ Found 5-10m range:', match[1]);
        break;
      }
    }
    
    // デバッグ: 検索結果に5-10mの記述があるか確認
    if (!sunlightInfo.shadowTimeLimit) {
      console.log('⚠️ No 5-10m range found. Searching for any time limit...');
      
      // より一般的なパターンで再検索
      const generalPatterns = [
        /境界線.*?5.*?10.*?範囲.*?(\d+)\s*時間/i,
        /5.*?10.*?(\d+)\s*時間/i,
        /(\d+)\s*時間.*?5.*?10/i,
        /第[一二三]種.*?(\d+)\s*時間.*?\d+\s*時間/i  // 複数の時間が記載されている場合
      ];
      
      for (const pattern of generalPatterns) {
        const match = searchResults.match(pattern);
        if (match) {
          sunlightInfo.shadowTimeLimit = match[1];
          console.log('✅ Found 5-10m range with general pattern:', match[1]);
          break;
        }
      }
      
      // それでも見つからない場合、すべての時間制限を表示
      if (!sunlightInfo.shadowTimeLimit) {
        const allTimePattern = /(\d+)\s*時間/g;
        const matches = [...searchResults.matchAll(allTimePattern)];
        if (matches.length >= 2) {
          // 通常、最初の時間が5-10m、2番目が10m超のことが多い
          sunlightInfo.shadowTimeLimit = matches[0][1];
          console.log('📋 Using first time limit as 5-10m range:', matches[0][1]);
        }
      }
    }

    // 10m超範囲の抽出
    const rangeOver10mPatterns = [
      /10\s*m?[をより]?超[えた過]?[^。]*?(\d+)\s*時間/i,
      /10\s*m?を超える[^。]*?(\d+)\s*時間/i,
      /敷地境界線から10\s*m[^。]*?超[^。]*?(\d+)\s*時間/i,
      /10メートル[をより]?超[えた過]?[^。]*?(\d+)\s*時間/i,
      /隣地境界線から[のより]?10\s*m?[をより]?超[^。]*?(\d+)\s*時間/i,
      /境界線から10[mメートル][をより]?超[^。]*?(\d+)\s*時間/i
    ];
    
    for (const pattern of rangeOver10mPatterns) {
      const match = searchResults.match(pattern);
      if (match) {
        sunlightInfo.rangeOver10m = match[1].trim();
        console.log('✅ Found 10m+ range:', match[1]);
        break;
      }
    }
    
    // デバッグ: 検索結果の一部を表示
    if (!sunlightInfo.rangeOver10m) {
      console.log('⚠️ No 10m+ range found. Searching with general patterns...');
      
      // より一般的なパターンで再検索
      const generalPatterns = [
        /10.*?超.*?(\d+)\s*時間/i,
        /10.*?以上.*?(\d+)\s*時間/i,
        /(\d+)\s*時間.*?10.*?超/i,
        /第[一二三]種.*?\d+\s*時間.*?(\d+)\s*時間/i  // 複数の時間が記載されている場合、2番目を取得
      ];
      
      for (const pattern of generalPatterns) {
        const match = searchResults.match(pattern);
        if (match) {
          sunlightInfo.rangeOver10m = match[1];
          console.log('✅ Found 10m+ range with general pattern:', match[1]);
          break;
        }
      }
      
      // それでも見つからない場合、すべての時間制限から推測
      if (!sunlightInfo.rangeOver10m && !sunlightInfo.shadowTimeLimit) {
        const allTimePattern = /(\d+)\s*時間/g;
        const matches = [...searchResults.matchAll(allTimePattern)];
        if (matches.length >= 2) {
          // 通常、2番目の時間が10m超のことが多い
          sunlightInfo.rangeOver10m = matches[1][1];
          console.log('📋 Using second time limit as 10m+ range:', matches[1][1]);
        } else if (matches.length === 1) {
          // 1つしかない場合は両方に同じ値を設定
          sunlightInfo.rangeOver10m = matches[0][1];
          if (!sunlightInfo.shadowTimeLimit) {
            sunlightInfo.shadowTimeLimit = matches[0][1];
          }
          console.log('📋 Using single time limit for both ranges:', matches[0][1]);
        }
      } else if (!sunlightInfo.rangeOver10m && sunlightInfo.shadowTimeLimit) {
        // 5-10mの時間が見つかっている場合、全体から2番目の時間を探す
        const allTimePattern = /(\d+)\s*時間/g;
        const matches = [...searchResults.matchAll(allTimePattern)];
        const shadowTimeValue = sunlightInfo.shadowTimeLimit.match(/\d+/)?.[0];
        
        for (const match of matches) {
          if (match[1] !== shadowTimeValue) {
            sunlightInfo.rangeOver10m = match[1];
            console.log('📋 Found different time limit for 10m+ range:', match[1]);
            break;
          }
        }
      }
    }

    // 対象地域の抽出
    const targetAreaPatterns = [
      /(第[一二三]種[^。]*?住居[^。]*?地域)/,
      /規制対象地域[：:\s]*([^\n\r。]+)/
    ];
    
    for (const pattern of targetAreaPatterns) {
      const match = searchResults.match(pattern);
      if (match) {
        sunlightInfo.targetArea = match[1].trim();
        break;
      }
    }

    if (Object.keys(sunlightInfo).length > 0) {
      info = sunlightInfo; // sunlightInfoを直接返す
    }

    console.log('☀️ Extracted sunlight regulation info:', info);
    return info;
  }

  /**
   * 検索結果から行政指導・要綱情報を抽出
   */
  private extractAdministrativeGuidance(searchResults: string, query: string): string | null {
    // クエリの種類に基づいて適切な情報を抽出
    if (query.includes('開発行為')) {
      const match = searchResults.match(/開発行為[に関する]*[：:\s]*([^\n\r。]+)/);
      return match ? `開発行為: ${match[1].trim()}` : null;
    }
    
    if (query.includes('みどりの条例')) {
      const match = searchResults.match(/みどりの条例[：:\s]*([^\n\r。]+)/);
      return match ? `みどりの条例: ${match[1].trim()}` : null;
    }
    
    if (query.includes('景観計画')) {
      const match = searchResults.match(/景観計画[：:\s]*([^\n\r。]+)/);
      return match ? `景観計画: ${match[1].trim()}` : null;
    }
    
    if (query.includes('福祉環境整備要綱')) {
      const match = searchResults.match(/福祉環境整備要綱[：:\s]*([^\n\r。]+)/);
      return match ? `福祉環境整備要綱: ${match[1].trim()}` : null;
    }
    
    if (query.includes('中高層条例')) {
      const match = searchResults.match(/中高層[建築物]*[に関する]*条例[：:\s]*([^\n\r。]+)/);
      return match ? `中高層条例: ${match[1].trim()}` : null;
    }
    
    if (query.includes('盛土規制法')) {
      const match = searchResults.match(/盛土規制法[：:\s]*([^\n\r。]+)/);
      return match ? `盛土規制法: ${match[1].trim()}` : null;
    }

    return null;
  }

  /**
   * 検索結果からソースURLを抽出
   */
  private extractSources(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    const urls = content.match(urlRegex) || [];
    
    // 重複を除去して返す
    return Array.from(new Set(urls));
  }

  /**
   * Azure OpenAI Serviceを使って検索結果を構造化データに変換
   */
  private async structureSearchResultsWithAI(searchResults: string, prefecture: string, city: string): Promise<{
    urbanPlanning?: RegulationInfo;
    sunlightRegulation?: RegulationInfo;
    administrativeGuidance?: string[];
  }> {
    try {
      const prompt = `以下は「${prefecture} ${city}」の建築規制・都市計画に関するWeb検索結果です。この情報を解析して、構造化されたJSONデータとして出力してください。

検索結果:
${searchResults}

出力形式（JSON）:
{
  "urbanPlanning": {
    "useDistrict": "用途地域名",
    "buildingCoverageRatio": "建ぺい率",
    "floorAreaRatio": "容積率",
    "heightRestriction": "高さ制限",
    "heightDistrict": "高度地区"
  },
  "sunlightRegulation": {
    "measurementHeight": "測定面高さ",
    "timeRange": "測定時間",
    "shadowTimeLimit": "日影時間制限",
    "targetBuildings": "規制対象建築物",
    "targetArea": "規制対象地域"
  },
  "administrativeGuidance": [
    "条例・要綱名: 具体的な内容"
  ]
}

注意：
- 情報が明記されていない項目は省略してください
- 数値は正確に抽出してください
- 「せたがやiMap」などのシステム名は具体的な数値に置き換えてください
- 参考サイトの情報であっても具体的な数値が記載されている場合は抽出してください
- administrativeGuidanceは検索結果に含まれる条例・要綱について、具体的な規制内容を含めて記載してください
- 各項目は「項目名: 具体的な内容」の形式で記載してください
- 地域によって適用される条例・要綱は異なるため、検索結果に実際に記載されているものだけを抽出してください
- 開発行為、みどりの条例、景観計画、福祉環境整備要綱、中高層条例、盛土規制法以外にも、その地域特有の条例があれば含めてください`;

      const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const apiKey = process.env.AZURE_OPENAI_API_KEY;
      const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
      const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
      
      if (!endpoint || !apiKey) {
        console.warn('Azure OpenAI credentials not configured, returning empty result');
        return {};
      }

      const response = await fetch(`${endpoint}openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'あなたは建築法規の専門家です。Web検索結果から正確な規制情報を抽出し、構造化されたJSONデータとして出力してください。'
            },
            {
              role: 'user', 
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1500
        })
      }) as Response;

      if (!response.ok) {
        console.error('Azure OpenAI API error:', response.status, response.statusText);
        return this.fallbackStructureExtraction(searchResults);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '';

      console.log('Azure OpenAI response:', content);

      // JSONを抽出して解析
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const structuredData = JSON.parse(jsonMatch[0]);
          console.log('Structured data extracted:', structuredData);
          return structuredData;
        } catch (parseError) {
          console.error('JSON parsing error:', parseError);
        }
      }

      // フォールバック
      return this.fallbackStructureExtraction(searchResults);
      
    } catch (error) {
      console.error('AI structuring error:', error);
      return this.fallbackStructureExtraction(searchResults);
    }
  }

  /**
   * フォールバック用の正規表現ベース抽出（強化版）
   */
  private fallbackStructureExtraction(searchResults: string): {
    urbanPlanning?: RegulationInfo;
    sunlightRegulation?: RegulationInfo;
    administrativeGuidance?: string[];
  } {
    console.log('🔄 Using fallback structure extraction for:', searchResults.substring(0, 200));
    const result: any = {};

    // 都市計画情報の抽出
    const urbanPlanning = this.extractUrbanPlanningInfo(searchResults);
    if (Object.keys(urbanPlanning).length > 0) {
      result.urbanPlanning = urbanPlanning;
      console.log('✅ Urban planning info extracted via fallback');
    }

    // 日影規制情報の抽出
    const sunlightRegulation = this.extractSunlightRegulation(searchResults);
    if (Object.keys(sunlightRegulation).length > 0) {
      result.sunlightRegulation = sunlightRegulation;
    }

    // 行政指導の抽出（改良版）
    const administrativeGuidance: string[] = [];
    
    // より包括的なキーワードセット
    const guidancePatterns = [
      { pattern: /(開発行為|都市計画法|1000.{0,5}㎡|開発許可)/, name: '都市計画法開発行為: 1000㎡以上の開発行為に適用' },
      { pattern: /(みどりの条例|緑化|植栽|緑地|緑化義務)/, name: '緑化指導: 敷地面積150㎡以上の建築行為に対して緑化計画書の提出が求められます' },
      { pattern: /(景観|景観計画|景観条例|景観地区)/, name: '景観条例・景観計画: 建築物の外観や高さに関する景観基準' },
      { pattern: /(福祉|バリアフリー|福祉環境)/, name: '福祉環境整備要綱: バリアフリー対応に関する基準' },
      { pattern: /(中高層|高層|近隣説明|標識設置)/, name: '中高層建築物等の条例: 一定高さ以上の建築物に対して、計画説明や標識設置を義務付け、近隣住民との調整を促進します' },
      { pattern: /(盛土|盛り土|造成)/, name: '盛土規制法: 盛土や造成に関する規制' },
      { pattern: /(住環境|駐車場|集合住宅)/, name: '住環境の整備に関する条例: 集合住宅や商業施設など一定規模以上の建築物に適用され、駐車場や緑化計画などの基準を定めています' },
      { pattern: /(雨水|流出抑制|排水)/, name: '雨水流出抑制施設の設置に関する指導要綱: 雨水流出を抑制するための施設設置を求める要綱です' }
    ];
    
    for (const { pattern, name } of guidancePatterns) {
      if (pattern.test(searchResults)) {
        administrativeGuidance.push(name);
      }
    }
    

    if (administrativeGuidance.length > 0) {
      result.administrativeGuidance = administrativeGuidance;
    }

    console.log('🔄 Fallback extraction result:', result);
    return result;
  }

  /**
   * 自治体の規制・要綱を検索（特定のクエリに基づく）
   */
  async searchMunicipalityRegulations(query: string, prefecture: string, city: string): Promise<{
    urbanPlanning?: RegulationInfo;
    sunlightRegulation?: RegulationInfo;
    administrativeGuidance?: string[];
  }> {
    // queryには既にsite:*.go.jp OR site:*.lg.jpが含まれているため、追加しない
    const fullQuery = query;
    
    console.log(`🏛️ Searching municipality regulations: ${fullQuery}`);
    
    const searchResult = await this.performWebSearch(fullQuery);
    
    // 改善された抽出メソッドを使用して情報を抽出
    const urbanPlanning = this.extractUrbanPlanningInfo(searchResult.results);
    const sunlightRegulation = this.extractSunlightRegulation(searchResult.results);
    
    // 行政指導は複数のクエリから抽出するため、簡易版を使用
    const adminGuidance: string[] = [];
    const guidanceKeywords = ['開発行為', 'みどりの条例', '景観計画', '福祉環境整備要綱', '中高層条例', '盛土規制'];
    for (const keyword of guidanceKeywords) {
      if (searchResult.results.includes(keyword)) {
        const extracted = this.extractAdministrativeGuidance(searchResult.results, keyword);
        if (extracted) {
          adminGuidance.push(extracted);
        }
      }
    }
    
    // 抽出結果を構造化
    const structuredData = {
      urbanPlanning: Object.keys(urbanPlanning).length > 0 ? urbanPlanning : undefined,
      sunlightRegulation: Object.keys(sunlightRegulation).length > 0 ? sunlightRegulation : undefined,
      administrativeGuidance: adminGuidance.length > 0 ? adminGuidance : undefined
    };
    
    // 抽出できなかった場合はAIにフォールバック
    if (!structuredData.urbanPlanning && !structuredData.sunlightRegulation && !structuredData.administrativeGuidance) {
      console.log('⚠️ Pattern extraction failed, falling back to AI structuring...');
      return await this.structureSearchResultsWithAI(searchResult.results, prefecture, city);
    }
    
    return structuredData;
  }

  /**
   * 包括的な地域情報検索（すべての情報を一度に取得）
   */
  async searchComprehensiveRegionInfo(address: string, prefecture: string, city: string): Promise<{
    urbanPlanning: RegulationInfo;
    sunlightRegulation: RegulationInfo;
    administrativeGuidance: string[];
  }> {
    try {
      console.log(`🔍 Comprehensive search for: ${prefecture} ${city} ${address}`);

      const [urbanPlanning, sunlightRegulation, administrativeGuidance] = await Promise.all([
        this.searchUrbanPlanningInfo(address, prefecture, city),
        this.searchSunlightRegulation(address, prefecture, city),
        this.searchAdministrativeGuidance(address, prefecture, city)
      ]);

      return {
        urbanPlanning,
        sunlightRegulation,
        administrativeGuidance
      };
    } catch (error) {
      console.error('Comprehensive search error:', error);
      throw error;
    }
  }
}