import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  RegulationSearchState, 
  RegulationSearchResult, 
  RegulationSearchOptions,
  RegulationItemState
} from '@/types/regulationSearch';
import { Project } from '@/types/project';

// キャッシュの型
interface CacheEntry {
  data: RegulationSearchResult;
  timestamp: number;
}

// キャッシュの有効期限（5分）
const CACHE_DURATION = 5 * 60 * 1000;

// 初期状態を作成するヘルパー関数
function createInitialItemState<T>(): RegulationItemState<T> {
  return {
    data: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  };
}

export function useRegulationSearch(currentProject: Project | null) {
  // 統合された状態管理
  const [state, setState] = useState<RegulationSearchState>({
    shadowRegulation: createInitialItemState(),
    zoningInfo: createInitialItemState(),
    administrativeGuidance: createInitialItemState(),
    isAnyLoading: false,
    hasAnyError: false,
    searchAddress: null
  });

  // キャッシュ
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 状態の部分更新ヘルパー
  const updateItemState = useCallback(<K extends keyof RegulationSearchState>(
    key: K,
    updates: Partial<RegulationSearchState[K]>
  ) => {
    setState(prev => {
      const newState = {
        ...prev,
        [key]: { ...prev[key], ...updates }
      };
      
      // 全体の状態を更新
      const items = ['shadowRegulation', 'zoningInfo', 'administrativeGuidance'] as const;
      newState.isAnyLoading = items.some(item => 
        (newState[item] as RegulationItemState<any>).isLoading
      );
      newState.hasAnyError = items.some(item => 
        (newState[item] as RegulationItemState<any>).error !== null
      );
      
      return newState;
    });
  }, []);

  // プロジェクトから保存された規制情報を復元
  const restoreFromProject = useCallback(() => {
    if (!currentProject?.siteInfo) return;

    console.log('📋 保存された規制情報を復元');

    // 日影規制情報の復元
    if (currentProject.siteInfo.shadowRegulation?.targetArea) {
      updateItemState('shadowRegulation', {
        data: {
          targetArea: currentProject.siteInfo.shadowRegulation.targetArea,
          targetBuildings: currentProject.siteInfo.shadowRegulation.targetBuilding,
          measurementHeight: String(currentProject.siteInfo.shadowRegulation.measurementHeight),
          measurementTime: currentProject.siteInfo.shadowRegulation.measurementTime,
          range5to10m: String(currentProject.siteInfo.shadowRegulation.allowedShadowTime5to10m),
          rangeOver10m: String(currentProject.siteInfo.shadowRegulation.allowedShadowTimeOver10m)
        },
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      });
    }

    // 都市計画情報の復元
    if (currentProject.siteInfo.zoningType) {
      updateItemState('zoningInfo', {
        data: {
          zoningType: currentProject.siteInfo.zoningType,
          buildingCoverageRatio: currentProject.siteInfo.buildingCoverage || 0,
          floorAreaRatio: currentProject.siteInfo.floorAreaRatio || 0,
          heightLimit: currentProject.siteInfo.heightLimit || '',
          heightDistrict: currentProject.siteInfo.heightDistrict || ''
        },
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      });
    }

    // 行政指導情報の復元
    if (currentProject.siteInfo.administrativeGuidanceDetails?.length > 0) {
      updateItemState('administrativeGuidance', {
        data: currentProject.siteInfo.administrativeGuidanceDetails,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      });
    }
  }, [currentProject, updateItemState]);

  // キャッシュから取得
  const getFromCache = useCallback((address: string): RegulationSearchResult | null => {
    const cached = cacheRef.current.get(address);
    if (!cached) return null;
    
    // 有効期限チェック
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      cacheRef.current.delete(address);
      return null;
    }
    
    return cached.data;
  }, []);

  // キャッシュに保存
  const saveToCache = useCallback((address: string, data: RegulationSearchResult) => {
    cacheRef.current.set(address, {
      data,
      timestamp: Date.now()
    });
  }, []);

  // Web検索を実行
  const performWebSearch = useCallback(async (
    address: string,
    prefecture: string,
    city: string,
    searchTypes: ('shadow' | 'zoning' | 'administrative')[]
  ): Promise<RegulationSearchResult> => {
    const queries = {
      shadow: `${prefecture} ${city} 日影規制 条例 建築基準法`,
      zoning: `${prefecture} ${city} 都市計画 用途地域 建ぺい率 容積率 高度地区`,
      administrative: `${prefecture} ${city} 建築指導要綱 行政指導`
    };

    const searchPromises = searchTypes.map(async (type) => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/websearch/regulations`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: queries[type], 
              prefecture, 
              city 
            })
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`${type}検索結果:`, result);
        return { type, result };
      } catch (error) {
        console.error(`${type}検索エラー:`, error);
        return { type, result: { success: false, error: error.message } };
      }
    });

    const results = await Promise.allSettled(searchPromises);
    const searchResult: RegulationSearchResult = {};

    results.forEach(({ status, value }) => {
      if (status === 'fulfilled' && value.result.success && value.result.data) {
        console.log(`処理中 ${value.type}:`, value.result.data);
        switch (value.type) {
          case 'shadow':
            searchResult.shadowRegulation = value.result.data.sunlightRegulation;
            break;
          case 'zoning':
            searchResult.urbanPlanning = value.result.data.urbanPlanning;
            break;
          case 'administrative':
            searchResult.administrativeGuidance = value.result.data.administrativeGuidance;
            break;
        }
      }
    });

    return searchResult;
  }, []);

  // メインの検索関数
  const searchRegulations = useCallback(async (
    address: string,
    options: RegulationSearchOptions = {}
  ) => {
    const {
      forceRefresh = false,
      skipSaved = false,
      searchTypes = ['shadow', 'zoning', 'administrative']
    } = options;

    // 住所が空の場合は何もしない
    if (!address || !address.trim()) {
      console.log('住所が指定されていません');
      return;
    }

    const trimmedAddress = address.trim();

    // 同じ住所で検索中の場合はスキップ
    if (state.searchAddress === trimmedAddress && state.isAnyLoading) {
      console.log('同じ住所で検索中です');
      return;
    }

    setState(prev => ({ ...prev, searchAddress: trimmedAddress }));

    // 保存されたデータのチェック（スキップオプションがない場合）
    if (!skipSaved && !forceRefresh && currentProject?.siteInfo) {
      const hasSavedData = 
        (searchTypes.includes('shadow') && currentProject.siteInfo.shadowRegulation?.targetArea) ||
        (searchTypes.includes('zoning') && currentProject.siteInfo.zoningType) ||
        (searchTypes.includes('administrative') && currentProject.siteInfo.administrativeGuidanceDetails?.length > 0);
      
      if (hasSavedData) {
        console.log('保存されたデータが見つかりました');
        restoreFromProject();
        return;
      }
    }

    // キャッシュチェック（強制更新でない場合）
    if (!forceRefresh) {
      const cached = getFromCache(trimmedAddress);
      if (cached) {
        console.log('キャッシュから規制情報を取得');
        applySearchResult(cached, searchTypes);
        return;
      }
    }

    // 住所から都道府県と市区町村を抽出
    const { prefecture, city } = extractPrefectureAndCity(trimmedAddress);

    // 検索対象の状態をローディングに設定
    searchTypes.forEach(type => {
      switch (type) {
        case 'shadow':
          updateItemState('shadowRegulation', { isLoading: true, error: null });
          break;
        case 'zoning':
          updateItemState('zoningInfo', { isLoading: true, error: null });
          break;
        case 'administrative':
          updateItemState('administrativeGuidance', { isLoading: true, error: null });
          break;
      }
    });

    try {
      // Web検索を実行
      const searchResult = await performWebSearch(trimmedAddress, prefecture, city, searchTypes);
      
      // 結果を適用
      applySearchResult(searchResult, searchTypes);
      
      // キャッシュに保存
      saveToCache(trimmedAddress, searchResult);
      
    } catch (error) {
      console.error('規制情報の検索エラー:', error);
      searchTypes.forEach(type => {
        switch (type) {
          case 'shadow':
            updateItemState('shadowRegulation', { 
              isLoading: false, 
              error: '日影規制情報の取得に失敗しました' 
            });
            break;
          case 'zoning':
            updateItemState('zoningInfo', { 
              isLoading: false, 
              error: '都市計画情報の取得に失敗しました' 
            });
            break;
          case 'administrative':
            updateItemState('administrativeGuidance', { 
              isLoading: false, 
              error: '行政指導情報の取得に失敗しました' 
            });
            break;
        }
      });
    }
  }, [currentProject, state, updateItemState, restoreFromProject, getFromCache, performWebSearch, saveToCache]);

  // 検索結果を状態に適用
  const applySearchResult = useCallback((
    result: RegulationSearchResult,
    searchTypes: ('shadow' | 'zoning' | 'administrative')[]
  ) => {
    const now = new Date();

    // 日影規制情報
    if (searchTypes.includes('shadow') && result.shadowRegulation) {
      console.log('日影規制データマッピング前:', result.shadowRegulation);
      
      // sunlightRegulationという名前で来る場合もあるので、それも確認
      const shadowRegData = result.shadowRegulation.sunlightRegulation || result.shadowRegulation;
      
      const shadowData = {
        targetArea: shadowRegData.targetArea || '',
        targetBuildings: shadowRegData.targetBuildings || '',
        measurementHeight: shadowRegData.measurementHeight || '',
        measurementTime: shadowRegData.timeRange || shadowRegData.measurementTime || '',
        range5to10m: shadowRegData.shadowTimeLimit || shadowRegData.range5to10m || '',
        rangeOver10m: shadowRegData.rangeOver10m || ''
      };
      
      // 有効なデータがある場合のみ設定
      if (shadowData.targetArea) {
        updateItemState('shadowRegulation', {
          data: shadowData,
          isLoading: false,
          error: null,
          lastUpdated: now
        });
      } else {
        updateItemState('shadowRegulation', {
          isLoading: false,
          error: '日影規制情報が見つかりませんでした'
        });
      }
    } else if (searchTypes.includes('shadow')) {
      updateItemState('shadowRegulation', {
        isLoading: false,
        error: '日影規制情報が見つかりませんでした'
      });
    }

    // 都市計画情報
    if (searchTypes.includes('zoning') && result.urbanPlanning) {
      const zoningData = {
        zoningType: result.urbanPlanning.useDistrict || '',
        buildingCoverageRatio: parseFloat(result.urbanPlanning.buildingCoverageRatio?.match(/\d+/)?.[0] || '0'),
        floorAreaRatio: parseFloat(result.urbanPlanning.floorAreaRatio?.match(/\d+/)?.[0] || '0'),
        heightLimit: result.urbanPlanning.heightRestriction || '',
        heightDistrict: result.urbanPlanning.heightDistrict || ''
      };
      
      if (zoningData.zoningType || zoningData.buildingCoverageRatio || zoningData.floorAreaRatio) {
        updateItemState('zoningInfo', {
          data: zoningData,
          isLoading: false,
          error: null,
          lastUpdated: now
        });
      } else {
        updateItemState('zoningInfo', {
          isLoading: false,
          error: '都市計画情報が見つかりませんでした'
        });
      }
    } else if (searchTypes.includes('zoning')) {
      updateItemState('zoningInfo', {
        isLoading: false,
        error: '都市計画情報が見つかりませんでした'
      });
    }

    // 行政指導情報
    if (searchTypes.includes('administrative') && result.administrativeGuidance) {
      const guidanceData = result.administrativeGuidance.map((item, index) => {
        if (typeof item === 'string') {
          return {
            id: `guidance-${Date.now()}-${index}`,
            name: item,
            isRequired: false
          };
        } else {
          return {
            id: `guidance-${Date.now()}-${index}`,
            name: item.name || String(item),
            description: item.description || item.details || '',
            isRequired: false
          };
        }
      });
      
      if (guidanceData.length > 0) {
        updateItemState('administrativeGuidance', {
          data: guidanceData,
          isLoading: false,
          error: null,
          lastUpdated: now
        });
      } else {
        updateItemState('administrativeGuidance', {
          isLoading: false,
          error: '行政指導情報が見つかりませんでした'
        });
      }
    } else if (searchTypes.includes('administrative')) {
      updateItemState('administrativeGuidance', {
        isLoading: false,
        error: '行政指導情報が見つかりませんでした'
      });
    }
  }, [updateItemState]);

  // 住所から都道府県と市区町村を抽出
  const extractPrefectureAndCity = (address: string): { prefecture: string; city: string } => {
    let prefecture = '';
    let city = '';

    const prefecturePattern = /(.+[都道府県])/;
    const prefectureMatch = address.match(prefecturePattern);
    
    if (prefectureMatch) {
      prefecture = prefectureMatch[1];
      const cityPattern = new RegExp(`${prefecture}(.+?[市区町村])`);
      const cityMatch = address.match(cityPattern);
      if (cityMatch) {
        city = cityMatch[1];
      }
    }

    // デフォルト値
    if (!prefecture) prefecture = '東京都';
    if (!city) city = '世田谷区';

    return { prefecture, city };
  };

  // デバウンス付き検索
  const debouncedSearch = useCallback((address: string, options?: RegulationSearchOptions) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchRegulations(address, options);
    }, 2000); // 2秒のデバウンス
  }, [searchRegulations]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // プロジェクト変更時の初期化
  useEffect(() => {
    if (currentProject?.id) {
      restoreFromProject();
    }
  }, [currentProject?.id, restoreFromProject]);

  return {
    state,
    searchRegulations,
    debouncedSearch,
    updateItemState
  };
}