/**
 * 国土交通省 都市計画情報API サービス
 * バックエンド経由でXKT002エンドポイントから用途地域・建蔽率・容積率を取得
 */

/**
 * 住所から緯度経度を取得（バックエンド経由）
 */
export async function addressToLatLng(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
    const response = await fetch(`${apiUrl}/cityplanning/geocode?address=${encodeURIComponent(address)}`);
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('住所から座標を取得できませんでした:', error);
    return null;
  }
}

/**
 * 都市計画情報（用途地域）データ
 */
export interface CityPlanningData {
  useArea: string;              // 用途地域（例：商業地域）
  buildingCoverageRatio: number; // 建蔽率（％）
  floorAreaRatio: number;        // 容積率（％）
  prefecture: string;            // 都道府県
  cityName: string;             // 市区町村名
  // 手動入力用フィールド
  altitudeDistrict?: string;    // 高度地区
  heightRestriction?: string;   // 高さ制限
  // 座標情報
  lat?: number;                 // 緯度
  lng?: number;                 // 経度
}

/**
 * XKT002 APIから用途地域情報を取得（バックエンド経由）
 */
export async function fetchCityPlanningData(lat: number, lng: number): Promise<CityPlanningData | null> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
    const response = await fetch(`${apiUrl}/cityplanning/planning-data?lat=${lat}&lng=${lng}`);
    
    if (!response.ok) {
      console.error('API response error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('都市計画情報の取得に失敗しました:', error);
    return null;
  }
}

/**
 * 住所から都市計画情報を取得する統合関数
 */
export async function fetchCityPlanningByAddress(address: string): Promise<CityPlanningData | null> {
  try {
    // 1. 住所から緯度経度を取得
    const coords = await addressToLatLng(address);
    if (!coords) {
      console.error('住所から座標を取得できませんでした');
      return null;
    }

    console.log(`住所「${address}」の座標: lat=${coords.lat}, lng=${coords.lng}`);

    // 2. 座標から都市計画情報を取得
    const planningData = await fetchCityPlanningData(coords.lat, coords.lng);
    
    if (!planningData) {
      console.log('都市計画情報が取得できませんでした。手動入力をお願いします。');
      // デフォルト値を返す（座標情報を含む）
      return {
        useArea: '',
        buildingCoverageRatio: 60,
        floorAreaRatio: 200,
        prefecture: '',
        cityName: '',
        altitudeDistrict: '',
        heightRestriction: '',
        lat: coords.lat,
        lng: coords.lng
      };
    }

    // 座標情報を追加して返す
    return {
      ...planningData,
      lat: coords.lat,
      lng: coords.lng
    };
  } catch (error) {
    console.error('都市計画情報取得エラー:', error);
    return null;
  }
}