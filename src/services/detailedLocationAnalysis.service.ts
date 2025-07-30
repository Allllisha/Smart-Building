import axios from 'axios'

export interface DetailedLocationInfo {
  // 行政区分
  prefecture: string      // 都道府県
  city: string           // 市区町村
  ward: string           // 区（東京23区など）
  district: string       // 町・丁目
  
  // 環境特性
  urbanDensityScore: number    // 都市化密度スコア (0-10)
  buildingDensity: number      // 建物密度 (0-1)
  averageBuildingHeight: number // 平均建物高さ (m)
  roadWidth: number            // 平均道路幅 (m)
  greenSpaceRatio: number      // 緑地率 (0-1)
  
  // 地理的特性
  altitude: number             // 標高 (m)
  distanceToCoast: number      // 海岸からの距離 (km)
  distanceToMountain: number   // 山からの距離 (km)
  
  // 気候特性
  heatIslandIntensity: number  // ヒートアイランド強度 (0-5)
  airQualityIndex: number      // 大気質指数 (0-10, 10が最良)
  windExposure: number         // 風の通りやすさ (0-1)
  
  // 建築環境
  shadowingFactor: number      // 周辺建物による日陰率 (0-1)
  reflectionFactor: number     // 周辺からの光反射率 (0-1)
  skyViewFactor: number        // 天空率 (0-1)
}

class DetailedLocationAnalysisService {
  private locationCache = new Map<string, DetailedLocationInfo>()

  /**
   * 緯度経度から詳細な地域環境を分析
   */
  async analyzeDetailedLocation(
    latitude: number,
    longitude: number,
    address: string
  ): Promise<DetailedLocationInfo> {
    const cacheKey = `${latitude.toFixed(6)}_${longitude.toFixed(6)}`
    
    if (this.locationCache.has(cacheKey)) {
      console.log('🗄️ キャッシュから地域分析データを取得')
      return this.locationCache.get(cacheKey)!
    }

    try {
      console.log('🏙️ 詳細地域分析を開始:', address)
      
      // 並列で各種データを取得
      const [adminInfo, geoInfo, environmentInfo] = await Promise.all([
        this.getAdministrativeInfo(latitude, longitude, address),
        this.getGeographicalInfo(latitude, longitude),
        this.getEnvironmentalInfo(latitude, longitude, address)
      ])

      const locationInfo: DetailedLocationInfo = {
        ...adminInfo,
        ...geoInfo,
        ...environmentInfo
      }

      this.locationCache.set(cacheKey, locationInfo)
      console.log('✅ 詳細地域分析完了:', locationInfo.city, locationInfo.district)
      
      return locationInfo
    } catch (error) {
      console.error('詳細地域分析エラー:', error)
      return this.getFallbackLocationInfo(latitude, longitude, address)
    }
  }

  /**
   * 行政区画情報を取得
   */
  private async getAdministrativeInfo(
    latitude: number,
    longitude: number,
    address: string
  ) {
    // 住所文字列から詳細分析
    const addressParts = this.parseJapaneseAddress(address)
    
    // より詳細な都市化スコアを計算
    const urbanDensityScore = this.calculateUrbanDensityScore(addressParts, latitude, longitude)
    
    return {
      prefecture: addressParts.prefecture,
      city: addressParts.city,
      ward: addressParts.ward,
      district: addressParts.district,
      urbanDensityScore
    }
  }

  /**
   * 日本の住所を詳細解析
   */
  private parseJapaneseAddress(address: string) {
    let prefecture = ''
    let city = ''
    let ward = ''
    let district = ''

    // 都道府県の抽出
    const prefectureMatch = address.match(/(東京都|大阪府|京都府|北海道|.+県)/)
    if (prefectureMatch) {
      prefecture = prefectureMatch[1]
    }

    // 区の抽出（東京23区、政令指定都市の区）
    const wardMatch = address.match(/([^市町村]+区)/)
    if (wardMatch) {
      ward = wardMatch[1]
    }

    // 市町村の抽出
    const cityMatch = address.match(/([^都道府県]+[市町村])/)
    if (cityMatch) {
      city = cityMatch[1]
    }

    // 町・丁目の抽出
    const districtMatch = address.match(/([^区市町村]+[町丁目])/)
    if (districtMatch) {
      district = districtMatch[1]
    }

    return { prefecture, city, ward, district }
  }

  /**
   * 詳細な都市化密度スコアを計算
   */
  private calculateUrbanDensityScore(
    addressParts: any,
    latitude: number,
    longitude: number
  ): number {
    let score = 5 // ベーススコア

    // 東京都心部の詳細判定
    if (addressParts.prefecture === '東京都') {
      const centralWards = [
        '千代田区', '中央区', '港区', '新宿区', '文京区', 
        '台東区', '墨田区', '江東区', '品川区', '目黒区',
        '大田区', '世田谷区', '渋谷区', '中野区', '杉並区',
        '豊島区', '北区', '荒川区', '板橋区', '練馬区',
        '足立区', '葛飾区', '江戸川区'
      ]
      
      if (centralWards.includes(addressParts.ward)) {
        // 山手線内側（超高密度）
        if (['千代田区', '中央区', '港区', '新宿区', '渋谷区'].includes(addressParts.ward)) {
          score = 10
        }
        // 山手線周辺（高密度）
        else if (['文京区', '台東区', '品川区', '目黒区', '豊島区'].includes(addressParts.ward)) {
          score = 9
        }
        // 世田谷区など住宅密集地（中高密度）
        else if (['世田谷区', '杉並区', '練馬区'].includes(addressParts.ward)) {
          score = 7
        }
        // その他23区（中密度）
        else {
          score = 6
        }
      }
    }

    // 大阪・名古屋の中心部
    else if (addressParts.prefecture === '大阪府') {
      if (['大阪市', '堺市'].includes(addressParts.city)) {
        if (addressParts.ward.includes('中央区') || addressParts.ward.includes('北区')) {
          score = 9
        } else if (addressParts.ward) {
          score = 7
        } else {
          score = 6
        }
      }
    }

    // 政令指定都市
    const majorCities = [
      '横浜市', '川崎市', '名古屋市', '京都市', '神戸市',
      '福岡市', '札幌市', '仙台市', '千葉市', 'さいたま市'
    ]
    
    if (majorCities.some(city => addressParts.city.includes(city))) {
      score = addressParts.ward ? 7 : 6
    }

    // 県庁所在地・中核市
    const prefecturalCapitals = [
      '宇都宮市', '前橋市', '水戸市', '甲府市', '長野市',
      '岐阜市', '静岡市', '津市', '大津市', '奈良市',
      '和歌山市', '鳥取市', '松江市', '岡山市', '広島市',
      '山口市', '徳島市', '高松市', '松山市', '高知市',
      '長崎市', '熊本市', '大分市', '宮崎市', '鹿児島市'
    ]
    
    if (prefecturalCapitals.some(city => addressParts.city.includes(city))) {
      score = 5
    }

    // 町村部
    if (addressParts.city.includes('町') || addressParts.city.includes('村')) {
      score = 2
    }

    return Math.max(0, Math.min(10, score))
  }

  /**
   * 地理的特性を取得
   */
  private async getGeographicalInfo(latitude: number, longitude: number) {
    // 標高データ（実際のAPIまたは計算）
    const altitude = await this.getElevation(latitude, longitude)
    
    // 海岸からの距離（簡易計算）
    const distanceToCoast = this.calculateDistanceToCoast(latitude, longitude)
    
    // 山からの距離（簡易計算）
    const distanceToMountain = this.calculateDistanceToMountain(latitude, longitude)

    return {
      altitude,
      distanceToCoast,
      distanceToMountain
    }
  }

  /**
   * 環境特性を計算
   */
  private async getEnvironmentalInfo(
    latitude: number,
    longitude: number,
    address: string
  ) {
    const addressParts = this.parseJapaneseAddress(address)
    const urbanScore = this.calculateUrbanDensityScore(addressParts, latitude, longitude)

    // 都市化スコアに基づく環境特性の計算
    const buildingDensity = Math.min(1, urbanScore / 10)
    const averageBuildingHeight = urbanScore <= 3 ? 8 : urbanScore <= 6 ? 15 : urbanScore <= 8 ? 25 : 40
    const roadWidth = urbanScore <= 3 ? 6 : urbanScore <= 6 ? 8 : urbanScore <= 8 ? 12 : 16
    const greenSpaceRatio = Math.max(0, (10 - urbanScore) / 10 * 0.4)
    
    const heatIslandIntensity = Math.min(5, urbanScore / 2)
    const airQualityIndex = Math.max(3, 10 - urbanScore * 0.7)
    const windExposure = Math.max(0.2, (10 - urbanScore) / 10)
    
    // 建築環境の計算
    const shadowingFactor = Math.min(0.8, buildingDensity * 0.8)
    const reflectionFactor = Math.min(0.6, buildingDensity * 0.6)
    const skyViewFactor = Math.max(0.2, 1 - shadowingFactor)

    return {
      buildingDensity,
      averageBuildingHeight,
      roadWidth,
      greenSpaceRatio,
      heatIslandIntensity,
      airQualityIndex,
      windExposure,
      shadowingFactor,
      reflectionFactor,
      skyViewFactor
    }
  }

  /**
   * 標高取得（簡易版）
   */
  private async getElevation(latitude: number, longitude: number): Promise<number> {
    try {
      // 実際の標高APIを使用する場合
      // const response = await axios.get(`https://api.open-elevation.com/api/v1/lookup?locations=${latitude},${longitude}`)
      // return response.data.results[0].elevation
      
      // 簡易計算（日本の地形特性から）
      return Math.max(0, (latitude - 35) * 50 + Math.random() * 100)
    } catch (error) {
      return 50 // フォールバック値
    }
  }

  /**
   * 海岸からの距離を計算
   */
  private calculateDistanceToCoast(latitude: number, longitude: number): number {
    // 簡易的な計算（実際はより精密な海岸線データを使用）
    const coastLines = [
      { lat: 35.6762, lng: 139.6503, type: '東京湾' },
      { lat: 34.6937, lng: 135.5023, type: '大阪湾' },
      { lat: 35.1815, lng: 136.9066, type: '伊勢湾' }
    ]
    
    let minDistance = 1000
    coastLines.forEach(coast => {
      const distance = this.calculateDistance(latitude, longitude, coast.lat, coast.lng)
      minDistance = Math.min(minDistance, distance)
    })
    
    return minDistance
  }

  /**
   * 山からの距離を計算
   */
  private calculateDistanceToMountain(latitude: number, longitude: number): number {
    // 主要な山脈・山地の位置
    const mountains = [
      { lat: 35.6762, lng: 138.6318, name: '富士山' },
      { lat: 36.2048, lng: 137.9673, name: '北アルプス' },
      { lat: 35.8617, lng: 139.3266, name: '奥多摩' }
    ]
    
    let minDistance = 1000
    mountains.forEach(mountain => {
      const distance = this.calculateDistance(latitude, longitude, mountain.lat, mountain.lng)
      minDistance = Math.min(minDistance, distance)
    })
    
    return minDistance
  }

  /**
   * 2点間の距離を計算（km）
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  /**
   * フォールバック地域情報
   */
  private getFallbackLocationInfo(
    latitude: number,
    longitude: number,
    address: string
  ): DetailedLocationInfo {
    const addressParts = this.parseJapaneseAddress(address)
    
    return {
      prefecture: addressParts.prefecture || '不明',
      city: addressParts.city || '不明',
      ward: addressParts.ward || '',
      district: addressParts.district || '',
      urbanDensityScore: 5,
      buildingDensity: 0.5,
      averageBuildingHeight: 15,
      roadWidth: 8,
      greenSpaceRatio: 0.2,
      altitude: 50,
      distanceToCoast: 50,
      distanceToMountain: 30,
      heatIslandIntensity: 2.5,
      airQualityIndex: 6,
      windExposure: 0.6,
      shadowingFactor: 0.4,
      reflectionFactor: 0.3,
      skyViewFactor: 0.6
    }
  }
}

export const detailedLocationAnalysisService = new DetailedLocationAnalysisService()