// 規制情報検索に関する型定義

// 各規制情報の状態
export interface RegulationItemState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// 統合された規制情報の状態
export interface RegulationSearchState {
  shadowRegulation: RegulationItemState<{
    targetArea: string;
    targetBuildings: string;
    measurementHeight: string;
    measurementTime: string;
    range5to10m: string;
    rangeOver10m: string;
  }>;
  zoningInfo: RegulationItemState<{
    zoningType: string;
    buildingCoverageRatio: number;
    floorAreaRatio: number;
    heightLimit: string;
    heightDistrict: string;
  }>;
  administrativeGuidance: RegulationItemState<{
    id: string;
    name: string;
    description?: string;
    isRequired: boolean;
    applicableConditions?: string;
  }[]>;
  // 全体の状態
  isAnyLoading: boolean;
  hasAnyError: boolean;
  searchAddress: string | null;
}

// 検索結果の型
export interface RegulationSearchResult {
  shadowRegulation?: {
    targetArea?: string;
    targetBuildings?: string;
    measurementHeight?: string;
    measurementTime?: string;
    shadowTimeLimit?: string;
    rangeOver10m?: string;
  };
  urbanPlanning?: {
    useDistrict?: string;
    buildingCoverageRatio?: string;
    floorAreaRatio?: string;
    heightRestriction?: string;
    heightDistrict?: string;
  };
  administrativeGuidance?: Array<string | {
    name: string;
    description?: string;
    details?: string;
  }>;
}

// 検索オプション
export interface RegulationSearchOptions {
  forceRefresh?: boolean; // キャッシュを無視して強制的に再検索
  skipSaved?: boolean; // 保存されたデータをスキップ
  searchTypes?: ('shadow' | 'zoning' | 'administrative')[]; // 検索する規制情報の種類
}