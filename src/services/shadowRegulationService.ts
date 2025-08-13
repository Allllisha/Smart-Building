/**
 * 日影規制サービス
 * 用途地域と容積率から日影規制の参考値を計算
 */

/**
 * 隣接地の用途地域から規制値を取得する補助関数
 */
function getShadowRegulationForAdjacentArea(
  zoningType: string,
  floorAreaRatio: number
): {
  measurementHeight: number;
  allowedShadowTime5to10m: number;
  allowedShadowTimeOver10m: number;
} | null {
  const normalizedZoning = zoningType
    .replace(/１/g, '1')
    .replace(/２/g, '2');

  switch (normalizedZoning) {
    case '第１種低層住居専用地域':
    case '第２種低層住居専用地域':
      return {
        measurementHeight: 1.5,
        allowedShadowTime5to10m: floorAreaRatio <= 100 ? 3 : 4,
        allowedShadowTimeOver10m: floorAreaRatio <= 100 ? 2 : 2.5
      };

    case '第１種中高層住居専用地域':
    case '第２種中高層住居専用地域':
      if (floorAreaRatio <= 150) {
        return {
          measurementHeight: 4,
          allowedShadowTime5to10m: 3,
          allowedShadowTimeOver10m: 2
        };
      } else if (floorAreaRatio <= 200) {
        return {
          measurementHeight: 4,
          allowedShadowTime5to10m: 4,
          allowedShadowTimeOver10m: 2.5
        };
      } else {
        return {
          measurementHeight: 4,
          allowedShadowTime5to10m: 5,
          allowedShadowTimeOver10m: 3
        };
      }

    case '第１種住居地域':
    case '第２種住居地域':
    case '準住居地域':
      return {
        measurementHeight: 4,
        allowedShadowTime5to10m: floorAreaRatio <= 200 ? 4 : 5,
        allowedShadowTimeOver10m: floorAreaRatio <= 200 ? 2.5 : 3
      };

    default:
      return null;
  }
}

export interface ShadowRegulationPattern {
  targetArea: string;           // 規制対象地域
  targetBuilding: string;        // 規制対象建築物（複数パターン）
  measurementHeight: number;     // 測定面高さ
  measurementTime: string;       // 測定時間帯
  allowedShadowTime5to10m: number;    // 5-10m範囲の許容日影時間
  allowedShadowTimeOver10m: number;   // 10m超範囲の許容日影時間
  note?: string;                // 注記
}

/**
 * バックエンドAPIから日影規制の参考値を取得
 * @param zoningType 用途地域
 * @param floorAreaRatio 容積率（％）
 * @param lat 緯度（商業地域の場合に必要）
 * @param lng 経度（商業地域の場合に必要）
 * @returns 日影規制の参考値
 */
export async function getShadowRegulationReferenceFromAPI(
  zoningType: string,
  floorAreaRatio: number,
  lat?: number,
  lng?: number
): Promise<ShadowRegulationPattern | null> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
    const params = new URLSearchParams({
      zoningType,
      floorAreaRatio: floorAreaRatio.toString()
    });
    
    if (lat !== undefined && lng !== undefined) {
      params.append('lat', lat.toString());
      params.append('lng', lng.toString());
    }
    
    const response = await fetch(`${apiUrl}/cityplanning/shadow-regulation?${params}`);
    
    if (!response.ok) {
      console.error('日影規制参考値の取得に失敗:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('日影規制参考値の取得エラー:', error);
    return null;
  }
}

/**
 * 用途地域と容積率から日影規制の参考値を取得（ローカル計算）
 * @param zoningType 用途地域
 * @param floorAreaRatio 容積率（％）
 * @param adjacentAreas 隣接地の用途地域情報（オプション）
 * @returns 日影規制の参考値（複数パターンの可能性あり）
 */
export function getShadowRegulationReference(
  zoningType: string,
  floorAreaRatio: number,
  adjacentAreas?: Array<{
    useArea: string;
    floorAreaRatio: number;
    distance: number;
  }>
): ShadowRegulationPattern | null {
  
  // 用途地域の正規化（全角・半角の統一）
  const normalizedZoning = zoningType
    .replace(/１/g, '1')
    .replace(/２/g, '2')
    .replace(/第1種/g, '第１種')
    .replace(/第2種/g, '第２種');

  // 測定時間帯の基本値（日本の標準）
  const measurementTime = '8時から16時（冬至日）';

  // 用途地域別の日影規制マップ
  switch (normalizedZoning) {
    case '第１種低層住居専用地域':
    case '第２種低層住居専用地域':
      // 低層住居専用地域は軒高7m超または3階以上で規制
      return {
        targetArea: normalizedZoning,
        targetBuilding: '軒の高さが7mを超える建築物または地階を除く階数が3以上の建築物',
        measurementHeight: 1.5,
        measurementTime,
        // 容積率による時間の違い
        allowedShadowTime5to10m: floorAreaRatio <= 100 ? 3 : 4,
        allowedShadowTimeOver10m: floorAreaRatio <= 100 ? 2 : 2.5,
        note: '自治体により異なる場合があります'
      };

    case '第１種中高層住居専用地域':
    case '第２種中高層住居専用地域':
      // 中高層住居専用地域は高さ10m超で規制
      if (floorAreaRatio <= 150) {
        return {
          targetArea: normalizedZoning,
          targetBuilding: '高さが10mを超える建築物',
          measurementHeight: 4,
          measurementTime,
          allowedShadowTime5to10m: 3,
          allowedShadowTimeOver10m: 2,
          note: '容積率150%以下の地域'
        };
      } else if (floorAreaRatio <= 200) {
        return {
          targetArea: normalizedZoning,
          targetBuilding: '高さが10mを超える建築物',
          measurementHeight: 4,
          measurementTime,
          allowedShadowTime5to10m: 4,
          allowedShadowTimeOver10m: 2.5,
          note: '容積率200%以下の地域'
        };
      } else {
        return {
          targetArea: normalizedZoning,
          targetBuilding: '高さが10mを超える建築物',
          measurementHeight: 4,
          measurementTime,
          allowedShadowTime5to10m: 5,
          allowedShadowTimeOver10m: 3,
          note: '容積率200%超の地域'
        };
      }

    case '第１種住居地域':
    case '第２種住居地域':
    case '準住居地域':
      // 住居系地域は高さ10m超で規制（ただし自治体により異なる）
      if (floorAreaRatio <= 200) {
        return {
          targetArea: normalizedZoning,
          targetBuilding: '高さが10mを超える建築物',
          measurementHeight: 4,
          measurementTime,
          allowedShadowTime5to10m: 4,
          allowedShadowTimeOver10m: 2.5,
          note: '容積率200%以下の地域（自治体により規制の有無が異なります）'
        };
      } else {
        return {
          targetArea: normalizedZoning,
          targetBuilding: '高さが10mを超える建築物',
          measurementHeight: 4,
          measurementTime,
          allowedShadowTime5to10m: 5,
          allowedShadowTimeOver10m: 3,
          note: '容積率200%超の地域（自治体により規制の有無が異なります）'
        };
      }

    case '田園住居地域':
      // 田園住居地域（2018年新設）
      return {
        targetArea: normalizedZoning,
        targetBuilding: '軒の高さが7mを超える建築物または地階を除く階数が3以上の建築物',
        measurementHeight: 1.5,
        measurementTime,
        allowedShadowTime5to10m: 4,
        allowedShadowTimeOver10m: 2.5,
        note: '田園住居地域の基準値'
      };

    case '近隣商業地域':
    case '商業地域':
      // 商業系地域は原則として日影規制なしだが、隣接地への配慮が必要
      if (adjacentAreas && adjacentAreas.length > 0) {
        // 最も近い住居系地域の規制を基準とする
        const nearestResidential = adjacentAreas[0];
        const adjacentRegulation = getShadowRegulationForAdjacentArea(
          nearestResidential.useArea, 
          nearestResidential.floorAreaRatio
        );
        
        if (adjacentRegulation) {
          return {
            targetArea: normalizedZoning,
            targetBuilding: `高さが10mを超える建築物（隣接する${nearestResidential.useArea}への配慮）`,
            measurementHeight: adjacentRegulation.measurementHeight,
            measurementTime,
            allowedShadowTime5to10m: adjacentRegulation.allowedShadowTime5to10m,
            allowedShadowTimeOver10m: adjacentRegulation.allowedShadowTimeOver10m,
            note: `隣接する${nearestResidential.useArea}（約${nearestResidential.distance}m）の規制値を適用。敷地境界からの距離で計算`
          };
        }
      }
      
      // 隣接地情報がない場合は規制なし
      return {
        targetArea: normalizedZoning,
        targetBuilding: '日影規制対象外（隣接する住居系地域への配慮は必要）',
        measurementHeight: 0,
        measurementTime: '-',
        allowedShadowTime5to10m: 0,
        allowedShadowTimeOver10m: 0,
        note: '商業系地域は原則として日影規制対象外ですが、隣接地への配慮が必要な場合があります'
      };

    case '準工業地域':
      // 準工業地域は自治体により異なる
      return {
        targetArea: normalizedZoning,
        targetBuilding: '自治体により異なる（規制がある場合は高さ10m超）',
        measurementHeight: 4,
        measurementTime,
        allowedShadowTime5to10m: 5,
        allowedShadowTimeOver10m: 3,
        note: '準工業地域の規制は自治体により大きく異なります。必ず確認してください'
      };

    case '工業地域':
    case '工業専用地域':
      // 工業系地域は原則として日影規制なし
      return {
        targetArea: normalizedZoning,
        targetBuilding: '日影規制対象外',
        measurementHeight: 0,
        measurementTime: '-',
        allowedShadowTime5to10m: 0,
        allowedShadowTimeOver10m: 0,
        note: '工業系地域は日影規制対象外です'
      };

    case '市街化調整区域':
      // 市街化調整区域は原則として建築不可
      return {
        targetArea: normalizedZoning,
        targetBuilding: '原則として建築不可',
        measurementHeight: 0,
        measurementTime: '-',
        allowedShadowTime5to10m: 0,
        allowedShadowTimeOver10m: 0,
        note: '市街化調整区域は原則として建築が制限されています'
      };

    default:
      // その他（無指定など）
      return null;
  }
}

/**
 * 建物高さに応じた規制対象判定
 * @param zoningType 用途地域
 * @param buildingHeight 建物高さ（m）
 * @returns 規制対象かどうか
 */
export function isSubjectToShadowRegulation(
  zoningType: string,
  buildingHeight: number
): boolean {
  const normalizedZoning = zoningType
    .replace(/１/g, '1')
    .replace(/２/g, '2')
    .replace(/第1種/g, '第１種')
    .replace(/第2種/g, '第２種');

  switch (normalizedZoning) {
    case '第１種低層住居専用地域':
    case '第２種低層住居専用地域':
    case '田園住居地域':
      // 軒高7m超で規制対象
      return buildingHeight > 7;

    case '第１種中高層住居専用地域':
    case '第２種中高層住居専用地域':
    case '第１種住居地域':
    case '第２種住居地域':
    case '準住居地域':
    case '準工業地域':
      // 高さ10m超で規制対象
      return buildingHeight > 10;

    case '近隣商業地域':
    case '商業地域':
    case '工業地域':
    case '工業専用地域':
      // 原則として規制対象外
      return false;

    default:
      return false;
  }
}