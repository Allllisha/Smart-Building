import { Project } from '@/types/project'
import * as THREE from 'three'

export interface DetailedBuildingGeometry {
  // 基本形状
  baseFootprint: { x: number, y: number }[]  // 建物の基本フットプリント
  floorPlans: FloorPlan[]                    // 各階の平面形状
  overallDimensions: {
    width: number
    depth: number  
    totalHeight: number
  }
  
  // 建築的特徴
  setbacks: Setback[]                        // セットバック
  balconies: Balcony[]                       // バルコニー
  projections: Projection[]                  // 張り出し部分
  recesses: Recess[]                         // 凹み部分
}

export interface FloorPlan {
  level: number                              // 階数
  height: number                             // 階高
  footprint: { x: number, y: number }[]      // この階の平面形状
  setbackFromBase: number                    // 基準階からのセットバック距離
  balconyAreas: { x: number, y: number, width: number, depth: number }[]
}

export interface Setback {
  fromFloor: number                          // セットバック開始階
  toFloor: number                            // セットバック終了階
  distance: number                           // セットバック距離 (m)
  sides: ('north' | 'south' | 'east' | 'west')[] // セットバック方向
}

export interface Balcony {
  floor: number                              // 階数
  position: { x: number, y: number }         // 位置
  width: number                              // 幅
  depth: number                              // 奥行き
  height: number                             // 高さ（階高に対する比率）
}

export interface Projection {
  fromFloor: number
  toFloor: number
  geometry: { x: number, y: number }[]       // 張り出し形状
  height: number
}

export interface Recess {
  fromFloor: number
  toFloor: number
  geometry: { x: number, y: number }[]       // 凹み形状
  depth: number
}

export interface PreciseShadowPoint {
  x: number
  y: number
  shadowHours: number[]                      // 各時刻での日影状況（1=影、0=日向）
  totalShadowHours: number                   // 総日影時間
  distanceFromBoundary: number
  isCompliant: boolean
  violationHours: number                     // 規制超過時間
}

export interface DetailedVolumeCheckResult {
  isCompliant: boolean
  checkPoints: PreciseShadowPoint[]
  shadowMap: number[][]                      // 2D影マップ
  timeSeriesAnalysis: {
    hourlyCompliance: { time: number, compliant: boolean, violationPoints: number }[]
    peakViolationTime: number
    minimumComplianceTime: number
  }
  geometryAnalysis: {
    effectiveBuildingFootprint: number       // 実効建築面積
    shadowCastingVolume: number              // 日影投射体積
    criticalFloors: number[]                 // 日影に最も影響する階
  }
  recommendations: DetailedRecommendation[]
}

export interface DetailedRecommendation {
  type: 'height_reduction' | 'setback' | 'floor_reduction' | 'shape_modification' | 'balcony_adjustment'
  priority: 'critical' | 'high' | 'medium' | 'low'
  description: string
  expectedImprovement: {
    complianceRateImprovement: number        // 適合率改善 (%)
    shadowReductionArea: number              // 日影削減面積 (㎡)
    affectedFloorArea: number                // 影響する床面積 (㎡)
  }
  implementationCost: 'high' | 'medium' | 'low'
}

class DetailedShadowCalculationService {
  /**
   * 入力情報から詳細建物形状を推定・生成
   */
  generateDetailedBuildingGeometry(project: Project): DetailedBuildingGeometry {
    console.log('🏗️ 入力情報から詳細建物形状を生成開始')
    
    const { buildingInfo, siteInfo, areaInfo, parkingInfo } = project
    
    // 基本寸法の計算
    const baseArea = buildingInfo.buildingArea // ㎡
    const totalFloors = buildingInfo.floors
    const totalHeight = buildingInfo.maxHeight / 1000 // mm to m
    const floorHeight = totalHeight / totalFloors
    
    // 建物形状の基本推定（用途・構造による補正）
    const aspectRatio = this.calculateOptimalAspectRatio(buildingInfo.usage, buildingInfo.structure)
    const baseWidth = Math.sqrt(baseArea * aspectRatio)
    const baseDepth = baseArea / baseWidth
    
    // 基本フットプリントの生成
    const baseFootprint = this.generateBaseFootprint(baseWidth, baseDepth, buildingInfo.usage)
    
    // 階層別形状の生成
    const floorPlans = this.generateFloorPlans(
      totalFloors, floorHeight, baseFootprint, buildingInfo, areaInfo
    )
    
    // セットバックの推定
    const setbacks = this.estimateSetbacks(totalFloors, totalHeight, buildingInfo.usage, siteInfo)
    
    // バルコニーの推定
    const balconies = this.estimateBalconies(totalFloors, buildingInfo.usage, parkingInfo)
    
    // 張り出し・凹みの推定
    const projections = this.estimateProjections(buildingInfo.usage, buildingInfo.structure)
    const recesses = this.estimateRecesses(buildingInfo.usage)
    
    return {
      baseFootprint,
      floorPlans,
      overallDimensions: {
        width: baseWidth,
        depth: baseDepth,
        totalHeight
      },
      setbacks,
      balconies,
      projections,
      recesses
    }
  }
  
  /**
   * 建物用途・構造から最適なアスペクト比を計算
   */
  private calculateOptimalAspectRatio(usage: string, structure: string): number {
    let ratio = 1.0 // 基本は正方形
    
    // 用途による補正
    switch (usage) {
      case '共同住宅':
      case 'マンション':
        ratio = 1.3 // やや長方形（南北に短く、東西に長く）
        break
      case '専用住宅':
        ratio = 1.1 // ほぼ正方形
        break
      case '商業施設':
        ratio = 1.5 // 長方形（店舗の奥行き考慮）
        break
      case 'オフィス':
        ratio = 1.4 // 長方形（オフィスレイアウト考慮）
        break
      case '工場':
        ratio = 2.0 // 大きく長方形
        break
    }
    
    // 構造による補正
    switch (structure) {
      case '木造軸組工法':
        ratio *= 0.9 // やや小さめ
        break
      case '鉄筋コンクリート造':
        ratio *= 1.1 // やや大きめ
        break
      case '鉄骨造':
        ratio *= 1.2 // 大きめ（スパンが長い）
        break
    }
    
    return Math.max(0.7, Math.min(2.5, ratio)) // 0.7-2.5の範囲に制限
  }
  
  /**
   * 基本フットプリントの生成（用途に応じた形状）
   */
  private generateBaseFootprint(width: number, depth: number, usage: string): { x: number, y: number }[] {
    const footprint: { x: number, y: number }[] = []
    
    // 基本的な矩形
    const w2 = width / 2
    const d2 = depth / 2
    
    switch (usage) {
      case '共同住宅':
      case 'マンション':
        // 中廊下型を想定した凹凸
        footprint.push(
          { x: -w2, y: -d2 },
          { x: w2, y: -d2 },
          { x: w2, y: d2 * 0.3 },
          { x: w2 * 0.8, y: d2 * 0.3 },
          { x: w2 * 0.8, y: d2 },
          { x: -w2 * 0.8, y: d2 },
          { x: -w2 * 0.8, y: d2 * 0.3 },
          { x: -w2, y: d2 * 0.3 }
        )
        break
        
      case '商業施設':
        // L字型またはコの字型
        footprint.push(
          { x: -w2, y: -d2 },
          { x: w2, y: -d2 },
          { x: w2, y: 0 },
          { x: w2 * 0.6, y: 0 },
          { x: w2 * 0.6, y: d2 },
          { x: -w2, y: d2 }
        )
        break
        
      default:
        // 標準的な矩形
        footprint.push(
          { x: -w2, y: -d2 },
          { x: w2, y: -d2 },
          { x: w2, y: d2 },
          { x: -w2, y: d2 }
        )
    }
    
    return footprint
  }
  
  /**
   * 階層別平面図の生成
   */
  private generateFloorPlans(
    totalFloors: number, 
    floorHeight: number, 
    baseFootprint: { x: number, y: number }[],
    buildingInfo: any,
    areaInfo: any
  ): FloorPlan[] {
    const floorPlans: FloorPlan[] = []
    
    for (let floor = 1; floor <= totalFloors; floor++) {
      let footprint = [...baseFootprint]
      let setbackFromBase = 0
      
      // 高層階でのセットバック
      if (floor > Math.floor(totalFloors * 0.7)) {
        setbackFromBase = (floor - Math.floor(totalFloors * 0.7)) * 0.5
        footprint = this.applySetbackToFootprint(footprint, setbackFromBase)
      }
      
      // 最上階の形状調整
      if (floor === totalFloors) {
        footprint = this.adjustTopFloorFootprint(footprint, buildingInfo.usage)
      }
      
      // バルコニーエリアの追加
      const balconyAreas = this.generateBalconyAreasForFloor(floor, footprint, buildingInfo.usage)
      
      floorPlans.push({
        level: floor,
        height: floorHeight,
        footprint,
        setbackFromBase,
        balconyAreas
      })
    }
    
    return floorPlans
  }
  
  /**
   * セットバックの推定
   */
  private estimateSetbacks(totalFloors: number, totalHeight: number, usage: string, siteInfo: any): Setback[] {
    const setbacks: Setback[] = []
    
    // 高さ制限によるセットバック
    if (totalHeight > 20) {
      setbacks.push({
        fromFloor: Math.ceil(totalFloors * 0.7),
        toFloor: totalFloors,
        distance: Math.min(3, (totalHeight - 20) * 0.2),
        sides: ['north', 'east', 'west']
      })
    }
    
    // 用途による段階的セットバック
    if (usage === '共同住宅' && totalFloors > 5) {
      setbacks.push({
        fromFloor: 6,
        toFloor: totalFloors,
        distance: 1.5,
        sides: ['north']
      })
    }
    
    return setbacks
  }
  
  /**
   * バルコニーの推定
   */
  private estimateBalconies(totalFloors: number, usage: string, parkingInfo: any): Balcony[] {
    const balconies: Balcony[] = []
    
    if (usage === '共同住宅' || usage === '専用住宅') {
      // 住宅系はバルコニーあり
      for (let floor = 2; floor <= totalFloors; floor++) {
        // 南面にバルコニー
        balconies.push({
          floor,
          position: { x: 0, y: -2 }, // 南側
          width: 8,
          depth: 1.5,
          height: 0.3 // 階高の30%の高さ
        })
      }
    }
    
    return balconies
  }
  
  /**
   * 張り出し部分の推定
   */
  private estimateProjections(usage: string, structure: string): Projection[] {
    const projections: Projection[] = []
    
    if (usage === 'オフィス') {
      // オフィスビルの庇
      projections.push({
        fromFloor: 1,
        toFloor: 1,
        geometry: [
          { x: -6, y: -4 },
          { x: 6, y: -4 },
          { x: 6, y: -3 },
          { x: -6, y: -3 }
        ],
        height: 0.5
      })
    }
    
    return projections
  }
  
  /**
   * 凹み部分の推定
   */
  private estimateRecesses(usage: string): Recess[] {
    const recesses: Recess[] = []
    
    if (usage === '共同住宅') {
      // エントランスの凹み
      recesses.push({
        fromFloor: 1,
        toFloor: 2,
        geometry: [
          { x: -2, y: -1 },
          { x: 2, y: -1 },
          { x: 2, y: 1 },
          { x: -2, y: 1 }
        ],
        depth: 2
      })
    }
    
    return recesses
  }
  
  /**
   * フットプリントにセットバックを適用
   */
  private applySetbackToFootprint(
    footprint: { x: number, y: number }[], 
    setbackDistance: number
  ): { x: number, y: number }[] {
    return footprint.map(point => ({
      x: point.x * (1 - setbackDistance * 0.1),
      y: point.y * (1 - setbackDistance * 0.1)
    }))
  }
  
  /**
   * 最上階の形状調整
   */
  private adjustTopFloorFootprint(
    footprint: { x: number, y: number }[], 
    usage: string
  ): { x: number, y: number }[] {
    if (usage === '共同住宅') {
      // ペントハウス等の調整
      return footprint.map(point => ({
        x: point.x * 0.9,
        y: point.y * 0.9
      }))
    }
    return footprint
  }
  
  /**
   * 階層別バルコニーエリアの生成
   */
  private generateBalconyAreasForFloor(
    floor: number, 
    footprint: { x: number, y: number }[], 
    usage: string
  ): { x: number, y: number, width: number, depth: number }[] {
    const balconyAreas: { x: number, y: number, width: number, depth: number }[] = []
    
    if ((usage === '共同住宅' || usage === '専用住宅') && floor > 1) {
      // 南面バルコニー
      const southY = Math.min(...footprint.map(p => p.y)) - 1.5
      balconyAreas.push({
        x: 0,
        y: southY,
        width: 8,
        depth: 1.5
      })
    }
    
    return balconyAreas
  }
  
  /**
   * 詳細日影計算メイン関数
   */
  async calculateDetailedShadows(
    buildingGeometry: DetailedBuildingGeometry,
    winterSolsticeData: any,
    regulation: any
  ): Promise<DetailedVolumeCheckResult> {
    console.log('🌅 詳細日影計算開始')
    
    // 高密度チェックポイントグリッドの生成
    const checkPoints: PreciseShadowPoint[] = []
    const gridSize = 1 // 1mグリッド（高精度）
    const checkRange = 50
    
    // 2D影マップの初期化
    const mapSize = Math.ceil(checkRange * 2 / gridSize)
    const shadowMap: number[][] = Array(mapSize).fill(null).map(() => Array(mapSize).fill(0))
    
    for (let x = -checkRange; x <= checkRange; x += gridSize) {
      for (let y = -checkRange; y <= checkRange; y += gridSize) {
        // 建物内部は除外
        if (this.isPointInsideBuilding(x, y, buildingGeometry)) continue
        
        const distanceFromBoundary = this.calculateDistanceFromBuildingBoundary(x, y, buildingGeometry)
        if (distanceFromBoundary > 50) continue // 50m以内のみ
        
        // この点での詳細日影時間計算
        const shadowAnalysis = this.calculatePointShadowAnalysis(
          x, y, buildingGeometry, winterSolsticeData, regulation
        )
        
        const applicableLimit = distanceFromBoundary <= 10 ? 
          regulation.restrictions.range5to10m : 
          regulation.restrictions.rangeOver10m
        
        const isCompliant = shadowAnalysis.totalShadowHours <= applicableLimit
        const violationHours = Math.max(0, shadowAnalysis.totalShadowHours - applicableLimit)
        
        checkPoints.push({
          x, y,
          shadowHours: shadowAnalysis.hourlyData,
          totalShadowHours: shadowAnalysis.totalShadowHours,
          distanceFromBoundary,
          isCompliant,
          violationHours
        })
        
        // 影マップに記録
        const mapX = Math.floor((x + checkRange) / gridSize)
        const mapY = Math.floor((y + checkRange) / gridSize)
        if (mapX >= 0 && mapX < mapSize && mapY >= 0 && mapY < mapSize) {
          shadowMap[mapY][mapX] = shadowAnalysis.totalShadowHours
        }
      }
    }
    
    // 時系列解析
    const timeSeriesAnalysis = this.analyzeTimeSeries(checkPoints, winterSolsticeData)
    
    // 形状解析
    const geometryAnalysis = this.analyzeGeometry(buildingGeometry, checkPoints)
    
    // 詳細改善提案の生成
    const recommendations = this.generateDetailedRecommendations(
      buildingGeometry, checkPoints, geometryAnalysis
    )
    
    const violationPoints = checkPoints.filter(p => !p.isCompliant)
    
    console.log('✅ 詳細日影計算完了', {
      総チェック点数: checkPoints.length,
      違反点数: violationPoints.length,
      適合率: ((checkPoints.length - violationPoints.length) / checkPoints.length * 100).toFixed(1) + '%'
    })
    
    return {
      isCompliant: violationPoints.length === 0,
      checkPoints,
      shadowMap,
      timeSeriesAnalysis,
      geometryAnalysis,
      recommendations
    }
  }
  
  /**
   * 点が建物内部にあるかチェック
   */
  private isPointInsideBuilding(x: number, y: number, geometry: DetailedBuildingGeometry): boolean {
    // 基本フットプリント内かチェック
    return this.isPointInPolygon({ x, y }, geometry.baseFootprint)
  }
  
  /**
   * 建物境界からの距離計算
   */
  private calculateDistanceFromBuildingBoundary(x: number, y: number, geometry: DetailedBuildingGeometry): number {
    let minDistance = Infinity
    
    const footprint = geometry.baseFootprint
    for (let i = 0; i < footprint.length; i++) {
      const p1 = footprint[i]
      const p2 = footprint[(i + 1) % footprint.length]
      
      const distance = this.pointToLineDistance({ x, y }, p1, p2)
      minDistance = Math.min(minDistance, distance)
    }
    
    return minDistance
  }
  
  /**
   * 特定点での詳細日影解析
   */
  private calculatePointShadowAnalysis(
    pointX: number,
    pointY: number,
    buildingGeometry: DetailedBuildingGeometry,
    winterSolsticeData: any,
    regulation: any
  ): { hourlyData: number[], totalShadowHours: number } {
    const hourlyData: number[] = []
    let totalShadowHours = 0
    const timeStep = 0.5
    
    for (const sunData of winterSolsticeData.sunPath) {
      if (sunData.time < regulation.timeRange.start || sunData.time > regulation.timeRange.end) {
        hourlyData.push(0)
        continue
      }
      
      if (sunData.altitude <= 0) {
        hourlyData.push(0)
        continue
      }
      
      // 複雑な建物形状での影判定
      const inShadow = this.isPointInComplexBuildingShadow(
        pointX, pointY, regulation.measurementHeight,
        buildingGeometry, sunData.altitude, sunData.azimuth
      )
      
      if (inShadow) {
        hourlyData.push(1)
        totalShadowHours += timeStep
      } else {
        hourlyData.push(0)
      }
    }
    
    return { hourlyData, totalShadowHours }
  }
  
  /**
   * 複雑建物形状での影判定
   */
  private isPointInComplexBuildingShadow(
    pointX: number,
    pointY: number,
    measurementHeight: number,
    buildingGeometry: DetailedBuildingGeometry,
    sunAltitude: number,
    sunAzimuth: number
  ): boolean {
    const sunAltRad = sunAltitude * Math.PI / 180
    const sunAzRad = sunAzimuth * Math.PI / 180
    
    // 各階層からの影を計算
    for (const floorPlan of buildingGeometry.floorPlans) {
      const floorHeight = floorPlan.level * floorPlan.height
      
      if (floorHeight <= measurementHeight) continue
      
      const shadowLength = (floorHeight - measurementHeight) / Math.tan(sunAltRad)
      if (shadowLength <= 0) continue
      
      const shadowX = shadowLength * Math.sin(sunAzRad)
      const shadowY = shadowLength * Math.cos(sunAzRad)
      
      // この階の影ポリゴンを計算
      const shadowPolygon = floorPlan.footprint.map(corner => ({
        x: corner.x + shadowX,
        y: corner.y + shadowY
      }))
      
      // バルコニーからの影も考慮
      for (const balconyArea of floorPlan.balconyAreas) {
        const balconyHeight = floorHeight + floorPlan.height * balconyArea.depth
        const balconyCheck = this.isPointInBalconyShadow(
          pointX, pointY, measurementHeight, balconyArea, balconyHeight, sunAltRad, sunAzRad
        )
        if (balconyCheck) return true
      }
      
      if (this.isPointInPolygon({ x: pointX, y: pointY }, shadowPolygon)) {
        return true
      }
    }
    
    // セットバック部分からの影
    for (const setback of buildingGeometry.setbacks) {
      if (this.isPointInSetbackShadow(pointX, pointY, measurementHeight, setback, buildingGeometry, sunAltRad, sunAzRad)) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * バルコニーからの影判定
   */
  private isPointInBalconyShadow(
    pointX: number,
    pointY: number,
    measurementHeight: number,
    balconyArea: any,
    balconyHeight: number,
    sunAltRad: number,
    sunAzRad: number
  ): boolean {
    if (balconyHeight <= measurementHeight) return false
    
    const shadowLength = (balconyHeight - measurementHeight) / Math.tan(sunAltRad)
    if (shadowLength <= 0) return false
    
    const shadowX = shadowLength * Math.sin(sunAzRad)
    const shadowY = shadowLength * Math.cos(sunAzRad)
    
    const balconyCorners = [
      { x: balconyArea.x - balconyArea.width/2, y: balconyArea.y },
      { x: balconyArea.x + balconyArea.width/2, y: balconyArea.y },
      { x: balconyArea.x + balconyArea.width/2, y: balconyArea.y + balconyArea.depth },
      { x: balconyArea.x - balconyArea.width/2, y: balconyArea.y + balconyArea.depth }
    ]
    
    const shadowPolygon = balconyCorners.map(corner => ({
      x: corner.x + shadowX,
      y: corner.y + shadowY
    }))
    
    return this.isPointInPolygon({ x: pointX, y: pointY }, shadowPolygon)
  }
  
  /**
   * セットバック部からの影判定
   */
  private isPointInSetbackShadow(
    pointX: number,
    pointY: number,
    measurementHeight: number,
    setback: Setback,
    buildingGeometry: DetailedBuildingGeometry,
    sunAltRad: number,
    sunAzRad: number
  ): boolean {
    // セットバック部分の高さ範囲での影計算
    const fromHeight = setback.fromFloor * buildingGeometry.floorPlans[0].height
    const toHeight = setback.toFloor * buildingGeometry.floorPlans[0].height
    
    for (let height = fromHeight; height <= toHeight; height += 2) {
      if (height <= measurementHeight) continue
      
      const shadowLength = (height - measurementHeight) / Math.tan(sunAltRad)
      if (shadowLength <= 0) continue
      
      // セットバック適用後の形状での影判定
      const setbackFootprint = this.applySetbackToFootprint(
        buildingGeometry.baseFootprint, setback.distance
      )
      
      const shadowX = shadowLength * Math.sin(sunAzRad)
      const shadowY = shadowLength * Math.cos(sunAzRad)
      
      const shadowPolygon = setbackFootprint.map(corner => ({
        x: corner.x + shadowX,
        y: corner.y + shadowY
      }))
      
      if (this.isPointInPolygon({ x: pointX, y: pointY }, shadowPolygon)) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * 時系列解析
   */
  private analyzeTimeSeries(checkPoints: PreciseShadowPoint[], winterSolsticeData: any): any {
    const hourlyCompliance: { time: number, compliant: boolean, violationPoints: number }[] = []
    let peakViolationTime = 12
    let maxViolations = 0
    let minimumComplianceTime = 12
    let maxCompliance = 0
    
    for (const sunData of winterSolsticeData.sunPath) {
      if (sunData.time < 8 || sunData.time > 16) continue
      
      const violationPoints = checkPoints.filter(point => {
        const hourIndex = Math.floor((sunData.time - 8) * 2) // 30分間隔のインデックス
        return hourIndex < point.shadowHours.length && point.shadowHours[hourIndex] === 1 && !point.isCompliant
      }).length
      
      const compliantPoints = checkPoints.length - violationPoints
      
      hourlyCompliance.push({
        time: sunData.time,
        compliant: violationPoints === 0,
        violationPoints
      })
      
      if (violationPoints > maxViolations) {
        maxViolations = violationPoints
        peakViolationTime = sunData.time
      }
      
      if (compliantPoints > maxCompliance) {
        maxCompliance = compliantPoints
        minimumComplianceTime = sunData.time
      }
    }
    
    return {
      hourlyCompliance,
      peakViolationTime,
      minimumComplianceTime
    }
  }
  
  /**
   * 形状解析
   */
  private analyzeGeometry(buildingGeometry: DetailedBuildingGeometry, checkPoints: PreciseShadowPoint[]): any {
    const effectiveBuildingFootprint = this.calculatePolygonArea(buildingGeometry.baseFootprint)
    
    let shadowCastingVolume = 0
    for (const floorPlan of buildingGeometry.floorPlans) {
      shadowCastingVolume += this.calculatePolygonArea(floorPlan.footprint) * floorPlan.height
    }
    
    // 最も影響する階の特定
    const criticalFloors: number[] = []
    const floorImpact = buildingGeometry.floorPlans.map((floor, index) => {
      const floorArea = this.calculatePolygonArea(floor.footprint)
      const heightWeight = floor.level * floor.height
      return { floor: floor.level, impact: floorArea * heightWeight }
    })
    
    floorImpact.sort((a, b) => b.impact - a.impact)
    criticalFloors.push(...floorImpact.slice(0, 3).map(f => f.floor))
    
    return {
      effectiveBuildingFootprint,
      shadowCastingVolume,
      criticalFloors
    }
  }
  
  /**
   * 詳細改善提案の生成
   */
  private generateDetailedRecommendations(
    buildingGeometry: DetailedBuildingGeometry,
    checkPoints: PreciseShadowPoint[],
    geometryAnalysis: any
  ): DetailedRecommendation[] {
    const recommendations: DetailedRecommendation[] = []
    const violationPoints = checkPoints.filter(p => !p.isCompliant)
    
    if (violationPoints.length === 0) return recommendations
    
    const totalViolationArea = violationPoints.length
    const averageViolationHours = violationPoints.reduce((sum, p) => sum + p.violationHours, 0) / violationPoints.length
    
    // 高さ削減提案
    if (averageViolationHours > 1) {
      const requiredHeightReduction = Math.ceil(averageViolationHours * 1.5)
      recommendations.push({
        type: 'height_reduction',
        priority: averageViolationHours > 2 ? 'critical' : 'high',
        description: `建物高さを${requiredHeightReduction}m削減することで日影規制に適合します`,
        expectedImprovement: {
          complianceRateImprovement: Math.min(80, averageViolationHours * 30),
          shadowReductionArea: totalViolationArea * 0.6,
          affectedFloorArea: requiredHeightReduction * 100
        },
        implementationCost: requiredHeightReduction > 5 ? 'high' : 'medium'
      })
    }
    
    // セットバック提案
    if (violationPoints.some(p => p.distanceFromBoundary <= 15)) {
      recommendations.push({
        type: 'setback',
        priority: 'high',
        description: '敷地境界から3m程度のセットバックを行うことを推奨します',
        expectedImprovement: {
          complianceRateImprovement: 40,
          shadowReductionArea: totalViolationArea * 0.4,
          affectedFloorArea: geometryAnalysis.effectiveBuildingFootprint * 0.2
        },
        implementationCost: 'medium'
      })
    }
    
    // 階数削減提案
    if (geometryAnalysis.criticalFloors.length > 0) {
      const topCriticalFloor = Math.max(...geometryAnalysis.criticalFloors.slice(0, 2))
      recommendations.push({
        type: 'floor_reduction',
        priority: 'medium',
        description: `${topCriticalFloor}階以上を削減することで大幅な改善が期待できます`,
        expectedImprovement: {
          complianceRateImprovement: 50,
          shadowReductionArea: totalViolationArea * 0.5,
          affectedFloorArea: geometryAnalysis.effectiveBuildingFootprint * (buildingGeometry.floorPlans.length - topCriticalFloor + 1)
        },
        implementationCost: 'high'
      })
    }
    
    // バルコニー調整提案
    if (buildingGeometry.balconies.length > 0) {
      recommendations.push({
        type: 'balcony_adjustment',
        priority: 'low',
        description: 'バルコニーの奥行きを削減または位置を調整することで局所的な改善が可能です',
        expectedImprovement: {
          complianceRateImprovement: 15,
          shadowReductionArea: totalViolationArea * 0.1,
          affectedFloorArea: buildingGeometry.balconies.length * 20
        },
        implementationCost: 'low'
      })
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }
  
  // ユーティリティ関数群
  private isPointInPolygon(point: { x: number, y: number }, polygon: { x: number, y: number }[]): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
          (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
        inside = !inside
      }
    }
    return inside
  }
  
  private pointToLineDistance(point: { x: number, y: number }, lineStart: { x: number, y: number }, lineEnd: { x: number, y: number }): number {
    const A = point.x - lineStart.x
    const B = point.y - lineStart.y
    const C = lineEnd.x - lineStart.x
    const D = lineEnd.y - lineStart.y
    
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1
    if (lenSq !== 0) {
      param = dot / lenSq
    }
    
    let xx, yy
    if (param < 0) {
      xx = lineStart.x
      yy = lineStart.y
    } else if (param > 1) {
      xx = lineEnd.x
      yy = lineEnd.y
    } else {
      xx = lineStart.x + param * C
      yy = lineStart.y + param * D
    }
    
    const dx = point.x - xx
    const dy = point.y - yy
    return Math.sqrt(dx * dx + dy * dy)
  }
  
  private calculatePolygonArea(polygon: { x: number, y: number }[]): number {
    let area = 0
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length
      area += polygon[i].x * polygon[j].y
      area -= polygon[j].x * polygon[i].y
    }
    return Math.abs(area) / 2
  }
}

export const detailedShadowCalculationService = new DetailedShadowCalculationService()