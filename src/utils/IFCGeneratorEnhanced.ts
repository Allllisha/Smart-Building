import * as WebIFC from 'web-ifc'
import { BuildingInfo, SiteInfo, ParkingPlan, FloorAreaDetail, UnitType } from '../types/project'
import text2BIMService, { Text2BIMResult } from '../services/text2bim.service'

// 3D点の型定義
export interface Point3D {
  x: number
  y: number
  z: number
}

// 拡張されたIFC生成データ
export interface EnhancedIFCData {
  buildingInfo: BuildingInfo
  siteInfo?: SiteInfo
  parkingPlan?: ParkingPlan
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
}

export class IFCGeneratorEnhanced {
  private ifcAPI: WebIFC.IfcAPI
  private modelID: number = 0
  private globalIdCounter: number = 0

  constructor() {
    this.ifcAPI = new WebIFC.IfcAPI()
  }

  async initialize(): Promise<void> {
    await this.ifcAPI.Init()
  }

  /**
   * Text2BIMサービスを活用してIFCファイルを生成
   */
  async generateEnhancedIFC(data: EnhancedIFCData): Promise<Uint8Array> {
    this.modelID = this.ifcAPI.CreateModel()

    // Text2BIMで詳細な建物形状を生成
    const text2BIMResult = text2BIMService.generateDetailedBuilding(
      data.buildingInfo,
      data.siteInfo,
      data.parkingPlan
    )

    // IFC用の詳細データを生成
    const ifcData = text2BIMService.generateIFCData(data.buildingInfo, text2BIMResult)

    // プロジェクト情報の設定
    const project = this.createProject(data)
    
    // サイトの作成
    const site = this.createSite(data)
    
    // 建物の作成
    const building = this.createBuilding(data, ifcData.building)
    
    // 建物階層の設定
    this.ifcAPI.WriteLine(this.modelID, this.createRelAggregates(site, [building]))

    // 各階の作成
    const storeys = this.createDetailedStoreys(ifcData.stories, data.buildingInfo)
    this.ifcAPI.WriteLine(this.modelID, this.createRelAggregates(building, storeys))

    // 構造要素の作成
    this.createStructuralElements(ifcData.structure, storeys)

    // 空間の作成
    this.createSpaces(ifcData.spaces, storeys)

    // ファサード要素の作成
    this.createFacadeElements(ifcData.facades, storeys)

    // 駐車場・外構要素の作成
    if (data.parkingPlan) {
      this.createParkingElements(data.parkingPlan, site)
    }

    // IFCファイルのバイナリデータを取得
    const result = this.ifcAPI.SaveModel(this.modelID)
    this.ifcAPI.CloseModel(this.modelID)

    return result
  }

  /**
   * プロジェクト情報の作成
   */
  private createProject(data: EnhancedIFCData): number {
    const project = {
      type: WebIFC.IFCPROJECT,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: `${data.buildingInfo.usage}_${data.buildingInfo.floors}F_Project`,
      Description: `${data.buildingInfo.structure} ${data.buildingInfo.floors}階建て ${data.buildingInfo.usage}`,
      ObjectType: null,
      LongName: data.location?.address || null,
      Phase: '基本設計',
      RepresentationContexts: [this.createGeometricRepresentationContext()],
      UnitsInContext: this.createUnitAssignment()
    }

    return this.ifcAPI.WriteLine(this.modelID, project)
  }

  /**
   * サイト情報の作成
   */
  private createSite(data: EnhancedIFCData): number {
    const site = {
      type: WebIFC.IFCSITE,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: 'Building Site',
      Description: data.siteInfo ? `地目: ${data.siteInfo.landType}, 用途地域: ${data.siteInfo.zoningType}` : null,
      ObjectType: null,
      ObjectPlacement: this.createLocalPlacement(),
      Representation: null,
      LongName: data.location?.address || null,
      CompositionType: WebIFC.IFCELEMENTCOMPOSITIONENUM.ELEMENT,
      RefLatitude: data.location ? this.convertToLatLong(data.location.latitude) : null,
      RefLongitude: data.location ? this.convertToLatLong(data.location.longitude) : null,
      RefElevation: 0.0,
      LandTitleNumber: null,
      SiteAddress: data.location?.address ? this.createAddress(data.location.address) : null
    }

    this.ifcAPI.WriteLine(this.modelID, site)
    return site.GlobalId
  }

  /**
   * 建物情報の作成
   */
  private createBuilding(data: EnhancedIFCData, buildingData: any): number {
    const building = {
      type: WebIFC.IFCBUILDING,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: buildingData.name,
      Description: buildingData.description,
      ObjectType: data.buildingInfo.usage,
      ObjectPlacement: this.createLocalPlacement(),
      Representation: null,
      LongName: `${data.buildingInfo.usage} ${data.buildingInfo.floors}階建て`,
      CompositionType: WebIFC.IFCELEMENTCOMPOSITIONENUM.ELEMENT,
      ElevationOfRefHeight: 0.0,
      ElevationOfTerrain: 0.0,
      BuildingAddress: data.location?.address ? this.createAddress(data.location.address) : null
    }

    this.ifcAPI.WriteLine(this.modelID, building)
    return building.GlobalId
  }

  /**
   * 詳細な階情報の作成
   */
  private createDetailedStoreys(stories: any[], buildingInfo: BuildingInfo): number[] {
    const storeys: number[] = []

    stories.forEach((story, index) => {
      const storey = {
        type: WebIFC.IFCBUILDINGSTOREY,
        GlobalId: this.createGuid(),
        OwnerHistory: this.createOwnerHistory(),
        Name: story.name,
        Description: null,
        ObjectType: null,
        ObjectPlacement: this.createLocalPlacement(0, 0, story.elevation * 1000), // m to mm
        Representation: null,
        LongName: null,
        CompositionType: WebIFC.IFCELEMENTCOMPOSITIONENUM.ELEMENT,
        Elevation: story.elevation
      }

      const storeyId = this.ifcAPI.WriteLine(this.modelID, storey)
      storeys.push(storeyId)
    })

    return storeys
  }

  /**
   * 構造要素の作成
   */
  private createStructuralElements(structure: any, storeys: number[]): void {
    const { type, grid, foundation } = structure

    // 基礎の作成
    if (foundation) {
      this.createFoundation(foundation, storeys[0])
    }

    // 柱の作成
    storeys.forEach((storey, index) => {
      this.createColumns(grid, storey, index)
    })

    // 梁の作成
    storeys.forEach((storey, index) => {
      this.createBeams(grid, storey, index)
    })

    // スラブの作成
    storeys.forEach((storey, index) => {
      this.createSlabs(grid, storey, index)
    })
  }

  /**
   * 空間の作成
   */
  private createSpaces(spaces: any[], storeys: number[]): void {
    spaces.forEach(space => {
      if (space.floor < storeys.length) {
        const spaceElement = {
          type: WebIFC.IFCSPACE,
          GlobalId: this.createGuid(),
          OwnerHistory: this.createOwnerHistory(),
          Name: space.type === 'residential' ? '住戸部分' : '共用部分',
          Description: `面積: ${space.area}㎡`,
          ObjectType: space.type,
          ObjectPlacement: this.createLocalPlacement(),
          Representation: null,
          LongName: null,
          CompositionType: WebIFC.IFCELEMENTCOMPOSITIONENUM.ELEMENT,
          InteriorOrExteriorSpace: WebIFC.IFCINTERNALOREXTERNALENUM.INTERNAL,
          ElevationWithFlooring: 0.0
        }

        const spaceId = this.ifcAPI.WriteLine(this.modelID, spaceElement)
        this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storeys[space.floor], [spaceId]))
      }
    })
  }

  /**
   * ファサード要素の作成
   */
  private createFacadeElements(facades: any, storeys: number[]): void {
    // 窓の作成
    if (facades.windows) {
      facades.windows.forEach((window: any) => {
        if (window.floor < storeys.length) {
          this.createWindow(window, storeys[window.floor])
        }
      })
    }

    // ドアの作成
    if (facades.doors) {
      facades.doors.forEach((door: any) => {
        if (door.floor < storeys.length) {
          this.createDoor(door, storeys[door.floor])
        }
      })
    }

    // バルコニーの作成
    if (facades.balconies) {
      facades.balconies.forEach((balcony: any) => {
        if (balcony.floor < storeys.length) {
          this.createBalcony(balcony, storeys[balcony.floor])
        }
      })
    }
  }

  /**
   * 基礎の作成
   */
  private createFoundation(foundation: any, groundFloor: number): void {
    const footing = {
      type: WebIFC.IFCFOOTING,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: '基礎',
      Description: `${foundation.type}, 深さ: ${foundation.depth}m`,
      ObjectType: foundation.type,
      ObjectPlacement: this.createLocalPlacement(0, 0, -foundation.depth * 1000),
      Representation: null,
      Tag: null,
      PredefinedType: WebIFC.IFCFOOTINGTYPEENUM.STRIP_FOOTING
    }

    const footingId = this.ifcAPI.WriteLine(this.modelID, footing)
    this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(groundFloor, [footingId]))
  }

  /**
   * 柱の作成
   */
  private createColumns(grid: any, storey: number, floorIndex: number): void {
    const spacing = grid.columnSpacing * 1000 // m to mm
    const numColumns = 4 // 簡略化のため4本の柱を配置

    for (let i = 0; i < numColumns; i++) {
      const x = (i % 2) * spacing - spacing / 2
      const z = Math.floor(i / 2) * spacing - spacing / 2

      const column = {
        type: WebIFC.IFCCOLUMN,
        GlobalId: this.createGuid(),
        OwnerHistory: this.createOwnerHistory(),
        Name: `柱${floorIndex + 1}-${i + 1}`,
        Description: null,
        ObjectType: null,
        ObjectPlacement: this.createLocalPlacement(x, 0, z),
        Representation: null,
        Tag: `C${floorIndex + 1}-${i + 1}`
      }

      const columnId = this.ifcAPI.WriteLine(this.modelID, column)
      this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [columnId]))
    }
  }

  /**
   * 梁の作成
   */
  private createBeams(grid: any, storey: number, floorIndex: number): void {
    const beam = {
      type: WebIFC.IFCBEAM,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: `梁${floorIndex + 1}`,
      Description: `梁成: ${grid.beamDepth}m`,
      ObjectType: null,
      ObjectPlacement: this.createLocalPlacement(),
      Representation: null,
      Tag: `B${floorIndex + 1}`
    }

    const beamId = this.ifcAPI.WriteLine(this.modelID, beam)
    this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [beamId]))
  }

  /**
   * スラブの作成
   */
  private createSlabs(grid: any, storey: number, floorIndex: number): void {
    const slab = {
      type: WebIFC.IFCSLAB,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: `スラブ${floorIndex + 1}`,
      Description: `厚さ: ${grid.slabThickness}m`,
      ObjectType: null,
      ObjectPlacement: this.createLocalPlacement(),
      Representation: null,
      Tag: `S${floorIndex + 1}`,
      PredefinedType: WebIFC.IFCSLABTYPEENUM.FLOOR
    }

    const slabId = this.ifcAPI.WriteLine(this.modelID, slab)
    this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [slabId]))
  }

  /**
   * 窓の作成
   */
  private createWindow(windowData: any, storey: number): void {
    const window = {
      type: WebIFC.IFCWINDOW,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: '窓',
      Description: `${windowData.width}m × ${windowData.height}m`,
      ObjectType: null,
      ObjectPlacement: this.createLocalPlacement(
        windowData.position.x * 1000,
        windowData.position.y * 1000,
        windowData.position.z * 1000
      ),
      Representation: null,
      Tag: null,
      OverallHeight: windowData.height * 1000,
      OverallWidth: windowData.width * 1000
    }

    const windowId = this.ifcAPI.WriteLine(this.modelID, window)
    this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [windowId]))
  }

  /**
   * ドアの作成
   */
  private createDoor(doorData: any, storey: number): void {
    const door = {
      type: WebIFC.IFCDOOR,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: doorData.type === 'entrance' ? 'エントランスドア' : '住戸ドア',
      Description: `${doorData.width}m × ${doorData.height}m`,
      ObjectType: doorData.type,
      ObjectPlacement: this.createLocalPlacement(
        doorData.position.x * 1000,
        doorData.position.y * 1000,
        doorData.position.z * 1000
      ),
      Representation: null,
      Tag: null,
      OverallHeight: doorData.height * 1000,
      OverallWidth: doorData.width * 1000
    }

    const doorId = this.ifcAPI.WriteLine(this.modelID, door)
    this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [doorId]))
  }

  /**
   * バルコニーの作成
   */
  private createBalcony(balconyData: any, storey: number): void {
    const balcony = {
      type: WebIFC.IFCSLAB,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: 'バルコニー',
      Description: `${balconyData.width}m × ${balconyData.depth}m`,
      ObjectType: 'BALCONY',
      ObjectPlacement: this.createLocalPlacement(
        balconyData.position.x * 1000,
        balconyData.position.y * 1000,
        balconyData.position.z * 1000
      ),
      Representation: null,
      Tag: null,
      PredefinedType: WebIFC.IFCSLABTYPEENUM.LANDING
    }

    const balconyId = this.ifcAPI.WriteLine(this.modelID, balcony)
    this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [balconyId]))
  }

  /**
   * 駐車場要素の作成
   */
  private createParkingElements(parkingPlan: ParkingPlan, site: number): void {
    if (parkingPlan.parkingSpaces > 0) {
      const parking = {
        type: WebIFC.IFCSPACE,
        GlobalId: this.createGuid(),
        OwnerHistory: this.createOwnerHistory(),
        Name: '駐車場',
        Description: `${parkingPlan.parkingSpaces}台`,
        ObjectType: 'PARKING',
        ObjectPlacement: this.createLocalPlacement(),
        Representation: null,
        LongName: null,
        CompositionType: WebIFC.IFCELEMENTCOMPOSITIONENUM.ELEMENT,
        InteriorOrExteriorSpace: WebIFC.IFCINTERNALOREXTERNALENUM.EXTERNAL,
        ElevationWithFlooring: 0.0
      }

      const parkingId = this.ifcAPI.WriteLine(this.modelID, parking)
      this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(site, [parkingId]))
    }
  }

  // =====================
  // ユーティリティメソッド
  // =====================

  private createGuid(): number {
    // 簡易的なGUID生成
    const guid = {
      type: WebIFC.IFCGLOBALLYUNIQUEID,
      value: `${this.globalIdCounter++}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    return this.ifcAPI.WriteLine(this.modelID, guid)
  }

  private createOwnerHistory(): number {
    const ownerHistory = {
      type: WebIFC.IFCOWNERHISTORY,
      OwningUser: this.createPersonAndOrganization(),
      OwningApplication: this.createApplication(),
      State: WebIFC.IFCSTATENUM.READONLY,
      ChangeAction: WebIFC.IFCCHANGEACTIONENUM.ADDED,
      LastModifiedDate: Date.now(),
      LastModifyingUser: null,
      LastModifyingApplication: null,
      CreationDate: Date.now()
    }
    return this.ifcAPI.WriteLine(this.modelID, ownerHistory)
  }

  private createPersonAndOrganization(): number {
    const person = {
      type: WebIFC.IFCPERSON,
      Identification: 'user',
      FamilyName: 'User',
      GivenName: 'Smart Building Planner',
      MiddleNames: null,
      PrefixTitles: null,
      SuffixTitles: null,
      Roles: null,
      Addresses: null
    }
    const personId = this.ifcAPI.WriteLine(this.modelID, person)

    const organization = {
      type: WebIFC.IFCORGANIZATION,
      Identification: 'SmartBuildingPlanner',
      Name: 'Smart Building Planner',
      Description: null,
      Roles: null,
      Addresses: null
    }
    const organizationId = this.ifcAPI.WriteLine(this.modelID, organization)

    const personAndOrg = {
      type: WebIFC.IFCPERSONANDORGANIZATION,
      ThePerson: personId,
      TheOrganization: organizationId,
      Roles: null
    }
    return this.ifcAPI.WriteLine(this.modelID, personAndOrg)
  }

  private createApplication(): number {
    const application = {
      type: WebIFC.IFCAPPLICATION,
      ApplicationDeveloper: this.createOrganization(),
      Version: '1.0.0',
      ApplicationFullName: 'Smart Building Planner',
      ApplicationIdentifier: 'SBP'
    }
    return this.ifcAPI.WriteLine(this.modelID, application)
  }

  private createOrganization(): number {
    const organization = {
      type: WebIFC.IFCORGANIZATION,
      Identification: 'SmartBuildingPlanner',
      Name: 'Smart Building Planner',
      Description: 'AI-powered building design and estimation platform',
      Roles: null,
      Addresses: null
    }
    return this.ifcAPI.WriteLine(this.modelID, organization)
  }

  private createGeometricRepresentationContext(): number {
    const context = {
      type: WebIFC.IFCGEOMETRICREPRESENTATIONCONTEXT,
      ContextIdentifier: '3D',
      ContextType: 'Model',
      CoordinateSpaceDimension: 3,
      Precision: 0.01,
      WorldCoordinateSystem: this.createAxis2Placement3D(),
      TrueNorth: null
    }
    return this.ifcAPI.WriteLine(this.modelID, context)
  }

  private createAxis2Placement3D(x: number = 0, y: number = 0, z: number = 0): number {
    const location = {
      type: WebIFC.IFCCARTESIANPOINT,
      Coordinates: [x, y, z]
    }
    const locationId = this.ifcAPI.WriteLine(this.modelID, location)

    const axis = {
      type: WebIFC.IFCDIRECTION,
      DirectionRatios: [0, 0, 1]
    }
    const axisId = this.ifcAPI.WriteLine(this.modelID, axis)

    const refDirection = {
      type: WebIFC.IFCDIRECTION,
      DirectionRatios: [1, 0, 0]
    }
    const refDirectionId = this.ifcAPI.WriteLine(this.modelID, refDirection)

    const placement = {
      type: WebIFC.IFCAXIS2PLACEMENT3D,
      Location: locationId,
      Axis: axisId,
      RefDirection: refDirectionId
    }
    return this.ifcAPI.WriteLine(this.modelID, placement)
  }

  private createLocalPlacement(x: number = 0, y: number = 0, z: number = 0): number {
    const placement = {
      type: WebIFC.IFCLOCALPLACEMENT,
      PlacementRelTo: null,
      RelativePlacement: this.createAxis2Placement3D(x, y, z)
    }
    return this.ifcAPI.WriteLine(this.modelID, placement)
  }

  private createUnitAssignment(): number {
    const units = []

    // 長さの単位
    units.push({
      type: WebIFC.IFCSIUNIT,
      Dimensions: null,
      UnitType: WebIFC.IFCUNITTYPE.LENGTHUNIT,
      Prefix: WebIFC.IFCSIUNITPREFIX.MILLI,
      Name: WebIFC.IFCSIUNITNAME.METRE
    })

    // 面積の単位
    units.push({
      type: WebIFC.IFCSIUNIT,
      Dimensions: null,
      UnitType: WebIFC.IFCUNITTYPE.AREAUNIT,
      Prefix: null,
      Name: WebIFC.IFCSIUNITNAME.SQUARE_METRE
    })

    // 体積の単位
    units.push({
      type: WebIFC.IFCSIUNIT,
      Dimensions: null,
      UnitType: WebIFC.IFCUNITTYPE.VOLUMEUNIT,
      Prefix: null,
      Name: WebIFC.IFCSIUNITNAME.CUBIC_METRE
    })

    const unitIds = units.map(unit => this.ifcAPI.WriteLine(this.modelID, unit))

    const unitAssignment = {
      type: WebIFC.IFCUNITASSIGNMENT,
      Units: unitIds
    }
    return this.ifcAPI.WriteLine(this.modelID, unitAssignment)
  }

  private createRelAggregates(relating: number, related: number[]): any {
    return {
      type: WebIFC.IFCRELAGGREGATES,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: null,
      Description: null,
      RelatingObject: relating,
      RelatedObjects: related
    }
  }

  private createRelContainedInSpatialStructure(relating: number, related: number[]): any {
    return {
      type: WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: null,
      Description: null,
      RelatedElements: related,
      RelatingStructure: relating
    }
  }

  private convertToLatLong(decimal: number): number[] {
    const degrees = Math.floor(Math.abs(decimal))
    const minutes = Math.floor((Math.abs(decimal) - degrees) * 60)
    const seconds = Math.round(((Math.abs(decimal) - degrees) * 60 - minutes) * 60)
    const direction = decimal >= 0 ? 1 : -1
    return [direction * degrees, minutes, seconds]
  }

  private createAddress(addressString: string): number {
    const address = {
      type: WebIFC.IFCPOSTALADDRESS,
      Purpose: WebIFC.IFCADDRESSTYPEENUM.SITE,
      Description: null,
      UserDefinedPurpose: null,
      InternalLocation: null,
      AddressLines: [addressString],
      PostalBox: null,
      Town: null,
      Region: null,
      PostalCode: null,
      Country: 'Japan'
    }
    return this.ifcAPI.WriteLine(this.modelID, address)
  }
}

export default new IFCGeneratorEnhanced()