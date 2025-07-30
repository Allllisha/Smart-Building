import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export interface RegulationInfo {
  buildingCoverageRatio?: string;
  floorAreaRatio?: string;
  useDistrict?: string;
  heightRestriction?: string;
  sunlightRegulation?: {
    measurementHeight: string;
    timeRange: string;
    shadowTimeLimit: string;
    targetBuildings: string;
  };
  administrativeGuidance?: string[];
}

export interface WebSearchResponse {
  success: boolean;
  data?: {
    address: string;
    prefecture: string;
    city: string;
    urbanPlanning?: RegulationInfo;
    sunlightRegulation?: RegulationInfo;
    administrativeGuidance?: string[];
    searchedAt: string;
  };
  error?: string;
}

/**
 * Web検索のヘルスチェック
 */
export const checkWebSearchHealth = async (): Promise<WebSearchResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/websearch/health`);
    return response.data;
  } catch (error) {
    console.error('WebSearch health check failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    };
  }
};

/**
 * 都市計画情報を検索
 */
export const searchUrbanPlanningInfo = async (
  address: string,
  prefecture: string,
  city: string
): Promise<WebSearchResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/websearch/urban-planning`, {
      address,
      prefecture,
      city
    });
    return response.data;
  } catch (error) {
    console.error('Urban planning search failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Urban planning search failed'
    };
  }
};

/**
 * 日影規制情報を検索
 */
export const searchSunlightRegulation = async (
  address: string,
  prefecture: string,
  city: string  
): Promise<WebSearchResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/websearch/sunlight-regulation`, {
      address,
      prefecture,
      city
    });
    return response.data;
  } catch (error) {
    console.error('Sunlight regulation search failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sunlight regulation search failed'
    };
  }
};

/**
 * 行政指導・要綱を検索
 */
export const searchAdministrativeGuidance = async (
  address: string,
  prefecture: string,
  city: string
): Promise<WebSearchResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/websearch/administrative-guidance`, {
      address,
      prefecture,
      city
    });
    return response.data;
  } catch (error) {
    console.error('Administrative guidance search failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Administrative guidance search failed'
    };
  }
};

/**
 * 包括的な地域情報検索（すべての情報を一度に取得）
 */
export const searchComprehensiveInfo = async (
  address: string,
  prefecture: string,
  city: string
): Promise<WebSearchResponse> => {
  try {
    // console.log(`🔍 Comprehensive search: ${prefecture} ${city} ${address}`);
    
    const response = await axios.post(`${API_BASE_URL}/websearch/comprehensive`, {
      address,
      prefecture,
      city
    }, {
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '120000'), // タイムアウト設定
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // console.log('🎉 Search response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Comprehensive search failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Comprehensive search failed'
    };
  }
};