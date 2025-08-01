import { Project } from '@/types/project'
import { detailedLocationAnalysisService } from './detailedLocationAnalysis.service'
import { detailedShadowCalculationService, DetailedVolumeCheckResult } from './detailedShadowCalculation.service'
// import * as THREE from 'three'

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
   * 敷地情報のみで日影規制チェックを実行（面積・規制情報ステップ用）
   */
  async checkShadowRegulationForSite(project: Project): Promise<any> {
    console.log('🏗️ 敷地情報による日影規制チェック開始')

    // 必要なデータの存在確認
    if (!project?.location?.latitude || !project?.location?.longitude) {
      throw new Error('プロジェクトの位置情報が不足しています')
    }

    try {
      // 詳細地域情報を取得
      const locationInfo = await detailedLocationAnalysisService.analyzeDetailedLocation(
        project.location.latitude,
        project.location.longitude,
        project.location.address || ''
      )

      // 適用される規制を判定（プロジェクトデータを渡す）
      const regulation = await this.determineApplicableRegulation(
        project.location.address,
        locationInfo.prefecture,
        locationInfo.city,
        locationInfo.ward,
        project
      )

      // 敷地情報に基づく建築可能性を判定
      const buildabilityResult = this.evaluateBuildability(project, regulation)
      const siteArea = project.siteInfo.siteArea || 0
      const buildingCoverage = project.siteInfo.buildingCoverage || 0
      const floorAreaRatio = project.siteInfo.floorAreaRatio || 0
      
      console.log('🔍 日影規制チェック - 入力値確認:', {
        siteArea,
        buildingCoverage,
        floorAreaRatio,
        roadWidth: project.siteInfo.roadWidth,
        buildable: buildabilityResult.isBuildable,
        rawSiteInfo: project.siteInfo
      })

      return {
        overallStatus: buildabilityResult.isBuildable ? 'OK' : 'NG',
        summary: buildabilityResult.summary,
        regulations: {
          fiveToTenMeters: regulation.restrictions.range5to10m,
          overTenMeters: regulation.restrictions.rangeOver10m,
          measurementHeight: regulation.measurementHeight
        },
        checkItems: [
          {
            name: '建築可能性',
            description: buildabilityResult.isBuildable ? '条件を満たしています' : '制約があります',
            status: buildabilityResult.isBuildable ? 'OK' : 'NG',
            value: buildabilityResult.isBuildable ? '可能' : '制約あり'
          },
          {
            name: '敷地面積',
            description: siteArea >= 50 ? `${siteArea}㎡（適正）` : `${siteArea}㎡（狭小）`,
            status: siteArea >= 50 ? 'OK' : 'NG',
            value: `${siteArea}㎡`
          },
          {
            name: '建蔽率',
            description: buildingCoverage >= 30 ? `${buildingCoverage}%（建築可能）` : buildingCoverage > 0 ? `${buildingCoverage}%（制限あり）` : '設定要確認',
            status: buildingCoverage >= 30 ? 'OK' : buildingCoverage > 0 ? 'WARNING' : 'NG',
            value: `${buildingCoverage}%`
          },
          {
            name: '容積率',
            description: floorAreaRatio >= 50 ? `${floorAreaRatio}%（建築可能）` : floorAreaRatio > 0 ? `${floorAreaRatio}%（制限あり）` : '設定要確認',
            status: floorAreaRatio >= 50 ? 'OK' : floorAreaRatio > 0 ? 'WARNING' : 'NG',
            value: `${floorAreaRatio}%`
          },
          {
            name: '前面道路幅',
            description: project.siteInfo.roadWidth ? 
              (project.siteInfo.roadWidth >= 4 ? `${project.siteInfo.roadWidth}m（適正）` : `${project.siteInfo.roadWidth}m（狭い）`) :
              '未設定',
            status: project.siteInfo.roadWidth ? 
              (project.siteInfo.roadWidth >= 4 ? 'OK' : 'WARNING') : 
              'NG',
            value: project.siteInfo.roadWidth ? `${project.siteInfo.roadWidth}m` : '未設定'
          },
          {
            name: '日影規制',
            description: `5-10m範囲: ${regulation.restrictions.range5to10m}時間, 10m超: ${regulation.restrictions.rangeOver10m}時間`,
            status: regulation.restrictions.range5to10m >= 3 && regulation.restrictions.rangeOver10m >= 2 ? 'OK' : 'WARNING',
            value: `${regulation.restrictions.range5to10m}h/${regulation.restrictions.rangeOver10m}h`
          }
        ]
      }

    } catch (error) {
      console.error('敷地日影規制チェックエラー:', error)
      throw error
    }
  }

  /**
   * プロジェクトの日影規制チェックを実行
   */
  async checkShadowRegulation(project: Project): Promise<VolumeCheckResult> {
    console.log('🏗️ 建築基準法日影規制チェック開始')

    // 必要なデータの存在確認
    if (!project?.location?.latitude || !project?.location?.longitude) {
      throw new Error('プロジェクトの位置情報が不足しています')
    }

    try {
      // 詳細地域情報を取得
      const locationInfo = await detailedLocationAnalysisService.analyzeDetailedLocation(
        project.location.latitude,
        project.location.longitude,
        project.location.address || ''
      )

      // 適用される規制を判定（プロジェクトデータを渡す）
      const regulation = await this.determineApplicableRegulation(
        project.location.address,
        locationInfo.prefecture,
        locationInfo.city,
        locationInfo.ward,
        project
      )

      // 建物が規制対象かチェック
      const buildingHeight = (project.buildingInfo.maxHeight || 3000) / 1000 // mm to m
      const isSubjectToRegulation = this.isBuildingSubjectToRegulation(
        buildingHeight,
        project.buildingInfo.floors || 1,
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
    ward: string,
    project?: Project
  ): Promise<ZoneRegulation> {
    // プロジェクトに保存された規制情報を優先的に使用
    if (project?.siteInfo?.shadowRegulation?.targetArea && project?.siteInfo?.zoningType) {
      console.log('📋 保存された規制情報を使用')
      
      // 保存された用途地域を使用
      const zoneType = project.siteInfo.zoningType
      const savedRegulation = project.siteInfo.shadowRegulation
      
      // 保存された規制情報から ZoneRegulation を構築
      const regulation: ZoneRegulation = {
        zone: zoneType,
        targetHeight: this.getTargetHeightForZone(zoneType),
        targetFloors: this.getTargetFloorsForZone(zoneType),
        measurementHeight: savedRegulation.measurementHeight || 4,
        restrictions: {
          range5to10m: savedRegulation.allowedShadowTime5to10m || 4,
          rangeOver10m: savedRegulation.allowedShadowTimeOver10m || 2.5
        },
        timeRange: { start: 8, end: 16 } // 標準的な測定時間帯
      }
      
      // 測定時間帯の解析（例: "冬至日の午前8時から午後4時"）
      if (savedRegulation.measurementTime) {
        const timeMatch = savedRegulation.measurementTime.match(/午前(\d+)時.*?午後(\d+)時/)
        if (timeMatch) {
          regulation.timeRange.start = parseInt(timeMatch[1])
          regulation.timeRange.end = parseInt(timeMatch[2]) + 12 // 午後は12を加算
        }
      }
      
      this.regulationCache.set(`${prefecture}_${city}_${ward}`, regulation)
      return regulation
    }

    // 保存されていない場合は従来の推定ロジックを使用
    console.log('⚠️ 保存された規制情報がないため、推定値を使用')
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
   * 用途地域から規制対象高さを取得
   */
  private getTargetHeightForZone(zoneType: string): number {
    // 低層住居専用地域
    if (zoneType.includes('低層住居専用')) {
      return 7 // 軒高7m超
    }
    // その他の地域
    return 10 // 高さ10m超
  }

  /**
   * 用途地域から規制対象階数を取得
   */
  private getTargetFloorsForZone(zoneType: string): number {
    // 低層住居専用地域
    if (zoneType.includes('低層住居専用')) {
      return 3 // 3階建以上
    }
    // その他の地域は高さのみで判定
    return 0
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
    // 現在の年から1年前の冬至を使用（API範囲内に収めるため）
    const winterSolsticeYear = currentYear - 1
    const winterSolstice = new Date(winterSolsticeYear, 11, 21, 12, 0, 0) // 12月21日

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
  private calculateSunPosition(date: Date, latitude: number, _longitude: number) {
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
   * 敷地情報に基づく建築可能性を評価
   */
  private evaluateBuildability(project: Project, regulation: ZoneRegulation): { isBuildable: boolean, summary: string } {
    const siteArea = project.siteInfo.siteArea || 0
    const buildingCoverage = project.siteInfo.buildingCoverage || 0
    const floorAreaRatio = project.siteInfo.floorAreaRatio || 0

    console.log('📊 建築可能性評価 - 詳細:', { 
      siteArea, 
      buildingCoverage, 
      floorAreaRatio,
      originalSiteInfo: project.siteInfo,
      checkResults: {
        siteAreaCheck: !siteArea,
        buildingCoverageCheck: !buildingCoverage,
        floorAreaRatioCheck: !floorAreaRatio
      }
    })

    // 必要な情報が不足している場合
    if (!siteArea) {
      return {
        isBuildable: false,
        summary: '敷地面積が設定されていません。'
      }
    }
    
    if (!buildingCoverage) {
      return {
        isBuildable: false,
        summary: '建蔽率が設定されていません。'
      }
    }
    
    if (!floorAreaRatio) {
      return {
        isBuildable: false,
        summary: '容積率が設定されていません。'
      }
    }

    // 基本的な制約チェック
    const constraints = []
    
    // 敷地面積の最小要件チェック
    if (siteArea < 50) {
      constraints.push('敷地面積が狭すぎます（50㎡未満）')
    }
    
    // 前面道路幅による容積率制限チェック
    if (project.siteInfo.roadWidth && project.siteInfo.roadWidth < 4) {
      constraints.push('前面道路幅が4m未満のため、建築基準法による制限があります')
    }
    
    // 日影規制による高さ制限チェック
    if (regulation.restrictions.range5to10m <= 2 && regulation.restrictions.rangeOver10m <= 1.5) {
      constraints.push('厳しい日影規制のため、建築可能高さが大幅に制限される可能性があります')
    }

    // 制約がある場合
    if (constraints.length > 0) {
      return {
        isBuildable: false,
        summary: `建築に制約があります：${constraints.join('、')}`
      }
    }

    // 建築可能と判定
    return {
      isBuildable: true,
      summary: `${regulation.zone}において建築可能です。建蔽率${buildingCoverage}%、容積率${floorAreaRatio}%の範囲で建築計画を進められます。`
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