export interface Project {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  location: ProjectLocation
  buildingInfo: BuildingInfo
  siteInfo: SiteInfo
  parkingPlan?: ParkingPlan
  specialNotes?: string
  estimations?: EstimationResult
  simulations?: SimulationResult
  clientInfo?: ClientInfo
  schedule?: ProjectSchedule
  previewImage?: string // 3Dビューのスクリーンショット（Base64またはURL）
}

export interface ProjectSchedule {
  startDate?: Date
  completionDate?: Date
  duration?: number // 工期（月数）
}

export interface ClientInfo {
  companyName?: string
  contactPerson?: string
  department?: string
  address?: string
  phone?: string
  email?: string
}

export interface ProjectLocation {
  address: string
  latitude: number
  longitude: number
  polygon?: [number, number][]
}

export interface BuildingInfo {
  usage?: BuildingUsage
  structure?: StructureType
  floors?: number
  units?: number // 共同住宅の場合
  totalFloorArea?: number // 延床面積
  maxHeight?: number // 最高高さ
  foundationHeight?: number // 基礎高さ
  buildingArea: number | null // 建築面積
  effectiveArea: number | null // 容積対象面積
  constructionArea: number | null // 施工面積
  floorDetails?: FloorAreaDetail[] // 各階の面積詳細
  unitTypes?: UnitType[] // 住戸タイプ情報
  buildingShape?: BuildingShape // 建物形状情報
}

export interface BuildingShape {
  footprintType: 'rectangle' | 'L-shape' | 'U-shape' | 'complex' // 建物の平面形状
  width?: number // 幅（計算値）
  depth?: number // 奥行き（計算値）
  orientation?: number // 建物の向き（度）
  hasSetback?: boolean // セットバックの有無
  setbackFloor?: number // セットバック開始階
  setbackRatio?: number // セットバック率
}

export interface SiteInfo {
  landType: string // 地目
  siteArea: number | null // 敷地面積
  effectiveSiteArea: number | null // 有効敷地面積
  zoningType: string // 用途地域
  buildingCoverage: number // 建ぺい率 (%)
  floorAreaRatio: number // 容積率 (%)
  heightLimit: string // 高さ制限
  heightDistrict?: string // 高度地区
  shadowRegulation?: ShadowRegulation // 日影規制
  otherRegulations: string[] // その他地域地区
  administrativeGuidance: AdministrativeGuidance
}

export interface ShadowRegulation {
  targetArea: string // 規制対象地域
  targetBuilding: string // 規制対象建築物条件
  measurementHeight: number // 測定面高さ
  measurementTime: string // 測定時間帯
  allowedShadowTime5to10m: number // 5-10m範囲の許容日影時間
  allowedShadowTimeOver10m: number // 10m超範囲の許容日影時間
}

export interface AdministrativeGuidance {
  urbanPlanningAct: boolean // 都計法開発行為
  administrativeGuidance: boolean // 行政指導
  greenOrdinance: boolean // みどりの条例
  landscapePlan: boolean // 景観計画
  welfareEnvironment: boolean // 福祉環境整備要綱
  midHighRiseOrdinance: boolean // 中高層条例
  embankmentRegulation: boolean // 盛土規制法
  [key: string]: boolean // 動的に追加される自治体固有の要綱
}

// AI取得用の行政指導項目の型定義
export interface AdministrativeGuidanceItem {
  id: string // 内部ID（キャメルケース）
  name: string // 表示名
  description?: string // 説明
  isRequired: boolean // 必須かどうか
  applicableConditions?: string // 適用条件
}

export interface FloorAreaDetail {
  floor: number
  residentialArea?: number // 住戸部分
  capacityArea?: number // 容積対象部分
  nonCapacityArea?: number // 非容積対象部分
}

export interface UnitType {
  typeName: string
  exclusiveArea: number // 専有面積
  mbArea: number // MB他面積
  balconyArea: number // バルコニー面積
  units: number // 戸数
  layoutType: string // 間取り（2LDK等）
}

export interface ParkingPlan {
  parkingSpaces: number // 駐車場台数
  bicycleSpaces: number // 駐輪場台数
  motorcycleSpaces: number // バイク置場台数
  greenArea: number // 緑地面積
}

export interface EstimationResult {
  totalCost: number
  breakdown: CostBreakdown
  schedule?: {
    startDate: Date | null
    completionDate: Date | null
    duration: number | null
  }
  aiAnalysis: string
}

export interface CostBreakdown {
  foundation: number // 基礎工事
  structure: number // 躯体工事
  exterior: number // 外装工事
  interior: number // 内装工事
  electrical: number // 電気設備
  plumbing: number // 給排水設備
  hvac: number // 空調・換気設備
  other: number // その他工事
  temporary: number // 仮設工事
  design: number // 設計・諸経費
}

export interface SimulationResult {
  shadowSimulation: ShadowSimulationData
  sunlightHeatmap: HeatmapData
  regulationCompliance: RegulationComplianceResult
}

export interface ShadowSimulationData {
  date: Date
  timePoints: ShadowTimePoint[]
}

export interface ShadowTimePoint {
  time: string
  shadowPolygons: [number, number][][]
  sunPosition: { azimuth: number; altitude: number }
}

export interface HeatmapData {
  resolution: number
  data: number[][]
  bounds: [[number, number], [number, number]]
}

export interface RegulationComplianceResult {
  shadowRegulation: ComplianceStatus
  heightLimit: ComplianceStatus
  buildingCoverage: ComplianceStatus
  floorAreaRatio: ComplianceStatus
  recommendations?: string[]
}

export interface ComplianceStatus {
  compliant: boolean
  actualValue: number
  limitValue: number
  message: string
}

export type BuildingUsage = '共同住宅' | '専用住宅' | '商業施設' | 'オフィス' | 'その他'
export type StructureType = '壁式鉄筋コンクリート造' | '木造軸組工法' | '鉄骨造' | 'その他'
export type RiskLevel = 'low' | 'medium' | 'high'