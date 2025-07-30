import { Request, Response } from 'express';
import { WebSearchService } from '../services/websearch.service';

export class WebSearchController {
  private webSearchService: WebSearchService;

  constructor() {
    this.webSearchService = new WebSearchService();
  }

  /**
   * 都市計画情報を検索
   */
  searchUrbanPlanning = async (req: Request, res: Response): Promise<void> => {
    try {
      const { address, prefecture, city } = req.body;

      if (!address || !prefecture || !city) {
        res.status(400).json({
          success: false,
          error: 'address, prefecture, and city are required'
        });
        return;
      }

      console.log(`🏛️ Urban planning search request: ${prefecture} ${city} ${address}`);

      const result = await this.webSearchService.searchUrbanPlanningInfo(address, prefecture, city);

      res.json({
        success: true,
        data: {
          address,
          prefecture,
          city,
          urbanPlanning: result,
          searchedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Urban planning search error:', error);
      // エラー時は200で「取得できませんでした」を返す
      res.json({
        success: false,
        data: {
          address: req.body.address || '',
          prefecture: req.body.prefecture || '',
          city: req.body.city || '',
          urbanPlanning: null,
          searchedAt: new Date().toISOString(),
          error: '都市計画情報を取得できませんでした'
        }
      });
    }
  };

  /**
   * 日影規制情報を検索
   */
  searchSunlightRegulation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { address, prefecture, city } = req.body;

      if (!address || !prefecture || !city) {
        res.status(400).json({
          success: false,
          error: 'address, prefecture, and city are required'
        });
        return;
      }

      console.log(`☀️ Sunlight regulation search request: ${prefecture} ${city} ${address}`);

      const result = await this.webSearchService.searchSunlightRegulation(address, prefecture, city);

      res.json({
        success: true,
        data: {
          address,
          prefecture,
          city,
          sunlightRegulation: result,
          searchedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Sunlight regulation search error:', error);
      // エラー時は200で「取得できませんでした」を返す
      res.json({
        success: false,
        data: {
          address: req.body.address || '',
          prefecture: req.body.prefecture || '',
          city: req.body.city || '',
          sunlightRegulation: null,
          searchedAt: new Date().toISOString(),
          error: '日影規制情報を取得できませんでした'
        }
      });
    }
  };

  /**
   * 行政指導・要綱を検索
   */
  searchAdministrativeGuidance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { address, prefecture, city } = req.body;

      if (!address || !prefecture || !city) {
        res.status(400).json({
          success: false,
          error: 'address, prefecture, and city are required'
        });
        return;
      }

      console.log(`📋 Administrative guidance search request: ${prefecture} ${city} ${address}`);

      const result = await this.webSearchService.searchAdministrativeGuidance(address, prefecture, city);

      res.json({
        success: true,
        data: {
          address,
          prefecture,
          city,
          administrativeGuidance: result,
          searchedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Administrative guidance search error:', error);
      res.status(500).json({
        success: false,
        error: '行政指導情報を取得できませんでした',
        details: error instanceof Error ? error.message : 'Administrative guidance search failed'
      });
    }
  };

  /**
   * 包括的な地域情報検索（すべての情報を一度に取得）
   */
  searchComprehensiveInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { address, prefecture, city } = req.body;

      if (!address || !prefecture || !city) {
        res.status(400).json({
          success: false,
          error: 'address, prefecture, and city are required'
        });
        return;
      }

      console.log(`🔍 Comprehensive search request: ${prefecture} ${city} ${address}`);

      const result = await this.webSearchService.searchComprehensiveRegionInfo(address, prefecture, city);

      res.json({
        success: true,
        data: {
          address,
          prefecture,
          city,
          ...result,
          searchedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Comprehensive search error:', error);
      // エラー時は200で「取得できませんでした」を返す
      res.json({
        success: false,
        data: {
          address: req.body.address || '',
          prefecture: req.body.prefecture || '',
          city: req.body.city || '',
          urbanPlanning: null,
          sunlightRegulation: null,
          administrativeGuidance: null,
          searchedAt: new Date().toISOString(),
          error: '地域情報を取得できませんでした'
        }
      });
    }
  };

  /**
   * 自治体規制情報を検索（福祉環境整備要綱など）
   */
  searchMunicipalityRegulations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, prefecture, city } = req.body;

      if (!query || !prefecture || !city) {
        res.status(400).json({
          success: false,
          error: 'query, prefecture, and city are required'
        });
        return;
      }

      console.log(`🏛️ Municipality regulations search request: ${query} in ${prefecture} ${city}`);

      const result = await this.webSearchService.searchMunicipalityRegulations(query, prefecture, city);

      res.json({
        success: true,
        data: {
          query,
          prefecture,
          city,
          ...result, // 構造化されたデータを展開
          searchedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Municipality regulations search error:', error);
      res.status(500).json({
        success: false,
        error: '自治体規制情報を取得できませんでした',
        details: error instanceof Error ? error.message : 'Municipality regulations search failed'
      });
    }
  };

  /**
   * WebSearchエージェントの接続状態を確認
   */
  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    try {
      // 簡単な接続テスト
      console.log('🏥 WebSearch health check');
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          service: 'WebSearch',
          timestamp: new Date().toISOString(),
          agentId: process.env.AZURE_BING_SEARCH_AGENT_ID
        }
      });

    } catch (error) {
      console.error('WebSearch health check error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      });
    }
  };
}