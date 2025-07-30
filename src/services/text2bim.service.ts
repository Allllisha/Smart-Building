import { BuildingInfo, SiteInfo, ParkingPlan, FloorAreaDetail, UnitType, BuildingShape } from '../types/project'
import * as THREE from 'three'

export interface Text2BIMResult {
  geometry: THREE.BufferGeometry
  floorGeometries: THREE.BufferGeometry[]
  balconyGeometries: THREE.BufferGeometry[]
  foundationGeometry: THREE.BufferGeometry
  metadata: BuildingMetadata
}

export interface BuildingMetadata {
  actualWidth: number
  actualDepth: number
  actualHeight: number
  floorHeights: number[]
  balconyPositions: BalconyPosition[]
  setbackInfo?: SetbackInfo
  structuralGrid: StructuralGrid
}

export interface BalconyPosition {
  floor: number
  position: THREE.Vector3
  width: number
  depth: number
}

export interface SetbackInfo {
  startFloor: number
  ratio: number
  setbackDistance: number
}

export interface StructuralGrid {
  columnSpacing: number
  beamDepth: number
  slabThickness: number
}

export class Text2BIMService {
  /**
   * BuildingInfoから詳細な3Dジオメトリを生成
   */
  generateDetailedBuilding(
    buildingInfo: BuildingInfo,
    siteInfo?: SiteInfo,
    parkingPlan?: ParkingPlan
  ): Text2BIMResult {
    // 建物の基本寸法を計算
    const dimensions = this.calculateBuildingDimensions(buildingInfo)
    
    // 構造グリッドを決定
    const structuralGrid = this.determineStructuralGrid(buildingInfo)
    
    // 階高の計算
    const floorHeights = this.calculateFloorHeights(buildingInfo, structuralGrid)
    
    // 建物形状の決定
    const shape = this.determineBuildingShape(buildingInfo, dimensions)
    
    // 基礎部分の生成
    const foundationGeometry = this.createFoundation(dimensions, buildingInfo.foundationHeight || 100)
    
    // 各階のジオメトリを生成
    const { floorGeometries, mainGeometry, balconyGeometries, setbackInfo } = 
      this.createFloorByFloorGeometry(buildingInfo, dimensions, floorHeights, shape)
    
    // バルコニー位置の計算
    const balconyPositions = this.calculateBalconyPositions(
      buildingInfo, 
      dimensions, 
      floorHeights
    )
    
    return {
      geometry: mainGeometry,
      floorGeometries,
      balconyGeometries,
      foundationGeometry,
      metadata: {
        actualWidth: dimensions.width,
        actualDepth: dimensions.depth,
        actualHeight: (buildingInfo.maxHeight || 10000) / 1000,
        floorHeights,
        balconyPositions,
        setbackInfo,
        structuralGrid
      }
    }
  }

  /**
   * 建物の実際の寸法を計算
   */
  private calculateBuildingDimensions(buildingInfo: BuildingInfo): { width: number; depth: number } {
    const { buildingArea, totalFloorArea, floors, usage } = buildingInfo
    
    // buildingAreaがnullの場合はデフォルト値を使用
    const area = buildingArea || 100 // デフォルト100㎡
    
    // 延床面積と建築面積の比率から建物の形状を推定
    const floorAreaRatio = totalFloorArea && area ? totalFloorArea / area : floors
    
    // 用途に応じたアスペクト比を決定
    let aspectRatio = 1.0 // デフォルトは正方形
    
    switch (usage) {
      case '共同住宅':
        // 共同住宅は南面を広く取るため、東西に長い形状
        aspectRatio = 1.5 + (buildingInfo.units ? Math.min(buildingInfo.units / 20, 0.5) : 0)
        break
      case 'オフィス':
        // オフィスビルは効率的な平面計画のため、やや長方形
        aspectRatio = 1.3
        break
      case '商業施設':
        // 商業施設は間口を広く取る
        aspectRatio = 1.8
        break
      case '専用住宅':
        // 戸建住宅は敷地形状に応じて変化
        aspectRatio = 1.2
        break
    }
    
    // 建築面積から幅と奥行きを計算
    const depth = Math.sqrt(area / aspectRatio)
    const width = area / depth
    
    return { width, depth }
  }

  /**
   * 構造グリッドを決定
   */
  private determineStructuralGrid(buildingInfo: BuildingInfo): StructuralGrid {
    const { structure, usage } = buildingInfo
    
    let columnSpacing = 6.0 // デフォルト6m
    let beamDepth = 0.6 // デフォルト600mm
    let slabThickness = 0.2 // デフォルト200mm
    
    switch (structure) {
      case '壁式鉄筋コンクリート造':
        columnSpacing = 5.4 // 壁式は柱間隔が狭い
        beamDepth = 0.5
        slabThickness = 0.18
        break
      case '鉄骨造':
        columnSpacing = 8.0 // 鉄骨は大スパン可能
        beamDepth = 0.8
        slabThickness = 0.15
        break
      case '木造軸組工法':
        columnSpacing = 3.6 // 木造は柱間隔が狭い
        beamDepth = 0.3
        slabThickness = 0.24
        break
    }
    
    // 用途による調整
    if (usage === '商業施設') {
      columnSpacing *= 1.2 // 商業施設は大空間が必要
    }
    
    return { columnSpacing, beamDepth, slabThickness }
  }

  /**
   * 各階の階高を計算
   */
  private calculateFloorHeights(buildingInfo: BuildingInfo, structuralGrid: StructuralGrid): number[] {
    const { floors, usage } = buildingInfo
    const maxHeight = buildingInfo.maxHeight || 10000 // デフォルト10m
    const foundationHeight = buildingInfo.foundationHeight || 100 // デフォルト0.1m
    const floorHeights: number[] = []
    
    // 基礎を除いた有効高さ
    const effectiveHeight = (maxHeight - foundationHeight) / 1000 // mm to m
    
    // 用途別の標準階高
    let standardFloorHeight = effectiveHeight / floors
    let firstFloorHeight = standardFloorHeight
    
    switch (usage) {
      case '共同住宅':
        standardFloorHeight = Math.max(2.8, effectiveHeight / floors)
        firstFloorHeight = standardFloorHeight
        break
      case 'オフィス':
        standardFloorHeight = Math.max(3.6, effectiveHeight / floors)
        firstFloorHeight = standardFloorHeight * 1.2 // 1階は高め
        break
      case '商業施設':
        standardFloorHeight = Math.max(3.8, effectiveHeight / floors)
        firstFloorHeight = standardFloorHeight * 1.5 // 1階は特に高く
        break
      case '専用住宅':
        standardFloorHeight = Math.max(2.6, effectiveHeight / floors)
        firstFloorHeight = standardFloorHeight
        break
    }
    
    // 構造による調整
    standardFloorHeight -= structuralGrid.slabThickness
    
    // 各階の高さを設定
    let totalHeight = firstFloorHeight
    floorHeights.push(firstFloorHeight)
    
    for (let i = 1; i < floors; i++) {
      if (totalHeight + standardFloorHeight > effectiveHeight) {
        // 最上階は残りの高さ
        floorHeights.push(effectiveHeight - totalHeight)
      } else {
        floorHeights.push(standardFloorHeight)
        totalHeight += standardFloorHeight
      }
    }
    
    return floorHeights
  }

  /**
   * 建物形状を決定
   */
  private determineBuildingShape(
    buildingInfo: BuildingInfo, 
    dimensions: { width: number; depth: number }
  ): BuildingShape {
    const { usage, floors, totalFloorArea, buildingArea } = buildingInfo
    
    let footprintType: 'rectangle' | 'L-shape' | 'U-shape' | 'complex' = 'rectangle'
    let hasSetback = false
    let setbackFloor = 0
    let setbackRatio = 0
    
    // 延床面積と建築面積の関係から形状を推定
    const avgFloorArea = totalFloorArea ? totalFloorArea / floors : buildingArea
    
    // 高層建物でセットバックを検討
    if (floors > 5) {
      hasSetback = true
      setbackFloor = Math.floor(floors * 0.6)
      setbackRatio = 0.8
    }
    
    // 用途と規模に応じた形状決定
    if (usage === '共同住宅' && buildingInfo.units && buildingInfo.units > 20) {
      // 大規模共同住宅はL字型やコの字型を検討
      if (dimensions.width > 40) {
        footprintType = 'L-shape'
      }
      if (buildingInfo.units > 50) {
        footprintType = 'U-shape'
      }
    }
    
    return {
      footprintType,
      width: dimensions.width,
      depth: dimensions.depth,
      orientation: 0, // 北向きを0度とする
      hasSetback,
      setbackFloor,
      setbackRatio
    }
  }

  /**
   * 基礎部分のジオメトリを作成
   */
  private createFoundation(
    dimensions: { width: number; depth: number }, 
    foundationHeight: number
  ): THREE.BufferGeometry {
    const heightInMeters = foundationHeight / 1000
    const geometry = new THREE.BoxGeometry(
      dimensions.width * 1.1, // 基礎は建物より少し大きく
      heightInMeters,
      dimensions.depth * 1.1
    )
    geometry.translate(0, -heightInMeters / 2, 0) // 地面の下に配置
    return geometry
  }

  /**
   * 階ごとのジオメトリを生成
   */
  private createFloorByFloorGeometry(
    buildingInfo: BuildingInfo,
    dimensions: { width: number; depth: number },
    floorHeights: number[],
    shape: BuildingShape
  ): {
    floorGeometries: THREE.BufferGeometry[]
    mainGeometry: THREE.BufferGeometry
    balconyGeometries: THREE.BufferGeometry[]
    setbackInfo?: SetbackInfo
  } {
    const floorGeometries: THREE.BufferGeometry[] = []
    const balconyGeometries: THREE.BufferGeometry[] = []
    const geometries: THREE.BufferGeometry[] = []
    
    let currentHeight = 0
    let currentWidth = dimensions.width
    let currentDepth = dimensions.depth
    let setbackInfo: SetbackInfo | undefined
    
    for (let floor = 0; floor < buildingInfo.floors; floor++) {
      const floorHeight = floorHeights[floor]
      
      // セットバックの適用
      if (shape.hasSetback && floor >= shape.setbackFloor!) {
        if (!setbackInfo) {
          const setbackDistance = dimensions.width * (1 - shape.setbackRatio!) / 2
          setbackInfo = {
            startFloor: floor,
            ratio: shape.setbackRatio!,
            setbackDistance
          }
        }
        currentWidth = dimensions.width * shape.setbackRatio!
        currentDepth = dimensions.depth * shape.setbackRatio!
      }
      
      // 階の形状に応じたジオメトリ作成
      let floorGeometry: THREE.BufferGeometry
      
      switch (shape.footprintType) {
        case 'L-shape':
          floorGeometry = this.createLShapeFloor(currentWidth, floorHeight, currentDepth)
          break
        case 'U-shape':
          floorGeometry = this.createUShapeFloor(currentWidth, floorHeight, currentDepth)
          break
        case 'complex':
          floorGeometry = this.createComplexFloor(currentWidth, floorHeight, currentDepth, floor)
          break
        default:
          floorGeometry = new THREE.BoxGeometry(currentWidth, floorHeight, currentDepth)
      }
      
      // 階の位置を設定
      floorGeometry.translate(0, currentHeight + floorHeight / 2, 0)
      floorGeometries.push(floorGeometry.clone())
      geometries.push(floorGeometry)
      
      // バルコニーの追加（共同住宅の場合）
      if (buildingInfo.usage === '共同住宅' && floor > 0) {
        const balconyGeometry = this.createBalconyForFloor(
          currentWidth, 
          currentDepth, 
          currentHeight + floorHeight / 2,
          buildingInfo.units || 0
        )
        if (balconyGeometry) {
          balconyGeometries.push(balconyGeometry)
        }
      }
      
      currentHeight += floorHeight
    }
    
    // 全体のジオメトリを結合
    const mainGeometry = this.mergeGeometries(geometries)
    
    return { floorGeometries, mainGeometry, balconyGeometries, setbackInfo }
  }

  /**
   * L字型フロアの作成
   */
  private createLShapeFloor(width: number, height: number, depth: number): THREE.BufferGeometry {
    const shape = new THREE.Shape()
    
    // L字型の輪郭を定義
    shape.moveTo(-width / 2, -depth / 2)
    shape.lineTo(width / 2, -depth / 2)
    shape.lineTo(width / 2, 0)
    shape.lineTo(0, 0)
    shape.lineTo(0, depth / 2)
    shape.lineTo(-width / 2, depth / 2)
    shape.closePath()
    
    const extrudeSettings = {
      depth: height,
      bevelEnabled: false
    }
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geometry.rotateX(-Math.PI / 2)
    
    return geometry
  }

  /**
   * コの字型フロアの作成
   */
  private createUShapeFloor(width: number, height: number, depth: number): THREE.BufferGeometry {
    const shape = new THREE.Shape()
    const courtWidth = width * 0.4
    const courtDepth = depth * 0.6
    
    // コの字型の輪郭を定義
    shape.moveTo(-width / 2, -depth / 2)
    shape.lineTo(width / 2, -depth / 2)
    shape.lineTo(width / 2, depth / 2)
    shape.lineTo(-width / 2, depth / 2)
    shape.closePath()
    
    // 中庭部分をくり抜く
    const hole = new THREE.Path()
    hole.moveTo(-courtWidth / 2, -depth / 2)
    hole.lineTo(courtWidth / 2, -depth / 2)
    hole.lineTo(courtWidth / 2, courtDepth / 2)
    hole.lineTo(-courtWidth / 2, courtDepth / 2)
    hole.closePath()
    
    shape.holes.push(hole)
    
    const extrudeSettings = {
      depth: height,
      bevelEnabled: false
    }
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geometry.rotateX(-Math.PI / 2)
    
    return geometry
  }

  /**
   * 複雑な形状のフロア作成
   */
  private createComplexFloor(
    width: number, 
    height: number, 
    depth: number, 
    floor: number
  ): THREE.BufferGeometry {
    // フロアごとに異なる形状を生成
    const variation = (floor % 3) / 3
    const offsetX = width * 0.1 * Math.sin(floor * 0.5)
    const offsetZ = depth * 0.1 * Math.cos(floor * 0.5)
    
    const geometry = new THREE.BoxGeometry(
      width * (0.9 + variation * 0.1),
      height,
      depth * (0.9 + variation * 0.1)
    )
    
    geometry.translate(offsetX, 0, offsetZ)
    
    return geometry
  }

  /**
   * バルコニーの作成
   */
  private createBalconyForFloor(
    width: number, 
    depth: number, 
    floorHeight: number,
    units: number
  ): THREE.BufferGeometry | null {
    if (units === 0) return null
    
    const balconies: THREE.BufferGeometry[] = []
    const balconyWidth = 3.0 // 3m幅
    const balconyDepth = 1.5 // 1.5m奥行き
    const balconyHeight = 0.1 // 10cm厚
    
    // 南面に均等にバルコニーを配置
    const balconiesPerSide = Math.min(units, Math.floor(width / 4))
    const spacing = width / (balconiesPerSide + 1)
    
    for (let i = 0; i < balconiesPerSide; i++) {
      const x = -width / 2 + spacing * (i + 1)
      const z = depth / 2 + balconyDepth / 2
      
      const balconyGeometry = new THREE.BoxGeometry(balconyWidth, balconyHeight, balconyDepth)
      balconyGeometry.translate(x, floorHeight, z)
      balconies.push(balconyGeometry)
    }
    
    return this.mergeGeometries(balconies)
  }

  /**
   * バルコニー位置の計算
   */
  private calculateBalconyPositions(
    buildingInfo: BuildingInfo,
    dimensions: { width: number; depth: number },
    floorHeights: number[]
  ): BalconyPosition[] {
    const positions: BalconyPosition[] = []
    
    if (buildingInfo.usage !== '共同住宅' || !buildingInfo.units) {
      return positions
    }
    
    const unitsPerFloor = Math.ceil(buildingInfo.units / (buildingInfo.floors - 1))
    const balconyWidth = 3.0
    const balconyDepth = 1.5
    
    let currentHeight = floorHeights[0] // 1階をスキップ
    
    for (let floor = 1; floor < buildingInfo.floors; floor++) {
      const balconiesOnFloor = Math.min(unitsPerFloor, Math.floor(dimensions.width / 4))
      const spacing = dimensions.width / (balconiesOnFloor + 1)
      
      for (let i = 0; i < balconiesOnFloor; i++) {
        positions.push({
          floor,
          position: new THREE.Vector3(
            -dimensions.width / 2 + spacing * (i + 1),
            currentHeight + floorHeights[floor] / 2,
            dimensions.depth / 2 + balconyDepth / 2
          ),
          width: balconyWidth,
          depth: balconyDepth
        })
      }
      
      currentHeight += floorHeights[floor]
    }
    
    return positions
  }

  /**
   * ジオメトリの結合
   */
  private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const mergedGeometry = new THREE.BufferGeometry()
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    
    let indexOffset = 0
    
    for (const geometry of geometries) {
      const positionAttribute = geometry.attributes.position
      const normalAttribute = geometry.attributes.normal
      const uvAttribute = geometry.attributes.uv
      const index = geometry.index
      
      // Positions
      for (let i = 0; i < positionAttribute.count; i++) {
        positions.push(
          positionAttribute.getX(i),
          positionAttribute.getY(i),
          positionAttribute.getZ(i)
        )
      }
      
      // Normals
      if (normalAttribute) {
        for (let i = 0; i < normalAttribute.count; i++) {
          normals.push(
            normalAttribute.getX(i),
            normalAttribute.getY(i),
            normalAttribute.getZ(i)
          )
        }
      }
      
      // UVs
      if (uvAttribute) {
        for (let i = 0; i < uvAttribute.count; i++) {
          uvs.push(uvAttribute.getX(i), uvAttribute.getY(i))
        }
      }
      
      // Indices
      if (index) {
        for (let i = 0; i < index.count; i++) {
          // Three.js バージョン互換性対応
          const indexValue = typeof index.getAt === 'function' 
            ? index.getAt(i) 
            : index.array[i]
          indices.push(indexValue + indexOffset)
        }
      }
      
      indexOffset += positionAttribute.count
    }
    
    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    if (normals.length > 0) {
      mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    }
    if (uvs.length > 0) {
      mergedGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    }
    if (indices.length > 0) {
      mergedGeometry.setIndex(indices)
    }
    
    mergedGeometry.computeBoundingSphere()
    
    return mergedGeometry
  }

  /**
   * IFC生成用の詳細データを生成
   */
  generateIFCData(
    buildingInfo: BuildingInfo,
    result: Text2BIMResult
  ): any {
    // IFC生成に必要な詳細データを構造化
    return {
      building: {
        name: `${buildingInfo.usage}_${buildingInfo.floors}F`,
        description: `${buildingInfo.structure} ${buildingInfo.floors}階建て`,
        height: buildingInfo.maxHeight,
        footprint: {
          type: buildingInfo.buildingShape?.footprintType || 'rectangle',
          area: buildingInfo.buildingArea,
          dimensions: {
            width: result.metadata.actualWidth,
            depth: result.metadata.actualDepth
          }
        }
      },
      stories: result.metadata.floorHeights.map((height, index) => ({
        name: `${index + 1}F`,
        elevation: result.metadata.floorHeights.slice(0, index).reduce((a, b) => a + b, 0),
        height: height
      })),
      spaces: this.generateSpaces(buildingInfo, result),
      structure: {
        type: buildingInfo.structure,
        grid: result.metadata.structuralGrid,
        foundation: {
          type: 'continuous',
          depth: buildingInfo.foundationHeight / 1000
        }
      },
      facades: {
        balconies: result.metadata.balconyPositions,
        windows: this.generateWindows(buildingInfo, result),
        doors: this.generateDoors(buildingInfo, result)
      }
    }
  }

  /**
   * 空間情報の生成
   */
  private generateSpaces(buildingInfo: BuildingInfo, result: Text2BIMResult): any[] {
    const spaces: any[] = []
    
    if (buildingInfo.floorDetails) {
      buildingInfo.floorDetails.forEach((floorDetail, index) => {
        if (floorDetail.residentialArea) {
          spaces.push({
            floor: index,
            type: 'residential',
            area: floorDetail.residentialArea,
            height: result.metadata.floorHeights[index]
          })
        }
        if (floorDetail.capacityArea) {
          spaces.push({
            floor: index,
            type: 'common',
            area: floorDetail.capacityArea,
            height: result.metadata.floorHeights[index]
          })
        }
      })
    }
    
    return spaces
  }

  /**
   * 窓情報の生成
   */
  private generateWindows(buildingInfo: BuildingInfo, result: Text2BIMResult): any[] {
    const windows: any[] = []
    const windowHeight = 1.8 // 標準窓高さ
    const windowWidth = 1.5 // 標準窓幅
    const sillHeight = 0.8 // 窓台高さ
    
    // 各階に窓を配置
    for (let floor = 0; floor < buildingInfo.floors; floor++) {
      const floorElevation = result.metadata.floorHeights.slice(0, floor).reduce((a, b) => a + b, 0)
      
      // 南面に均等に窓を配置
      const windowCount = Math.floor(result.metadata.actualWidth / 3)
      const spacing = result.metadata.actualWidth / (windowCount + 1)
      
      for (let i = 0; i < windowCount; i++) {
        windows.push({
          floor,
          position: {
            x: -result.metadata.actualWidth / 2 + spacing * (i + 1),
            y: floorElevation + sillHeight,
            z: result.metadata.actualDepth / 2
          },
          width: windowWidth,
          height: windowHeight,
          orientation: 'south'
        })
      }
    }
    
    return windows
  }

  /**
   * ドア情報の生成
   */
  private generateDoors(buildingInfo: BuildingInfo, result: Text2BIMResult): any[] {
    const doors: any[] = []
    
    // エントランスドア
    doors.push({
      floor: 0,
      type: 'entrance',
      position: {
        x: 0,
        y: 0,
        z: result.metadata.actualDepth / 2
      },
      width: 2.0,
      height: 2.4
    })
    
    // 各住戸のドア（共同住宅の場合）
    if (buildingInfo.usage === '共同住宅' && buildingInfo.unitTypes) {
      let unitIndex = 0
      for (let floor = 1; floor < buildingInfo.floors; floor++) {
        const unitsOnFloor = Math.ceil(buildingInfo.units! / (buildingInfo.floors - 1))
        const spacing = result.metadata.actualWidth / (unitsOnFloor + 1)
        
        for (let i = 0; i < unitsOnFloor && unitIndex < buildingInfo.units!; i++) {
          doors.push({
            floor,
            type: 'unit',
            position: {
              x: -result.metadata.actualWidth / 2 + spacing * (i + 1),
              y: result.metadata.floorHeights.slice(0, floor).reduce((a, b) => a + b, 0),
              z: 0 // 廊下側
            },
            width: 0.9,
            height: 2.1
          })
          unitIndex++
        }
      }
    }
    
    return doors
  }
}

export default new Text2BIMService()