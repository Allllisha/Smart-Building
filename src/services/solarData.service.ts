import axios from 'axios'

export interface SolarPosition {
  altitude: number  // 高度 (度)
  azimuth: number   // 方位角 (度)
  zenith: number    // 天頂角 (度)
}

export interface SunTimes {
  sunrise: string   // ISO形式の日の出時刻
  sunset: string    // ISO形式の日の入り時刻
  solarNoon: string // ISO形式の南中時刻
}

export interface SolarData {
  position: SolarPosition
  sunTimes: SunTimes
  isDayTime: boolean
}

export interface DailySolarData {
  date: string // YYYY-MM-DD format
  sunTimes: SunTimes
  hourlyPositions: { [hour: number]: SolarPosition } // 0-23時のデータ
}

class SolarDataService {
  private readonly baseUrl = import.meta.env.VITE_WEATHER_API_URL || 'https://api.open-meteo.com/v1'
  private cache = new Map<string, DailySolarData>() // 日付ごとのキャッシュ
  private loadingPromises = new Map<string, Promise<DailySolarData>>() // 重複リクエスト防止

  /**
   * 一日分の太陽データを一括取得（キャッシュ付き）
   */
  async getDailySolarData(
    latitude: number,
    longitude: number,
    date: Date
  ): Promise<DailySolarData> {
    const dateKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}_${date.toISOString().split('T')[0]}`
    
    // キャッシュチェック
    if (this.cache.has(dateKey)) {
      console.log('🗄️ キャッシュから太陽データを取得:', dateKey)
      return this.cache.get(dateKey)!
    }

    // 既にロード中の場合は同じPromiseを返す
    if (this.loadingPromises.has(dateKey)) {
      console.log('⏳ 既存のリクエストを待機:', dateKey)
      return this.loadingPromises.get(dateKey)!
    }

    // 新しいリクエストを開始
    const promise = this.fetchDailySolarData(latitude, longitude, date, dateKey)
    this.loadingPromises.set(dateKey, promise)

    try {
      const result = await promise
      this.cache.set(dateKey, result)
      console.log('✅ 太陽データを取得してキャッシュに保存:', dateKey)
      return result
    } finally {
      this.loadingPromises.delete(dateKey)
    }
  }

  /**
   * 実際のAPI呼び出し処理
   */
  private async fetchDailySolarData(
    latitude: number,
    longitude: number,
    date: Date,
    dateKey: string
  ): Promise<DailySolarData> {
    try {
      // Open-Meteo APIは限られた日付範囲のみサポート
      // 現在から7日前～7日後の範囲に制限
      const now = new Date()
      const minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7日前
      const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7日後
      
      let adjustedDate = date
      if (date < minDate) {
        adjustedDate = minDate
        console.warn(`⚠️ 日付を調整: ${date.toISOString().split('T')[0]} → ${minDate.toISOString().split('T')[0]}`)
      } else if (date > maxDate) {
        adjustedDate = maxDate
        console.warn(`⚠️ 日付を調整: ${date.toISOString().split('T')[0]} → ${maxDate.toISOString().split('T')[0]}`)
      }
      
      const dateStr = adjustedDate.toISOString().split('T')[0]
      
      // 太陽位置データと日の出・日の入りを並列取得
      const [positionResponse, sunTimesResponse] = await Promise.all([
        axios.get(`${this.baseUrl}/forecast`, {
          params: {
            latitude: latitude,
            longitude: longitude,
            start_date: dateStr,
            end_date: dateStr,
            hourly: 'solar_elevation_angle,solar_azimuth_angle',
            timezone: 'auto'
          }
        }),
        axios.get(`${this.baseUrl}/forecast`, {
          params: {
            latitude: latitude,
            longitude: longitude,
            start_date: dateStr,
            end_date: dateStr,
            daily: 'sunrise,sunset,solar_noon',
            timezone: 'auto'
          }
        })
      ])

      const hourlyData = positionResponse.data.hourly
      const dailyData = sunTimesResponse.data.daily

      if (!hourlyData?.solar_elevation_angle || !hourlyData?.solar_azimuth_angle) {
        throw new Error('Hourly solar data not available')
      }

      // 24時間分のデータを作成
      const hourlyPositions: { [hour: number]: SolarPosition } = {}
      for (let hour = 0; hour < 24; hour++) {
        const elevation = hourlyData.solar_elevation_angle[hour] || 0
        const azimuth = hourlyData.solar_azimuth_angle[hour] || 0
        
        hourlyPositions[hour] = {
          altitude: elevation,
          azimuth: azimuth,
          zenith: 90 - elevation
        }
      }

      const sunTimes: SunTimes = {
        sunrise: dailyData.sunrise?.[0] || '',
        sunset: dailyData.sunset?.[0] || '',
        solarNoon: dailyData.solar_noon?.[0] || ''
      }

      return {
        date: dateStr,
        sunTimes,
        hourlyPositions
      }
    } catch (error) {
      console.warn('Open-Meteo API呼び出しに失敗、フォールバック計算を使用:', error)
      return this.generateFallbackDailyData(latitude, longitude, date)
    }
  }

  /**
   * 指定された日時と場所の太陽位置を計算（キャッシュ使用）
   */
  async getSolarPosition(
    latitude: number,
    longitude: number,
    dateTime: Date
  ): Promise<SolarPosition> {
    const dailyData = await this.getDailySolarData(latitude, longitude, dateTime)
    const hour = dateTime.getHours()
    const minute = dateTime.getMinutes()
    
    // 時間と分から正確な位置を補間
    const currentHourData = dailyData.hourlyPositions[hour]
    const nextHourData = dailyData.hourlyPositions[hour + 1] || currentHourData
    
    if (!currentHourData) {
      return this.calculateSolarPositionFallback(latitude, longitude, dateTime)
    }

    // 分単位の補間
    const minuteRatio = minute / 60
    const altitude = currentHourData.altitude + (nextHourData.altitude - currentHourData.altitude) * minuteRatio
    const azimuth = currentHourData.azimuth + (nextHourData.azimuth - currentHourData.azimuth) * minuteRatio

    return {
      altitude,
      azimuth,
      zenith: 90 - altitude
    }
  }

  /**
   * 日の出・日の入り時刻を取得（キャッシュ使用）
   */
  async getSunTimes(
    latitude: number,
    longitude: number,
    date: Date
  ): Promise<SunTimes> {
    const dailyData = await this.getDailySolarData(latitude, longitude, date)
    return dailyData.sunTimes
  }

  /**
   * 総合的な太陽データを取得（キャッシュ使用）
   */
  async getSolarData(
    latitude: number,
    longitude: number,
    dateTime: Date
  ): Promise<SolarData> {
    const dailyData = await this.getDailySolarData(latitude, longitude, dateTime)
    const position = await this.getSolarPosition(latitude, longitude, dateTime)
    
    const currentTime = dateTime.getTime()
    const sunriseTime = dailyData.sunTimes.sunrise ? new Date(dailyData.sunTimes.sunrise).getTime() : 0
    const sunsetTime = dailyData.sunTimes.sunset ? new Date(dailyData.sunTimes.sunset).getTime() : 0
    
    const isDayTime = sunriseTime > 0 && sunsetTime > 0 && 
                     currentTime >= sunriseTime && currentTime <= sunsetTime

    return {
      position,
      sunTimes: dailyData.sunTimes,
      isDayTime
    }
  }

  /**
   * フォールバック用の一日データ生成
   */
  private generateFallbackDailyData(
    latitude: number,
    longitude: number,
    date: Date
  ): DailySolarData {
    const dateStr = date.toISOString().split('T')[0]
    const hourlyPositions: { [hour: number]: SolarPosition } = {}
    
    // 24時間分のフォールバックデータを生成
    for (let hour = 0; hour < 24; hour++) {
      const testDate = new Date(date)
      testDate.setHours(hour, 0, 0, 0)
      hourlyPositions[hour] = this.calculateSolarPositionFallback(latitude, longitude, testDate)
    }

    const sunTimes = this.calculateSunTimesFallback(latitude, longitude, date)

    return {
      date: dateStr,
      sunTimes,
      hourlyPositions
    }
  }

  /**
   * 複数日のデータを事前読み込み（夏至・冬至・春分・秋分）
   */
  async preloadSeasonalData(
    latitude: number,
    longitude: number,
    year: number = new Date().getFullYear()
  ): Promise<void> {
    const seasonalDates = [
      new Date(year, 5, 21),  // 6月21日（夏至）
      new Date(year, 11, 21), // 12月21日（冬至）
      new Date(year, 2, 20),  // 3月20日（春分）
      new Date(year, 8, 23),  // 9月23日（秋分）
    ]

    console.log('🔄 季節データのプリロードを開始...')
    
    // 並列でデータを取得
    const promises = seasonalDates.map(date => 
      this.getDailySolarData(latitude, longitude, date)
        .catch(error => {
          console.warn(`季節データの取得に失敗: ${date.toISOString().split('T')[0]}`, error)
          return null
        })
    )

    await Promise.all(promises)
    console.log('✅ 季節データのプリロード完了')
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear()
    this.loadingPromises.clear()
    console.log('🗑️ 太陽データキャッシュをクリア')
  }

  /**
   * フォールバック用の簡易太陽位置計算
   */
  private calculateSolarPositionFallback(
    latitude: number,
    longitude: number,
    dateTime: Date
  ): SolarPosition {
    const dayOfYear = Math.floor(
      (dateTime.getTime() - new Date(dateTime.getFullYear(), 0, 0).getTime()) / 
      (1000 * 60 * 60 * 24)
    )
    
    const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180)
    const hour = dateTime.getHours() + dateTime.getMinutes() / 60
    const hourAngle = (hour - 12) * 15
    
    const latRad = latitude * Math.PI / 180
    const decRad = declination * Math.PI / 180
    const hourRad = hourAngle * Math.PI / 180
    
    const altitude = Math.asin(
      Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourRad)
    )
    
    const azimuth = Math.atan2(
      -Math.sin(hourRad),
      Math.tan(decRad) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(hourRad)
    )
    
    return {
      altitude: altitude * 180 / Math.PI,
      azimuth: (azimuth * 180 / Math.PI + 180) % 360, // 0-360度に正規化
      zenith: 90 - (altitude * 180 / Math.PI)
    }
  }

  /**
   * フォールバック用の簡易日の出・日の入り計算
   */
  private calculateSunTimesFallback(
    latitude: number,
    longitude: number,
    date: Date
  ): SunTimes {
    // 簡易計算（実際にはもっと複雑）
    const baseDate = new Date(date)
    baseDate.setHours(6, 0, 0, 0) // 仮の日の出時刻
    const sunrise = baseDate.toISOString()
    
    baseDate.setHours(18, 0, 0, 0) // 仮の日の入り時刻
    const sunset = baseDate.toISOString()
    
    baseDate.setHours(12, 0, 0, 0) // 仮の南中時刻
    const solarNoon = baseDate.toISOString()

    return { sunrise, sunset, solarNoon }
  }
}

export const solarDataService = new SolarDataService()