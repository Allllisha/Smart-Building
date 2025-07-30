import { Project } from '@/types/project'
import { detailedLocationAnalysisService } from './detailedLocationAnalysis.service'
import { detailedShadowCalculationService, DetailedVolumeCheckResult } from './detailedShadowCalculation.service'
import * as THREE from 'three'

export interface ZoneRegulation {
  zone: string                    // 用途地域
  targetHeight: number           // 規制対象高さ (m)
  targetFloors: number           // 規制対象階数
  measurementHeight: number      // 測定高 (m)
  restrictions: {
    range5to10m: number         // 5-10m範囲制限時間 (h)
    rangeOver10m: number        // 10m超範囲制限時間 (h)
  }
  timeRange: {
    start: number               // 測定開始時刻
    end: number                 // 測定終了時刻
  }
}

export interface ShadowCheckPoint {
  x: number                      // X座標 (m)
  y: number                      // Y座標 (m)
  distanceFromBoundary: number   // 境界からの距離 (m)
  shadowHours: number           // 日影時間 (h)
  isCompliant: boolean          // 規制適合
  applicableLimit: number       // 適用制限時間 (h)
}

export interface VolumeCheckResult {
  isCompliant: boolean          // 全体適合状況
  regulation: ZoneRegulation    // 適用規制
  checkPoints: ShadowCheckPoint[] // チェックポイント
  maxViolationHours: number     // 最大超過時間
  violationArea: number         // 違反エリア面積 (㎡)
  complianceRate: number        // 適合率 (%)
  recommendations: string[]     // 修正提案
  detailedResult?: DetailedVolumeCheckResult // 詳細計算結果
}

export interface WinterSolsticeData {
  date: Date                    // 冬至日
  sunPath: {
    time: number               // 時刻 (0-24)
    altitude: number           // 太陽高度 (度)
    azimuth: number           // 太陽方位 (度)
  }[]
}

class ShadowRegulationCheckService {
  private regulationCache = new Map<string, ZoneRegulation>()

  /**
   * プロジェクトの日影規制チェックを実行
   */
  async checkShadowRegulation(project: Project): Promise<VolumeCheckResult> {
    console.log('🏗️ 建築基準法日影規制チェック開始')

    try {
      // 詳細地域情報を取得
      const locationInfo = await detailedLocationAnalysisService.analyzeDetailedLocation(
        project.location.latitude,
        project.location.longitude,
        project.location.address
      )

      // 適用される規制を判定
      const regulation = await this.determineApplicableRegulation(
        project.location.address,
        locationInfo.prefecture,
        locationInfo.city,
        locationInfo.ward
      )

      // 建物が規制対象かチェック
      const buildingHeight = project.buildingInfo.maxHeight / 1000 // mm to m
      const isSubjectToRegulation = this.isBuildingSubjectToRegulation(
        buildingHeight,
        project.buildingInfo.floors,
        regulation
      )

      if (!isSubjectToRegulation) {
        return this.createNonSubjectResult(regulation)
      }

      // 冬至日の太陽軌道データを計算
      const winterSolsticeData = this.calculateWinterSolsticeData(
        project.location.latitude,
        project.location.longitude
      )

      // 入力情報から詳細建物形状を生成
      console.log('🏗️ 入力情報から建物形状を生成中...')
      const buildingGeometry = detailedShadowCalculationService.generateDetailedBuildingGeometry(project)
      
      // 詳細日影計算を実行
      console.log('🌅 詳細日影シミュレーション実行中...')
      const detailedResult = await detailedShadowCalculationService.calculateDetailedShadows(
        buildingGeometry,
        winterSolsticeData,
        regulation
      )
      
      // 従来形式の結果も生成（互換性のため）
      const shadowCheckResult = this.convertToCompatibleResult(detailedResult, regulation)
      shadowCheckResult.detailedResult = detailedResult

      console.log('✅ 日影規制チェック完了')
      return shadowCheckResult

    } catch (error) {
      console.error('日影規制チェックエラー:', error)
      return this.createErrorResult()
    }
  }

  /**
   * 適用される日影規制を判定
   */
  private async determineApplicableRegulation(
    address: string,
    prefecture: string,
    city: string,
    ward: string
  ): Promise<ZoneRegulation> {
    const cacheKey = `${prefecture}_${city}_${ward}`
    
    if (this.regulationCache.has(cacheKey)) {
      return this.regulationCache.get(cacheKey)!
    }

    // 用途地域を推定（実際は都市計画図等から取得）
    const zoneType = this.estimateZoneType(address, prefecture, city, ward)
    const regulation = this.getRegulationByZone(zoneType)
    
    this.regulationCache.set(cacheKey, regulation)
    return regulation
  }

  /**
   * 住所から用途地域を推定
   */
  private estimateZoneType(address: string, prefecture: string, city: string, ward: string): string {
    // 実際の運用では自治体のオープンデータAPIを使用
    
    // 東京23区の推定
    if (prefecture === '東京都' && ward) {
      const commercialWards = ['千代田区', '中央区', '港区', '新宿区', '渋谷区']
      const residentialWards = ['世田谷区', '杉並区', '練馬区', '大田区']
      
      if (commercialWards.includes(ward)) {
        if (address.includes('商業') || address.includes('駅')) {
          return '商業地域'
        }
        return '第一種中高層住居専用地域'
      } else if (residentialWards.includes(ward)) {
        return '第一種低層住居専用地域'
      } else {
        return '第一種中高層住居専用地域'
      }
    }

    // その他の地域
    if (city.includes('市')) {
      return '第一種中高層住居専用地域'
    }
    
    return '第一種低層住居専用地域' // デフォルト
  }

  /**
   * 用途地域別規制値を取得
   */
  private getRegulationByZone(zoneType: string): ZoneRegulation {
    const regulations: { [key: string]: ZoneRegulation } = {
      '第一種低層住居専用地域': {
        zone: '第一種低層住居専用地域',
        targetHeight: 7, // 軒高7m超または3階建以上
        targetFloors: 3,
        measurementHeight: 1.5,
        restrictions: { range5to10m: 3, rangeOver10m: 2 },
        timeRange: { start: 8, end: 16 }
      },
      '第二種低層住居専用地域': {
        zone: '第二種低層住居専用地域',
        targetHeight: 7,
        targetFloors: 3,
        measurementHeight: 1.5,
        restrictions: { range5to10m: 4, rangeOver10m: 2.5 },
        timeRange: { start: 8, end: 16 }
      },
      '第一種中高層住居専用地域': {
        zone: '第一種中高層住居専用地域',
        targetHeight: 10,
        targetFloors: 0, // 高さのみで判定
        measurementHeight: 4,
        restrictions: { range5to10m: 4, rangeOver10m: 2.5 },
        timeRange: { start: 8, end: 16 }
      },
      '第二種中高層住居専用地域': {
        zone: '第二種中高層住居専用地域',
        targetHeight: 10,
        targetFloors: 0,
        measurementHeight: 4,
        restrictions: { range5to10m: 4, rangeOver10m: 2.5 },
        timeRange: { start: 8, end: 16 }
      },
      '第一種住居地域': {
        zone: '第一種住居地域',
        targetHeight: 10,
        targetFloors: 0,
        measurementHeight: 4,
        restrictions: { range5to10m: 4, rangeOver10m: 2.5 },
        timeRange: { start: 8, end: 16 }
      },
      '第二種住居地域': {
        zone: '第二種住居地域',
        targetHeight: 10,
        targetFloors: 0,
        measurementHeight: 4,
        restrictions: { range5to10m: 4, rangeOver10m: 2.5 },
        timeRange: { start: 8, end: 16 }
      },
      '準住居地域': {
        zone: '準住居地域',
        targetHeight: 10,
        targetFloors: 0,
        measurementHeight: 4,
        restrictions: { range5to10m: 4, rangeOver10m: 2.5 },
        timeRange: { start: 8, end: 16 }
      },
      '近隣商業地域': {
        zone: '近隣商業地域',
        targetHeight: 10,
        targetFloors: 0,
        measurementHeight: 4,
        restrictions: { range5to10m: 4, rangeOver10m: 2.5 },
        timeRange: { start: 8, end: 16 }
      },
      '準工業地域': {
        zone: '準工業地域',
        targetHeight: 10,
        targetFloors: 0,
        measurementHeight: 4,
        restrictions: { range5to10m: 4, rangeOver10m: 2.5 },
        timeRange: { start: 8, end: 16 }
      }
    }

    return regulations[zoneType] || regulations['第一種低層住居専用地域']
  }

  /**
   * 建物が規制対象かチェック
   */
  private isBuildingSubjectToRegulation(
    buildingHeight: number,
    floors: number,
    regulation: ZoneRegulation
  ): boolean {
    // 低層住居専用地域の場合
    if (regulation.zone.includes('低層住居専用')) {
      return buildingHeight > regulation.targetHeight || floors >= regulation.targetFloors
    }
    
    // その他の地域は高さのみで判定
    return buildingHeight > regulation.targetHeight
  }

  /**
   * 冬至日の太陽軌道データを計算
   */
  private calculateWinterSolsticeData(latitude: number, longitude: number): WinterSolsticeData {
    const currentYear = new Date().getFullYear()
    const winterSolstice = new Date(currentYear, 11, 21, 12, 0, 0) // 12月21日

    const sunPath = []
    for (let hour = 0; hour < 24; hour += 0.5) {
      const testDate = new Date(winterSolstice)
      testDate.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0)
      
      const sunPosition = this.calculateSunPosition(testDate, latitude, longitude)
      sunPath.push({
        time: hour,
        altitude: sunPosition.altitude,
        azimuth: sunPosition.azimuth
      })
    }

    return {
      date: winterSolstice,
      sunPath
    }
  }

  /**
   * 太陽位置計算（天文計算）
   */
  private calculateSunPosition(date: Date, latitude: number, longitude: number) {
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180)
    
    const hour = date.getHours() + date.getMinutes() / 60
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
      azimuth: (azimuth * 180 / Math.PI + 180) % 360
    }
  }

  /**
   * 詳細計算結果を従来形式に変換
   */
  private convertToCompatibleResult(
    detailedResult: DetailedVolumeCheckResult,
    regulation: ZoneRegulation
  ): VolumeCheckResult {
    // 詳細結果を従来のShadowCheckPoint形式に変換
    const checkPoints: ShadowCheckPoint[] = detailedResult.checkPoints.map(point => ({
      x: point.x,
      y: point.y,
      distanceFromBoundary: point.distanceFromBoundary,
      shadowHours: point.totalShadowHours,
      isCompliant: point.isCompliant,
      applicableLimit: point.distanceFromBoundary <= 10 ? 
        regulation.restrictions.range5to10m : 
        regulation.restrictions.rangeOver10m
    }))
    
    const violationPoints = checkPoints.filter(p => !p.isCompliant)
    const maxViolationHours = violationPoints.length > 0 ? 
      Math.max(...violationPoints.map(p => p.shadowHours - p.applicableLimit)) : 0
    const violationArea = violationPoints.length * 1 // 1m²グリッド
    const complianceRate = (checkPoints.length - violationPoints.length) / checkPoints.length * 100
    
    // 詳細推奨事項を簡易形式に変換
    const recommendations = detailedResult.recommendations.map(rec => rec.description)
    
    return {
      isCompliant: detailedResult.isCompliant,
      regulation,
      checkPoints,
      maxViolationHours,
      violationArea,
      complianceRate,
      recommendations
    }
  }

  /**
   * 建物の日影を計算（従来の簡易版 - 詳細計算の後継として残す）
   */
  private async calculateBuildingShadow(
    project: Project,
    regulation: ZoneRegulation,
    winterSolsticeData: WinterSolsticeData
  ): Promise<VolumeCheckResult> {
    // 建物の基本形状（簡易的な直方体として計算）
    const buildingWidth = Math.sqrt(project.buildingInfo.buildingArea)
    const buildingDepth = buildingWidth
    const buildingHeight = project.buildingInfo.maxHeight / 1000 // mm to m

    // チェックポイントを生成（敷地周辺に格子状に配置）
    const checkPoints: ShadowCheckPoint[] = []
    const gridSize = 2 // 2mグリッド
    const checkRange = 30 // 30m範囲をチェック

    for (let x = -checkRange; x <= checkRange; x += gridSize) {
      for (let y = -checkRange; y <= checkRange; y += gridSize) {
        // 建物内部は除外
        if (Math.abs(x) < buildingWidth/2 && Math.abs(y) < buildingDepth/2) continue

        const distanceFromBoundary = Math.max(
          Math.abs(x) - buildingWidth/2,
          Math.abs(y) - buildingDepth/2
        )

        // 境界から50m以内のみチェック
        if (distanceFromBoundary > 50) continue

        // この点での日影時間を計算
        const shadowHours = this.calculateShadowHoursAtPoint(
          x, y, buildingWidth, buildingDepth, buildingHeight,
          winterSolsticeData, regulation
        )

        // 適用される制限時間を判定
        const applicableLimit = distanceFromBoundary <= 10 ? 
          regulation.restrictions.range5to10m : 
          regulation.restrictions.rangeOver10m

        const isCompliant = shadowHours <= applicableLimit

        checkPoints.push({
          x, y, distanceFromBoundary, shadowHours, isCompliant, applicableLimit
        })
      }
    }

    // 結果を集計
    const violationPoints = checkPoints.filter(p => !p.isCompliant)
    const maxViolationHours = Math.max(0, ...violationPoints.map(p => p.shadowHours - p.applicableLimit))
    const violationArea = violationPoints.length * gridSize * gridSize
    const complianceRate = (checkPoints.length - violationPoints.length) / checkPoints.length * 100

    // 修正提案を生成
    const recommendations = this.generateRecommendations(
      maxViolationHours,
      violationArea,
      buildingHeight,
      regulation
    )

    return {
      isCompliant: violationPoints.length === 0,
      regulation,
      checkPoints,
      maxViolationHours,
      violationArea,
      complianceRate,
      recommendations
    }
  }

  /**
   * 特定地点での日影時間を計算
   */
  private calculateShadowHoursAtPoint(
    pointX: number,
    pointY: number,
    buildingWidth: number,
    buildingDepth: number,
    buildingHeight: number,
    winterSolsticeData: WinterSolsticeData,
    regulation: ZoneRegulation
  ): number {
    let shadowHours = 0
    const timeStep = 0.5 // 30分間隔

    for (const sunData of winterSolsticeData.sunPath) {
      // 測定時間範囲外は除外
      if (sunData.time < regulation.timeRange.start || sunData.time > regulation.timeRange.end) {
        continue
      }

      // 太陽が地平線下の場合は除外
      if (sunData.altitude <= 0) continue

      // この時刻に当該点が建物の影の中にあるかチェック
      const inShadow = this.isPointInBuildingShadow(
        pointX, pointY, regulation.measurementHeight,
        buildingWidth, buildingDepth, buildingHeight,
        sunData.altitude, sunData.azimuth
      )

      if (inShadow) {
        shadowHours += timeStep
      }
    }

    return shadowHours
  }

  /**
   * 点が建物の影の中にあるかチェック
   */
  private isPointInBuildingShadow(
    pointX: number,
    pointY: number,
    measurementHeight: number,
    buildingWidth: number,
    buildingDepth: number,
    buildingHeight: number,
    sunAltitude: number,
    sunAzimuth: number
  ): boolean {
    // 太陽光線の方向ベクトル
    const sunAltRad = sunAltitude * Math.PI / 180
    const sunAzRad = sunAzimuth * Math.PI / 180

    // 測定点から太陽方向への光線と建物の交差判定
    const shadowLength = (buildingHeight - measurementHeight) / Math.tan(sunAltRad)
    
    if (shadowLength <= 0) return false

    // 影の投影位置を計算
    const shadowX = shadowLength * Math.sin(sunAzRad)
    const shadowY = shadowLength * Math.cos(sunAzRad)

    // 建物から見た影の範囲に測定点があるかチェック
    const buildingCorners = [
      { x: -buildingWidth/2, y: -buildingDepth/2 },
      { x: buildingWidth/2, y: -buildingDepth/2 },
      { x: buildingWidth/2, y: buildingDepth/2 },
      { x: -buildingWidth/2, y: buildingDepth/2 }
    ]

    // 建物の各コーナーから投影される影の範囲を計算
    const shadowPolygon = buildingCorners.map(corner => ({
      x: corner.x + shadowX,
      y: corner.y + shadowY
    }))

    // 点が影のポリゴン内にあるかチェック（簡易的な矩形判定）
    const minX = Math.min(...shadowPolygon.map(p => p.x))
    const maxX = Math.max(...shadowPolygon.map(p => p.x))
    const minY = Math.min(...shadowPolygon.map(p => p.y))
    const maxY = Math.max(...shadowPolygon.map(p => p.y))

    return pointX >= minX && pointX <= maxX && pointY >= minY && pointY <= maxY
  }

  /**
   * 修正提案を生成
   */
  private generateRecommendations(
    maxViolationHours: number,
    violationArea: number,
    buildingHeight: number,
    regulation: ZoneRegulation
  ): string[] {
    const recommendations: string[] = []

    if (maxViolationHours > 0) {
      // 高さの削減提案
      const heightReduction = Math.ceil(maxViolationHours * 2) // 簡易計算
      recommendations.push(`建物高さを${heightReduction}m程度削減することを検討してください`)

      // セットバック提案
      if (violationArea > 100) {
        recommendations.push('建物を敷地境界から2-3mセットバックすることを検討してください')
      }

      // 形状変更提案
      if (buildingHeight > regulation.targetHeight + 5) {
        recommendations.push('建物の平面形状を細長くすることで日影面積を削減できます')
      }

      // 階数調整提案
      if (regulation.zone.includes('低層')) {
        recommendations.push('3階建て未満にすることで日影規制の対象外となります')
      }
    }

    return recommendations
  }

  /**
   * 規制対象外の場合の結果
   */
  private createNonSubjectResult(regulation: ZoneRegulation): VolumeCheckResult {
    return {
      isCompliant: true,
      regulation,
      checkPoints: [],
      maxViolationHours: 0,
      violationArea: 0,
      complianceRate: 100,
      recommendations: ['この建物は日影規制の対象外です。']
    }
  }

  /**
   * エラー時の結果
   */
  private createErrorResult(): VolumeCheckResult {
    const defaultRegulation: ZoneRegulation = {
      zone: '判定不可',
      targetHeight: 10,
      targetFloors: 3,
      measurementHeight: 4,
      restrictions: { range5to10m: 4, rangeOver10m: 2.5 },
      timeRange: { start: 8, end: 16 }
    }

    return {
      isCompliant: false,
      regulation: defaultRegulation,
      checkPoints: [],
      maxViolationHours: 0,
      violationArea: 0,
      complianceRate: 0,
      recommendations: ['日影規制チェック中にエラーが発生しました。']
    }
  }
}

export const shadowRegulationCheckService = new ShadowRegulationCheckService()