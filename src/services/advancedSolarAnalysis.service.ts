import axios from 'axios'
import { solarDataService, SolarPosition } from './solarData.service'
import { detailedLocationAnalysisService, DetailedLocationInfo } from './detailedLocationAnalysis.service'

export interface WeatherConditions {
  cloudCover: number        // 雲量 (0-100%)
  precipitation: number     // 降水量 (mm)
  humidity: number         // 湿度 (%)
  temperature: number      // 気温 (°C)
  visibility: number       // 視程 (km)
  uvIndex: number         // UV指数
}

export interface SolarRadiation {
  direct: number          // 直達日射量 (W/m²)
  diffuse: number         // 散乱日射量 (W/m²)
  global: number          // 全天日射量 (W/m²)
  atmospheric: number     // 大気透過率 (0-1)
}

export interface AdvancedShadowData {
  shadowIntensity: number    // 影の濃さ (0-1)
  shadowColor: string       // 影の色 (hex)
  lightQuality: 'harsh' | 'soft' | 'diffused' | 'overcast'
  ambientBrightness: number // 環境光の明るさ (0-1)
  shadowSharpness: number   // 影の鮮明度 (0-1)
}

export interface LocationEnvironment {
  urbanDensity: 'urban' | 'suburban' | 'rural'  // 都市化レベル
  altitude: number                               // 標高 (m)
  nearbyObstructions: boolean                   // 周辺の遮蔽物
  airQuality: 'good' | 'moderate' | 'poor'     // 大気質
}

export interface PreciseSolarAnalysis {
  weather: WeatherConditions
  radiation: SolarRadiation
  shadowData: AdvancedShadowData
  environment: LocationEnvironment
  detailedLocation: DetailedLocationInfo  // 詳細地域情報
  seasonalFactor: number    // 季節補正係数
  timeOfDayFactor: number  // 時間補正係数
}

class AdvancedSolarAnalysisService {
  private readonly openMeteoBaseUrl = 'https://api.open-meteo.com/v1'
  private analysisCache = new Map<string, PreciseSolarAnalysis>()

  /**
   * 住所・座標から詳細な日影分析を実行
   */
  async analyzePreciseShadows(
    latitude: number,
    longitude: number,
    address: string,
    dateTime: Date
  ): Promise<PreciseSolarAnalysis> {
    const cacheKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}_${dateTime.toISOString().slice(0, 13)}`
    
    if (this.analysisCache.has(cacheKey)) {
      console.log('🗄️ キャッシュから精密日影分析を取得')
      return this.analysisCache.get(cacheKey)!
    }

    try {
      console.log('🔬 精密日影分析を開始:', address)
      
      // 並列でデータを取得
      const [weather, radiation, environment, detailedLocation] = await Promise.all([
        this.getDetailedWeather(latitude, longitude, dateTime),
        this.getSolarRadiation(latitude, longitude, dateTime),
        this.analyzeLocationEnvironment(latitude, longitude, address),
        detailedLocationAnalysisService.analyzeDetailedLocation(latitude, longitude, address)
      ])

      // 太陽位置データも取得
      const solarPosition = await solarDataService.getSolarPosition(latitude, longitude, dateTime)

      // 詳細地域情報を考慮した影の分析
      const shadowData = this.calculateAdvancedShadowProperties(
        weather, radiation, solarPosition, environment, detailedLocation, dateTime
      )

      const analysis: PreciseSolarAnalysis = {
        weather,
        radiation,
        shadowData,
        environment,
        detailedLocation,
        seasonalFactor: this.calculateSeasonalFactor(dateTime),
        timeOfDayFactor: this.calculateTimeOfDayFactor(dateTime, solarPosition)
      }

      this.analysisCache.set(cacheKey, analysis)
      console.log('✅ 精密日影分析完了')
      
      return analysis
    } catch (error) {
      console.error('精密日影分析エラー:', error)
      return this.getFallbackAnalysis(latitude, longitude, dateTime)
    }
  }

  /**
   * 詳細な気象データを取得
   */
  private async getDetailedWeather(
    latitude: number,
    longitude: number,
    dateTime: Date
  ): Promise<WeatherConditions> {
    const date = dateTime.toISOString().split('T')[0]
    const hour = dateTime.getHours()

    const response = await axios.get(`${this.openMeteoBaseUrl}/forecast`, {
      params: {
        latitude,
        longitude,
        start_date: date,
        end_date: date,
        hourly: [
          'cloud_cover',
          'precipitation',
          'relative_humidity_2m',
          'temperature_2m',
          'visibility',
          'uv_index'
        ].join(','),
        timezone: 'auto'
      }
    })

    const hourly = response.data.hourly

    return {
      cloudCover: hourly.cloud_cover?.[hour] || 0,
      precipitation: hourly.precipitation?.[hour] || 0,
      humidity: hourly.relative_humidity_2m?.[hour] || 50,
      temperature: hourly.temperature_2m?.[hour] || 20,
      visibility: hourly.visibility?.[hour] || 10,
      uvIndex: hourly.uv_index?.[hour] || 0
    }
  }

  /**
   * 太陽放射データを取得
   */
  private async getSolarRadiation(
    latitude: number,
    longitude: number,
    dateTime: Date
  ): Promise<SolarRadiation> {
    const date = dateTime.toISOString().split('T')[0]
    const hour = dateTime.getHours()

    const response = await axios.get(`${this.openMeteoBaseUrl}/forecast`, {
      params: {
        latitude,
        longitude,
        start_date: date,
        end_date: date,
        hourly: [
          'direct_radiation',
          'diffuse_radiation',
          'global_tilted_irradiance'
        ].join(','),
        timezone: 'auto'
      }
    })

    const hourly = response.data.hourly

    const direct = hourly.direct_radiation?.[hour] || 0
    const diffuse = hourly.diffuse_radiation?.[hour] || 0
    const global = hourly.global_tilted_irradiance?.[hour] || direct + diffuse

    return {
      direct,
      diffuse,
      global,
      atmospheric: this.calculateAtmosphericTransmittance(direct, diffuse)
    }
  }

  /**
   * 住所から環境情報を分析
   */
  private async analyzeLocationEnvironment(
    latitude: number,
    longitude: number,
    address: string
  ): Promise<LocationEnvironment> {
    // 住所から都市化レベルを推定
    let urbanDensity: 'urban' | 'suburban' | 'rural' = 'suburban'
    
    if (address.includes('東京') || address.includes('大阪') || address.includes('名古屋')) {
      if (address.includes('区') || address.includes('中央') || address.includes('駅')) {
        urbanDensity = 'urban'
      }
    } else if (address.includes('市') || address.includes('町')) {
      urbanDensity = 'suburban'
    } else if (address.includes('村') || address.includes('郡')) {
      urbanDensity = 'rural'
    }

    // 標高データを取得（簡易的に緯度から推定）
    const altitude = Math.max(0, (latitude - 35) * 100) // 簡易推定

    // 都市部では周辺の遮蔽物が多い
    const nearbyObstructions = urbanDensity === 'urban'

    // 都市化レベルに応じた大気質
    const airQuality = urbanDensity === 'urban' ? 'moderate' : 
                      urbanDensity === 'suburban' ? 'good' : 'good'

    return {
      urbanDensity,
      altitude,
      nearbyObstructions,
      airQuality
    }
  }

  /**
   * 高度な影の特性を計算（詳細地域情報考慮）
   */
  private calculateAdvancedShadowProperties(
    weather: WeatherConditions,
    radiation: SolarRadiation,
    solarPosition: SolarPosition,
    environment: LocationEnvironment,
    detailedLocation: DetailedLocationInfo,
    dateTime: Date
  ): AdvancedShadowData {
    // 雲量による光の質の判定
    let lightQuality: 'harsh' | 'soft' | 'diffused' | 'overcast'
    if (weather.cloudCover > 80) {
      lightQuality = 'overcast'
    } else if (weather.cloudCover > 50) {
      lightQuality = 'diffused'
    } else if (weather.cloudCover > 20) {
      lightQuality = 'soft'
    } else {
      lightQuality = 'harsh'
    }

    // 影の濃さを計算（直達日射量、雲量、大気質を考慮）
    let shadowIntensity = 0.8 // ベース値
    
    // 雲量の影響
    shadowIntensity *= (1 - weather.cloudCover / 100 * 0.7)
    
    // 太陽高度の影響
    const altitudeRad = solarPosition.altitude * Math.PI / 180
    shadowIntensity *= Math.sin(altitudeRad) * 0.5 + 0.5
    
    // 大気質の影響
    if (environment.airQuality === 'poor') {
      shadowIntensity *= 0.85
    } else if (environment.airQuality === 'moderate') {
      shadowIntensity *= 0.92
    }

    // 詳細な都市化による散乱光の影響
    const urbanIntensityFactor = 1 - (detailedLocation.urbanDensityScore / 10) * 0.15
    shadowIntensity *= urbanIntensityFactor
    
    // 周辺建物による遮蔽効果
    shadowIntensity *= (1 - detailedLocation.shadowingFactor * 0.2)
    
    // 地域の大気質による影響
    const airQualityFactor = detailedLocation.airQualityIndex / 10
    shadowIntensity *= 0.8 + airQualityFactor * 0.2

    // 影の色を計算（時間帯と天候による）
    const shadowColor = this.calculateShadowColor(dateTime, weather, solarPosition)

    // 環境光の明るさ（詳細地域情報考慮）
    let ambientBrightness = Math.min(1, 
      (radiation.diffuse / 200) * (1 - weather.cloudCover / 100 * 0.3)
    )
    
    // 都市部の反射光による環境光増加
    ambientBrightness += detailedLocation.reflectionFactor * 0.3
    
    // 天空率による環境光調整
    ambientBrightness *= detailedLocation.skyViewFactor
    
    ambientBrightness = Math.max(0.1, Math.min(1, ambientBrightness))

    // 影の鮮明度（直達日射量と雲量による）
    const shadowSharpness = lightQuality === 'harsh' ? 0.9 :
                           lightQuality === 'soft' ? 0.7 :
                           lightQuality === 'diffused' ? 0.4 : 0.2

    return {
      shadowIntensity: Math.max(0.1, Math.min(1, shadowIntensity)),
      shadowColor,
      lightQuality,
      ambientBrightness,
      shadowSharpness
    }
  }

  /**
   * 時間帯と天候に応じた影の色を計算
   */
  private calculateShadowColor(
    dateTime: Date,
    weather: WeatherConditions,
    solarPosition: SolarPosition
  ): string {
    const hour = dateTime.getHours()
    
    // 基本の影の色
    let r = 0.2, g = 0.2, b = 0.4

    // 時間帯による色調変化
    if (hour < 8 || hour > 16) {
      // 朝夕は暖色系
      r += 0.2
      g += 0.1
    } else if (hour >= 11 && hour <= 14) {
      // 正午前後は中性色
      g += 0.1
      b += 0.1
    }

    // 雲量による色調変化
    if (weather.cloudCover > 50) {
      // 曇りの日は青味がかる
      b += 0.15
      r -= 0.05
    }

    // 太陽高度による調整
    const altitudeFactor = Math.sin(solarPosition.altitude * Math.PI / 180)
    b += (1 - altitudeFactor) * 0.2

    // RGB値を0-255に変換
    const red = Math.round(Math.max(0, Math.min(255, r * 255)))
    const green = Math.round(Math.max(0, Math.min(255, g * 255)))
    const blue = Math.round(Math.max(0, Math.min(255, b * 255)))

    return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`
  }

  /**
   * 大気透過率を計算
   */
  private calculateAtmosphericTransmittance(direct: number, diffuse: number): number {
    const total = direct + diffuse
    if (total === 0) return 0
    return Math.min(1, total / 1000) // 晴天時の最大値を1000W/m²と仮定
  }

  /**
   * 季節補正係数を計算
   */
  private calculateSeasonalFactor(dateTime: Date): number {
    const month = dateTime.getMonth()
    // 夏至(6月)を1.0、冬至(12月)を0.6とする正弦波
    return 0.8 + 0.2 * Math.sin((month - 3) * Math.PI / 6)
  }

  /**
   * 時間補正係数を計算
   */
  private calculateTimeOfDayFactor(dateTime: Date, solarPosition: SolarPosition): number {
    const hour = dateTime.getHours()
    if (hour < 6 || hour > 18) return 0.1
    
    // 太陽高度に基づく係数
    return Math.max(0.1, Math.sin(solarPosition.altitude * Math.PI / 180))
  }

  /**
   * フォールバック分析データ
   */
  private getFallbackAnalysis(
    latitude: number,
    longitude: number,
    dateTime: Date
  ): PreciseSolarAnalysis {
    return {
      weather: {
        cloudCover: 30,
        precipitation: 0,
        humidity: 60,
        temperature: 20,
        visibility: 10,
        uvIndex: 5
      },
      radiation: {
        direct: 500,
        diffuse: 200,
        global: 700,
        atmospheric: 0.7
      },
      shadowData: {
        shadowIntensity: 0.7,
        shadowColor: '#2a2a40',
        lightQuality: 'soft',
        ambientBrightness: 0.5,
        shadowSharpness: 0.6
      },
      environment: {
        urbanDensity: 'suburban',
        altitude: 50,
        nearbyObstructions: false,
        airQuality: 'good'
      },
      seasonalFactor: 0.8,
      timeOfDayFactor: 0.7
    }
  }
}

export const advancedSolarAnalysisService = new AdvancedSolarAnalysisService()