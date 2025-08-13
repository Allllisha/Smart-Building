import { Request, Response } from 'express';
import axios from 'axios';

const API_KEY = '4bb1c8cda2a845ca806c12b664b30d79';
const BASE_URL = 'https://www.reinfolib.mlit.go.jp/ex-api/external';

/**
 * 隣接地の用途地域情報を取得
 * 周囲約100-200mの範囲で住居系地域を探す
 */
async function getAdjacentZoningInfo(lat: number, lng: number, zoom: number): Promise<any[]> {
  try {
    const adjacentAreas: any[] = [];
    const tile = latLngToTile(lat, lng, zoom);
    
    // 周囲のタイルも含めて検索（3x3グリッド）
    const offsets = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],  [0, 0],  [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];
    
    for (const [dx, dy] of offsets) {
      const tileX = tile.x + dx;
      const tileY = tile.y + dy;
      
      try {
        const url = `${BASE_URL}/XKT002?response_format=geojson&z=${zoom}&x=${tileX}&y=${tileY}`;
        const response = await axios.get(url, {
          headers: {
            'Ocp-Apim-Subscription-Key': API_KEY,
            'Accept': 'application/json'
          },
          timeout: 5000
        });
        
        if (response.data?.features) {
          for (const feature of response.data.features) {
            const props = feature.properties;
            const useArea = props.use_area_ja || '';
            
            // 住居系地域のみを抽出
            if (useArea.includes('住居') || useArea.includes('住宅')) {
              // 距離を計算（簡易版）
              let centerLng = 0, centerLat = 0;
              let coordCount = 0;
              
              if (feature.geometry.type === 'Polygon') {
                const coords = feature.geometry.coordinates[0];
                for (const coord of coords) {
                  centerLng += coord[0];
                  centerLat += coord[1];
                  coordCount++;
                }
              } else if (feature.geometry.type === 'MultiPolygon') {
                const coords = feature.geometry.coordinates[0][0];
                for (const coord of coords) {
                  centerLng += coord[0];
                  centerLat += coord[1];
                  coordCount++;
                }
              }
              
              if (coordCount > 0) {
                centerLng /= coordCount;
                centerLat /= coordCount;
                
                // 概算距離（度をメートルに変換、1度≈111km）
                const distance = Math.sqrt(
                  Math.pow((lng - centerLng) * 111000, 2) + 
                  Math.pow((lat - centerLat) * 111000, 2)
                );
                
                // 200m以内の住居系地域を記録
                if (distance <= 200) {
                  const existingArea = adjacentAreas.find(a => 
                    a.useArea === useArea && 
                    a.buildingCoverageRatio === parseFloat(props.u_building_coverage_ratio_ja?.replace('%', '') || '0')
                  );
                  
                  if (!existingArea) {
                    adjacentAreas.push({
                      useArea,
                      buildingCoverageRatio: parseFloat(props.u_building_coverage_ratio_ja?.replace('%', '').replace('.0', '') || '0'),
                      floorAreaRatio: parseFloat(props.u_floor_area_ratio_ja?.replace('%', '').replace('.0', '') || '0'),
                      distance: Math.round(distance)
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        // 個別のタイルエラーは無視
        console.log(`Failed to fetch tile ${tileX},${tileY}: ${error}`);
      }
    }
    
    // 距離順にソート
    adjacentAreas.sort((a, b) => a.distance - b.distance);
    
    return adjacentAreas;
  } catch (error) {
    console.error('Failed to get adjacent zoning info:', error);
    return [];
  }
}

/**
 * 緯度経度をXYZタイル座標に変換
 */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number; z: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  
  return { x, y, z: zoom };
}

/**
 * 点がポリゴン内にあるかチェック（Ray-casting algorithm）
 */
function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  let inside = false;
  const x = point[0];
  const y = point[1];

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * フィーチャーのプロパティをパース
 */
function parseFeatureProperties(props: any) {
  // 建蔽率と容積率のパーセント値を抽出
  const buildingCoverageStr = props.u_building_coverage_ratio_ja || '0%';
  const floorAreaRatioStr = props.u_floor_area_ratio_ja || '0%';
  
  const buildingCoverage = parseFloat(buildingCoverageStr.replace('%', '').replace('.0', ''));
  const floorAreaRatio = parseFloat(floorAreaRatioStr.replace('%', '').replace('.0', ''));

  return {
    useArea: props.use_area_ja || '指定なし',
    buildingCoverageRatio: buildingCoverage,
    floorAreaRatio: floorAreaRatio,
    prefecture: props.prefecture || '',
    cityName: props.city_name || '',
    // 高度地区と高さ制限は手動入力
    altitudeDistrict: '',
    heightRestriction: ''
  };
}

/**
 * 国土交通省APIから都市計画情報を取得（プロキシ）
 */
export const getCityPlanningData = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: '緯度経度が指定されていません' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    // 複数のズームレベルで試行
    const zoomLevels = [11, 12, 13];
    
    for (const zoom of zoomLevels) {
      const tile = latLngToTile(latitude, longitude, zoom);
      console.log(`Trying zoom level ${zoom}: tile x=${tile.x}, y=${tile.y}`);
      
      const url = `${BASE_URL}/XKT002?response_format=geojson&z=${tile.z}&x=${tile.x}&y=${tile.y}`;
      
      try {
        const response = await axios.get(url, {
          headers: {
            'Ocp-Apim-Subscription-Key': API_KEY,
            'Accept': 'application/json'
          }
        });

        const data = response.data;
        
        if (!data.features || data.features.length === 0) {
          console.log(`No data found at zoom level ${zoom}`);
          continue;
        }

        // 指定座標を含むポリゴンを検索
        const targetPoint: [number, number] = [longitude, latitude];
        
        for (const feature of data.features) {
          if (feature.geometry.type === 'Polygon') {
            if (isPointInPolygon(targetPoint, feature.geometry.coordinates[0])) {
              const result = parseFeatureProperties(feature.properties);
              return res.json(result);
            }
          } else if (feature.geometry.type === 'MultiPolygon') {
            for (const polygon of feature.geometry.coordinates) {
              if (isPointInPolygon(targetPoint, polygon[0])) {
                const result = parseFeatureProperties(feature.properties);
                return res.json(result);
              }
            }
          }
        }

        // ポリゴン内に含まれない場合、最も近いフィーチャーを探す
        let closestFeature = null;
        let minDistance = Infinity;

        for (const feature of data.features) {
          if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            const coords = feature.geometry.type === 'Polygon' 
              ? feature.geometry.coordinates[0] 
              : feature.geometry.coordinates[0][0];
            
            // ポリゴンの中心点を計算
            let centerLng = 0, centerLat = 0;
            for (const coord of coords) {
              centerLng += coord[0];
              centerLat += coord[1];
            }
            centerLng /= coords.length;
            centerLat /= coords.length;
            
            // 距離を計算
            const distance = Math.sqrt(
              Math.pow(targetPoint[0] - centerLng, 2) + 
              Math.pow(targetPoint[1] - centerLat, 2)
            );
            
            if (distance < minDistance) {
              minDistance = distance;
              closestFeature = feature;
            }
          }
        }

        if (closestFeature) {
          console.log('Using closest feature as fallback');
          const result = parseFeatureProperties(closestFeature.properties);
          return res.json(result);
        }
      } catch (error) {
        console.error(`Error at zoom level ${zoom}:`, error);
        continue;
      }
    }

    // データが見つからない場合はデフォルト値を返す
    return res.json({
      useArea: '',
      buildingCoverageRatio: 60,
      floorAreaRatio: 200,
      prefecture: '',
      cityName: '',
      altitudeDistrict: '',
      heightRestriction: ''
    });

  } catch (error) {
    console.error('都市計画情報の取得に失敗しました:', error);
    return res.status(500).json({ error: '都市計画情報の取得に失敗しました' });
  }
};

/**
 * 日影規制の参考値を計算
 */
export const getShadowRegulationReference = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { lat, lng, zoningType, floorAreaRatio } = req.query;
    
    if (!zoningType || !floorAreaRatio) {
      return res.status(400).json({ error: '用途地域と容積率が必要です' });
    }

    const zoning = zoningType as string;
    const ratio = parseFloat(floorAreaRatio as string);
    
    // 用途地域の正規化
    const normalizedZoning = zoning
      .replace(/１/g, '1')
      .replace(/２/g, '2')
      .replace(/第1種/g, '第１種')
      .replace(/第2種/g, '第２種');
    
    // 測定時間帯の基本値
    const measurementTime = '8時から16時（冬至日）';
    
    // 商業地域・近隣商業地域の場合は隣接地を確認
    if (normalizedZoning === '商業地域' || normalizedZoning === '近隣商業地域') {
      if (lat && lng) {
        const latitude = parseFloat(lat as string);
        const longitude = parseFloat(lng as string);
        
        // 隣接地の住居系地域を検索
        const adjacentAreas = await getAdjacentZoningInfo(latitude, longitude, 13);
        
        if (adjacentAreas && adjacentAreas.length > 0) {
          const nearestResidential = adjacentAreas[0];
          
          // 隣接する住居系地域の規制値から計算
          const measurementHeight = nearestResidential.useArea.includes('低層') ? 1.5 : 4;
          let allowedShadowTime5to10m = 0;
          let allowedShadowTimeOver10m = 0;
          
          if (nearestResidential.useArea.includes('低層')) {
            allowedShadowTime5to10m = nearestResidential.floorAreaRatio <= 100 ? 3 : 4;
            allowedShadowTimeOver10m = nearestResidential.floorAreaRatio <= 100 ? 2 : 2.5;
          } else if (nearestResidential.useArea.includes('中高層')) {
            if (nearestResidential.floorAreaRatio <= 150) {
              allowedShadowTime5to10m = 3;
              allowedShadowTimeOver10m = 2;
            } else if (nearestResidential.floorAreaRatio <= 200) {
              allowedShadowTime5to10m = 4;
              allowedShadowTimeOver10m = 2.5;
            } else {
              allowedShadowTime5to10m = 5;
              allowedShadowTimeOver10m = 3;
            }
          } else {
            // その他の住居系地域
            allowedShadowTime5to10m = nearestResidential.floorAreaRatio <= 200 ? 4 : 5;
            allowedShadowTimeOver10m = nearestResidential.floorAreaRatio <= 200 ? 2.5 : 3;
          }
          
          return res.json({
            targetArea: normalizedZoning,
            targetBuilding: `高さが10mを超える建築物（隣接する${nearestResidential.useArea}への配慮）`,
            measurementHeight,
            measurementTime,
            allowedShadowTime5to10m,
            allowedShadowTimeOver10m,
            note: `隣接する${nearestResidential.useArea}（約${nearestResidential.distance}m）の規制値を適用`
          });
        }
      }
      
      // 隣接地情報がない場合
      return res.json({
        targetArea: normalizedZoning,
        targetBuilding: '日影規制対象外（隣接する住居系地域への配慮は必要）',
        measurementHeight: 0,
        measurementTime: '-',
        allowedShadowTime5to10m: 0,
        allowedShadowTimeOver10m: 0,
        note: '商業系地域は原則として日影規制対象外ですが、隣接地への配慮が必要な場合があります'
      });
    }
    
    // その他の用途地域の処理
    let result: any = null;
    
    switch (normalizedZoning) {
      case '第１種低層住居専用地域':
      case '第２種低層住居専用地域':
        result = {
          targetArea: normalizedZoning,
          targetBuilding: '軒の高さが7mを超える建築物または地階を除く階数が3以上の建築物',
          measurementHeight: 1.5,
          measurementTime,
          allowedShadowTime5to10m: ratio <= 100 ? 3 : 4,
          allowedShadowTimeOver10m: ratio <= 100 ? 2 : 2.5,
          note: '自治体により異なる場合があります'
        };
        break;
        
      case '第１種中高層住居専用地域':
      case '第２種中高層住居専用地域':
        if (ratio <= 150) {
          result = {
            targetArea: normalizedZoning,
            targetBuilding: '高さが10mを超える建築物',
            measurementHeight: 4,
            measurementTime,
            allowedShadowTime5to10m: 3,
            allowedShadowTimeOver10m: 2,
            note: '容積率150%以下の地域'
          };
        } else if (ratio <= 200) {
          result = {
            targetArea: normalizedZoning,
            targetBuilding: '高さが10mを超える建築物',
            measurementHeight: 4,
            measurementTime,
            allowedShadowTime5to10m: 4,
            allowedShadowTimeOver10m: 2.5,
            note: '容積率200%以下の地域'
          };
        } else {
          result = {
            targetArea: normalizedZoning,
            targetBuilding: '高さが10mを超える建築物',
            measurementHeight: 4,
            measurementTime,
            allowedShadowTime5to10m: 5,
            allowedShadowTimeOver10m: 3,
            note: '容積率200%超の地域'
          };
        }
        break;
        
      case '第１種住居地域':
      case '第２種住居地域':
      case '準住居地域':
        result = {
          targetArea: normalizedZoning,
          targetBuilding: '高さが10mを超える建築物',
          measurementHeight: 4,
          measurementTime,
          allowedShadowTime5to10m: ratio <= 200 ? 4 : 5,
          allowedShadowTimeOver10m: ratio <= 200 ? 2.5 : 3,
          note: ratio <= 200 ? '容積率200%以下の地域（自治体により規制の有無が異なります）' : '容積率200%超の地域（自治体により規制の有無が異なります）'
        };
        break;
        
      case '田園住居地域':
        result = {
          targetArea: normalizedZoning,
          targetBuilding: '軒の高さが7mを超える建築物または地階を除く階数が3以上の建築物',
          measurementHeight: 1.5,
          measurementTime,
          allowedShadowTime5to10m: 4,
          allowedShadowTimeOver10m: 2.5,
          note: '田園住居地域の基準値'
        };
        break;
        
      case '準工業地域':
        result = {
          targetArea: normalizedZoning,
          targetBuilding: '自治体により異なる（規制がある場合は高さ10m超）',
          measurementHeight: 4,
          measurementTime,
          allowedShadowTime5to10m: 5,
          allowedShadowTimeOver10m: 3,
          note: '準工業地域の規制は自治体により大きく異なります。必ず確認してください'
        };
        break;
        
      case '工業地域':
      case '工業専用地域':
        result = {
          targetArea: normalizedZoning,
          targetBuilding: '日影規制対象外',
          measurementHeight: 0,
          measurementTime: '-',
          allowedShadowTime5to10m: 0,
          allowedShadowTimeOver10m: 0,
          note: '工業系地域は日影規制対象外です'
        };
        break;
        
      case '市街化調整区域':
        result = {
          targetArea: normalizedZoning,
          targetBuilding: '原則として建築不可',
          measurementHeight: 0,
          measurementTime: '-',
          allowedShadowTime5to10m: 0,
          allowedShadowTimeOver10m: 0,
          note: '市街化調整区域は原則として建築が制限されています'
        };
        break;
        
      default:
        result = null;
    }
    
    if (result) {
      return res.json(result);
    }
    
    return res.json({
      targetArea: normalizedZoning,
      targetBuilding: '規制情報なし',
      measurementHeight: 0,
      measurementTime: '-',
      allowedShadowTime5to10m: 0,
      allowedShadowTimeOver10m: 0,
      note: 'この用途地域の規制情報は登録されていません'
    });
    
  } catch (error) {
    console.error('日影規制参考値の計算に失敗しました:', error);
    return res.status(500).json({ error: '日影規制参考値の計算に失敗しました' });
  }
};

/**
 * 住所から緯度経度を取得（Mapbox Geocoding API）
 */
export const geocodeAddress = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: '住所が指定されていません' });
    }

    const mapboxToken = process.env.VITE_MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      console.error('Mapbox access token is not configured');
      return res.status(500).json({ error: 'Mapbox access token is not configured' });
    }

    const geocodeUrl = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address as string)}&country=jp&language=ja&access_token=${mapboxToken}`;
    
    const response = await axios.get(geocodeUrl);
    
    if (response.data.features && response.data.features.length > 0) {
      const [lng, lat] = response.data.features[0].geometry.coordinates;
      return res.json({ lat, lng });
    }
    
    return res.status(404).json({ error: '住所から座標を取得できませんでした' });
  } catch (error) {
    console.error('ジオコーディングエラー:', error);
    return res.status(500).json({ error: 'ジオコーディングに失敗しました' });
  }
};