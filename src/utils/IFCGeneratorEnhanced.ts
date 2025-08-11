import * as WebIFC from 'web-ifc'
import { BuildingInfo, SiteInfo, ParkingPlan } from '../types/project'
import text2BIMService from '../services/text2bim.service'

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
    this.modelID = this.ifcAPI.CreateModel({ schema: WebIFC.Schemas.IFC2X3 })

    // Text2BIMで詳細な建物形状を生成
    const text2BIMResult = text2BIMService.generateDetailedBuilding(
      data.buildingInfo,
      data.siteInfo,
      data.parkingPlan
    )

    // IFC用の詳細データを生成
    const ifcData = text2BIMService.generateIFCData(data.buildingInfo, text2BIMResult)

    // プロジェクト情報の設定
    this.createProject(data)
    
    // サイトの作成
    const site = this.createSite(data)
    
    // 建物の作成
    const building = this.createBuilding(data, ifcData.building)
    
    // 建物階層の設定
    this.ifcAPI.WriteLine(this.modelID, this.createRelAggregates(site, [building]))

    // 各階の作成
    const storeys = this.createDetailedStoreys(ifcData.stories)
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
      expressID: ++this.globalIdCounter,
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

    this.ifcAPI.WriteLine(this.modelID, project)
    return project.GlobalId
  }

  /**
   * サイト情報の作成
   */
  private createSite(data: EnhancedIFCData): number {
    const site = {
      expressID: ++this.globalIdCounter,
      type: WebIFC.IFCSITE,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: 'Building Site',
      Description: data.siteInfo ? `用途地域: ${data.siteInfo.zoningType}` : null,
      ObjectType: null,
      ObjectPlacement: this.createLocalPlacement(),
      Representation: null,
      LongName: data.location?.address || null,
      CompositionType: WebIFC.IFCELEMENTCOMPONENT,
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
      expressID: ++this.globalIdCounter,
      type: WebIFC.IFCBUILDING,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: buildingData.name,
      Description: buildingData.description,
      ObjectType: data.buildingInfo.usage,
      ObjectPlacement: this.createLocalPlacement(),
      Representation: null,
      LongName: `${data.buildingInfo.usage} ${data.buildingInfo.floors}階建て`,
      CompositionType: WebIFC.IFCELEMENTCOMPONENT,
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
  private createDetailedStoreys(stories: any[]): number[] {
    const storeys: number[] = []

    stories.forEach((story) => {
      const storey = {
        expressID: ++this.globalIdCounter,
        type: WebIFC.IFCBUILDINGSTOREY,
        GlobalId: this.createGuid(),
        OwnerHistory: this.createOwnerHistory(),
        Name: story.name,
        Description: null,
        ObjectType: null,
        ObjectPlacement: this.createLocalPlacement(0, 0, story.elevation * 1000), // m to mm
        Representation: null,
        LongName: null,
        CompositionType: WebIFC.IFCELEMENTCOMPONENT,
        Elevation: story.elevation
      }

      this.ifcAPI.WriteLine(this.modelID, storey)
      storeys.push(storey.expressID)
    })

    return storeys
  }

  /**
   * 構造要素の作成
   */
  private createStructuralElements(structure: any, storeys: number[]): void {
    const { grid, foundation } = structure

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
          expressID: ++this.globalIdCounter,
          type: WebIFC.IFCSPACE,
          GlobalId: this.createGuid(),
          OwnerHistory: this.createOwnerHistory(),
          Name: space.type === 'residential' ? '住戸部分' : '共用部分',
          Description: `面積: ${space.area}㎡`,
          ObjectType: space.type,
          ObjectPlacement: this.createLocalPlacement(),
          Representation: null,
          LongName: null,
          CompositionType: WebIFC.IFCELEMENTCOMPONENT,
          // InteriorOrExteriorSpace: WebIFC.IFCINTERNALOREXTERNALENUM.INTERNAL,
          ElevationWithFlooring: 0.0
        }

        this.ifcAPI.WriteLine(this.modelID, spaceElement)
        this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storeys[space.floor], [spaceElement.expressID]))
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
    const footingId = ++this.globalIdCounter
    const footing = {
      expressID: footingId,
      type: WebIFC.IFCFOOTING,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: '基礎',
      Description: `${foundation.type}, 深さ: ${foundation.depth}m`,
      ObjectType: foundation.type,
      ObjectPlacement: this.createLocalPlacement(0, 0, -foundation.depth * 1000),
      Representation: null,
      Tag: null,
      PredefinedType: 0 // DEFAULT FOOTING TYPE
    }

    this.ifcAPI.WriteLine(this.modelID, footing)
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

      const columnId = ++this.globalIdCounter
      const column = {
        expressID: columnId,
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

      this.ifcAPI.WriteLine(this.modelID, column)
      this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [columnId]))
    }
  }

  /**
   * 梁の作成
   */
  private createBeams(grid: any, storey: number, floorIndex: number): void {
    const beamId = ++this.globalIdCounter
    const beam = {
      expressID: beamId,
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

    this.ifcAPI.WriteLine(this.modelID, beam)
    this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [beamId]))
  }

  /**
   * スラブの作成
   */
  private createSlabs(grid: any, storey: number, floorIndex: number): void {
    const slabId = ++this.globalIdCounter
    const slab = {
      expressID: slabId,
      type: WebIFC.IFCSLAB,
      GlobalId: this.createGuid(),
      OwnerHistory: this.createOwnerHistory(),
      Name: `スラブ${floorIndex + 1}`,
      Description: `厚さ: ${grid.slabThickness}m`,
      ObjectType: null,
      ObjectPlacement: this.createLocalPlacement(),
      Representation: null,
      Tag: `S${floorIndex + 1}`,
      PredefinedType: 0 // FLOOR
    }

    this.ifcAPI.WriteLine(this.modelID, slab)
    this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [slabId]))
  }

  /**
   * 窓の作成
   */
  private createWindow(windowData: any, storey: number): void {
    const windowId = ++this.globalIdCounter
    const window = {
      expressID: windowId,
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

    this.ifcAPI.WriteLine(this.modelID, window)
    this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [windowId]))
  }

  /**
   * ドアの作成
   */
  private createDoor(doorData: any, storey: number): void {
    const doorId = ++this.globalIdCounter
    const door = {
      expressID: doorId,
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

    this.ifcAPI.WriteLine(this.modelID, door)
    this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [doorId]))
  }

  /**
   * バルコニーの作成
   */
  private createBalcony(balconyData: any, storey: number): void {
    const balconyId = ++this.globalIdCounter
    const balcony = {
      expressID: balconyId,
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
      PredefinedType: 2 // LANDING
    }

    this.ifcAPI.WriteLine(this.modelID, balcony)
    this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(storey, [balconyId]))
  }

  /**
   * 駐車場要素の作成
   */
  private createParkingElements(parkingPlan: ParkingPlan, site: number): void {
    if (parkingPlan.parkingSpaces > 0) {
      const parkingId = ++this.globalIdCounter
      const parking = {
        expressID: parkingId,
        type: WebIFC.IFCSPACE,
        GlobalId: this.createGuid(),
        OwnerHistory: this.createOwnerHistory(),
        Name: '駐車場',
        Description: `${parkingPlan.parkingSpaces}台`,
        ObjectType: 'PARKING',
        ObjectPlacement: this.createLocalPlacement(),
        Representation: null,
        LongName: null,
        CompositionType: WebIFC.IFCELEMENTCOMPONENT,
        // InteriorOrExteriorSpace: 0, // EXTERNAL
        ElevationWithFlooring: 0.0
      }

      this.ifcAPI.WriteLine(this.modelID, parking)
      this.ifcAPI.WriteLine(this.modelID, this.createRelContainedInSpatialStructure(site, [parkingId]))
    }
  }

  // =====================
  // ユーティリティメソッド
  // =====================

  private createGuid(): number {
    // 簡易的なGUID生成
    const guid = {
      expressID: ++this.globalIdCounter,
      type: WebIFC.IFCGLOBALLYUNIQUEID,
      value: `${this.globalIdCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    this.ifcAPI.WriteLine(this.modelID, guid)
    return guid.expressID
  }

  private createOwnerHistory(): number {
    const ownerHistory = {
      expressID: ++this.globalIdCounter,
      type: WebIFC.IFCOWNERHISTORY,
      OwningUser: this.createPersonAndOrganization(),
      OwningApplication: this.createApplication(),
      State: 0, // READONLY
      ChangeAction: 0, // ADDED
      LastModifiedDate: Date.now(),
      LastModifyingUser: null,
      LastModifyingApplication: null,
      CreationDate: Date.now()
    }
    this.ifcAPI.WriteLine(this.modelID, ownerHistory)
    return ownerHistory.expressID
  }

  private createPersonAndOrganization(): number {
    const personId = ++this.globalIdCounter
    const person = {
      expressID: personId,
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
    this.ifcAPI.WriteLine(this.modelID, person)

    const organizationId = ++this.globalIdCounter
    const organization = {
      expressID: organizationId,
      type: WebIFC.IFCORGANIZATION,
      Identification: 'SmartBuildingPlanner',
      Name: 'Smart Building Planner',
      Description: null,
      Roles: null,
      Addresses: null
    }
    this.ifcAPI.WriteLine(this.modelID, organization)

    const personAndOrgId = ++this.globalIdCounter
    const personAndOrg = {
      expressID: personAndOrgId,
      type: WebIFC.IFCPERSONANDORGANIZATION,
      ThePerson: personId,
      TheOrganization: organizationId,
      Roles: null
    }
    this.ifcAPI.WriteLine(this.modelID, personAndOrg)
    return personAndOrgId
  }

  private createApplication(): number {
    const applicationId = ++this.globalIdCounter
    const application = {
      expressID: applicationId,
      type: WebIFC.IFCAPPLICATION,
      ApplicationDeveloper: this.createOrganization(),
      Version: '1.0.0',
      ApplicationFullName: 'Smart Building Planner',
      ApplicationIdentifier: 'SBP'
    }
    this.ifcAPI.WriteLine(this.modelID, application)
    return applicationId
  }

  private createOrganization(): number {
    const organizationId = ++this.globalIdCounter
    const organization = {
      expressID: organizationId,
      type: WebIFC.IFCORGANIZATION,
      Identification: 'SmartBuildingPlanner',
      Name: 'Smart Building Planner',
      Description: 'AI-powered building design and estimation platform',
      Roles: null,
      Addresses: null
    }
    this.ifcAPI.WriteLine(this.modelID, organization)
    return organizationId
  }

  private createGeometricRepresentationContext(): number {
    const contextId = ++this.globalIdCounter
    const context = {
      expressID: contextId,
      type: WebIFC.IFCGEOMETRICREPRESENTATIONCONTEXT,
      ContextIdentifier: '3D',
      ContextType: 'Model',
      CoordinateSpaceDimension: 3,
      Precision: 0.01,
      WorldCoordinateSystem: this.createAxis2Placement3D(),
      TrueNorth: null
    }
    this.ifcAPI.WriteLine(this.modelID, context)
    return contextId
  }

  private createAxis2Placement3D(x: number = 0, y: number = 0, z: number = 0): number {
    const locationId = ++this.globalIdCounter
    const location = {
      expressID: locationId,
      type: WebIFC.IFCCARTESIANPOINT,
      Coordinates: [x, y, z]
    }
    this.ifcAPI.WriteLine(this.modelID, location)

    const axisId = ++this.globalIdCounter
    const axis = {
      expressID: axisId,
      type: WebIFC.IFCDIRECTION,
      DirectionRatios: [0, 0, 1]
    }
    this.ifcAPI.WriteLine(this.modelID, axis)

    const refDirectionId = ++this.globalIdCounter
    const refDirection = {
      expressID: refDirectionId,
      type: WebIFC.IFCDIRECTION,
      DirectionRatios: [1, 0, 0]
    }
    this.ifcAPI.WriteLine(this.modelID, refDirection)

    const placementId = ++this.globalIdCounter
    const placement = {
      expressID: placementId,
      type: WebIFC.IFCAXIS2PLACEMENT3D,
      Location: locationId,
      Axis: axisId,
      RefDirection: refDirectionId
    }
    this.ifcAPI.WriteLine(this.modelID, placement)
    return placementId
  }

  private createLocalPlacement(x: number = 0, y: number = 0, z: number = 0): number {
    const placementId = ++this.globalIdCounter
    const placement = {
      expressID: placementId,
      type: WebIFC.IFCLOCALPLACEMENT,
      PlacementRelTo: null,
      RelativePlacement: this.createAxis2Placement3D(x, y, z)
    }
    this.ifcAPI.WriteLine(this.modelID, placement)
    return placementId
  }

  private createUnitAssignment(): number {
    const unitIds: number[] = []

    // 長さの単位
    const lengthUnitId = ++this.globalIdCounter
    const lengthUnit = {
      expressID: lengthUnitId,
      type: WebIFC.IFCSIUNIT,
      Dimensions: null,
      UnitType: 1, // LENGTHUNIT
      Prefix: 3, // MILLI
      Name: 1 // METRE
    }
    this.ifcAPI.WriteLine(this.modelID, lengthUnit)
    unitIds.push(lengthUnitId)

    // 面積の単位
    const areaUnitId = ++this.globalIdCounter
    const areaUnit = {
      expressID: areaUnitId,
      type: WebIFC.IFCSIUNIT,
      Dimensions: null,
      UnitType: 2, // AREAUNIT
      Prefix: null,
      Name: 2 // SQUARE_METRE
    }
    this.ifcAPI.WriteLine(this.modelID, areaUnit)
    unitIds.push(areaUnitId)

    // 体積の単位
    const volumeUnitId = ++this.globalIdCounter
    const volumeUnit = {
      expressID: volumeUnitId,
      type: WebIFC.IFCSIUNIT,
      Dimensions: null,
      UnitType: 3, // VOLUMEUNIT
      Prefix: null,
      Name: 3 // CUBIC_METRE
    }
    this.ifcAPI.WriteLine(this.modelID, volumeUnit)
    unitIds.push(volumeUnitId)

    const unitAssignmentId = ++this.globalIdCounter
    const unitAssignment = {
      expressID: unitAssignmentId,
      type: WebIFC.IFCUNITASSIGNMENT,
      Units: unitIds
    }
    this.ifcAPI.WriteLine(this.modelID, unitAssignment)
    return unitAssignmentId
  }

  private createRelAggregates(relating: number, related: number[]): any {
    const relId = ++this.globalIdCounter
    return {
      expressID: relId,
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
    const relId = ++this.globalIdCounter
    return {
      expressID: relId,
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
    const addressId = ++this.globalIdCounter
    const address = {
      expressID: addressId,
      type: WebIFC.IFCPOSTALADDRESS,
      Purpose: 0, // SITE
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
    this.ifcAPI.WriteLine(this.modelID, address)
    return addressId
  }
}

export default new IFCGeneratorEnhanced()