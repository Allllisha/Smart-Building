import mapboxgl from 'mapbox-gl'
import * as THREE from 'three'
import { Project } from '@/types/project'
import text2BIMService from './text2bim.service'

// Mapbox公開デモトークン（本番環境では環境変数を使用）
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'

export interface MapboxTerrain {
  elevation: number[][]
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  resolution: number
}

export class Mapbox3DService {
  private map: mapboxgl.Map | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.Camera | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private homePosition: { lng: number; lat: number } | null = null
  // private sunLight: THREE.DirectionalLight | null = null
  // private ambientLight: THREE.AmbientLight | null = null
  private currentProject: Project | null = null
  // private sunSphere: THREE.Mesh | null = null

  /**
   * 建物情報が有効かチェック
   */
  private hasValidBuildingInfo(project: Project): boolean {
    const { buildingInfo, siteInfo, location } = project
    
    // 必須項目のチェック
    return !!(
      buildingInfo.usage &&
      buildingInfo.structure &&
      buildingInfo.floors && buildingInfo.floors > 0 &&
      buildingInfo.buildingArea && buildingInfo.buildingArea > 0 &&
      siteInfo.siteArea && siteInfo.siteArea > 0 &&
      siteInfo.zoningType &&
      location.address
    )
  }

  /**
   * 3D地図を初期化
   */
  async initializeMap(container: HTMLElement, project: Project): Promise<mapboxgl.Map> {
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN

    const { latitude, longitude } = project.location

    // ホーム位置を保存
    this.homePosition = { lng: longitude, lat: latitude }

    // Mapbox地図を作成（実際に立っているような視点）
    this.map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/satellite-streets-v12', // より詳細な衛星画像
      center: [longitude, latitude],
      zoom: 18, // より詳細なズームレベル
      pitch: 85, // ほぼ地上からの視点
      bearing: 0,
      antialias: true,
      preserveDrawingBuffer: true // スクリーンショット撮影のために必要
    })

    // 地形データを追加
    this.map.on('style.load', () => {
      if (!this.map) return

      // 地形ソースを追加
      this.map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      })

      // 地形レイヤーを設定（exaggerationを1.0にして実際の高さに）
      this.map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.0 })

      // 既存の建物を3D表示
      this.add3DBuildings()

      // スカイボックスを追加
      this.addSkyLayer()

      // プロジェクト建物をMapboxレイヤーとして追加
      this.addProjectBuildingLayer(project)

      // Three.js建物3Dレイヤーを追加（バックアップ）
      this.addBuildingLayer(project)
    })

    return this.map
  }

  /**
   * プロジェクト建物をMapboxレイヤーとして追加
   */
  private addProjectBuildingLayer(project: Project) {
    if (!this.map) return

    // 必要な建物情報がない場合は建物を表示しない
    if (!this.hasValidBuildingInfo(project)) {
      console.log('建物情報が不足しているため、建物を表示しません')
      return
    }

    const { latitude, longitude } = project.location
    const { buildingArea, maxHeight } = project.buildingInfo
    
    // 建物のサイズ計算
    const area = buildingArea!
    const height = maxHeight || 10000 // デフォルト10m（10000mm）
    const buildingWidth = Math.sqrt(area)
    const buildingHeight = height / 1000 // mm to m
    
    // プロジェクト建物のGeoJSONデータを作成
    const projectBuildingData = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          height: buildingHeight,
          base_height: 0,
          project_building: true
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [longitude - buildingWidth/111000, latitude - buildingWidth/111000],
            [longitude + buildingWidth/111000, latitude - buildingWidth/111000],
            [longitude + buildingWidth/111000, latitude + buildingWidth/111000],
            [longitude - buildingWidth/111000, latitude + buildingWidth/111000],
            [longitude - buildingWidth/111000, latitude - buildingWidth/111000]
          ]]
        }
      }]
    }

    // プロジェクト建物のソースを追加
    this.map.addSource('project-building', {
      type: 'geojson',
      data: projectBuildingData as any
    })

    // プロジェクト建物のレイヤーを追加（目立つ赤色）
    this.map.addLayer({
      id: 'project-building-3d',
      source: 'project-building',
      type: 'fill-extrusion',
      paint: {
        'fill-extrusion-color': '#00FF00', // 目立つ緑色
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'base_height'],
        'fill-extrusion-opacity': 0.9
      }
    })

    console.log('🏗️ プロジェクト建物をMapboxレイヤーとして追加:', {
      coordinates: [longitude, latitude],
      size: buildingWidth,
      height: buildingHeight
    })
  }

  /**
   * 既存の建物を3D表示（影対応）
   */
  private add3DBuildings() {
    if (!this.map) return

    this.map.addLayer({
      'id': '3d-buildings',
      'source': 'composite',
      'source-layer': 'building',
      'filter': ['==', 'extrude', 'true'],
      'type': 'fill-extrusion',
      'minzoom': 15,
      'paint': {
        'fill-extrusion-color': [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          0, '#cccccc',
          50, '#aaaaaa',
          100, '#888888'
        ],
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          15.05,
          ['get', 'height']
        ],
        'fill-extrusion-base': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          15.05,
          ['get', 'min_height']
        ],
        'fill-extrusion-opacity': 0.8,
        // 影の表現を追加
        'fill-extrusion-ambient-occlusion-intensity': 0.3,
        'fill-extrusion-ambient-occlusion-radius': 3.0
      }
    })
  }

  /**
   * スカイボックスを追加（実際の空のような表現）
   */
  private addSkyLayer() {
    if (!this.map) return

    this.map.addLayer({
      'id': 'sky',
      'type': 'sky',
      'paint': {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 90.0], // 初期太陽位置（方位角、高度角）
        'sky-atmosphere-sun-intensity': 15
      }
    })
  }

  /**
   * 建物3Dレイヤーを追加
   */
  private addBuildingLayer(project: Project) {
    if (!this.map) return

    // 必要な建物情報がない場合は建物を表示しない
    if (!this.hasValidBuildingInfo(project)) {
      console.log('建物情報が不足しているため、Three.js建物レイヤーを追加しません')
      return
    }

    this.currentProject = project // プロジェクトを保存
    const { latitude, longitude } = project.location
    
    // Text2BIMを使用して詳細な建物形状を生成
    const text2BIMResult = text2BIMService.generateDetailedBuilding(
      project.buildingInfo,
      project.siteInfo,
      project.parkingPlan
    )

    // Three.js統合レイヤー
    const buildingLayer: any = {
      id: 'building-3d',
      type: 'custom',
      renderingMode: '3d',
      onAdd: (map: any, gl: any) => {
        // Three.js シーンをセットアップ
        this.scene = new THREE.Scene()
        
        // カメラをセットアップ
        this.camera = new THREE.Camera()
        
        // レンダラーをセットアップ
        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true
        })
        
        this.renderer.autoClear = false

        // Text2BIMから生成された詳細なジオメトリを使用
        const buildingGeometry = text2BIMResult.geometry

        // プロジェクト建物用の高品質マテリアル
        const buildingMaterial = new THREE.MeshPhongMaterial({
          color: 0x00FF00, // 明るい緑色で目立つように
          transparent: false,
          side: THREE.DoubleSide,
          shininess: 50
        })

        const building = new THREE.Mesh(buildingGeometry, buildingMaterial)
        building.position.set(0, 0, 0) // Text2BIMは既に正しい位置にジオメトリを配置
        building.castShadow = true
        building.receiveShadow = true
        building.userData.type = 'building'
        
        // 基礎部分を追加
        const foundationMaterial = new THREE.MeshPhongMaterial({
          color: 0x666666,
          opacity: 0.8,
          transparent: true
        })
        const foundation = new THREE.Mesh(text2BIMResult.foundationGeometry, foundationMaterial)
        foundation.castShadow = true
        foundation.receiveShadow = true
        foundation.userData.type = 'foundation'
        this.scene.add(foundation)
        
        // バルコニーを追加
        const balconyMaterial = new THREE.MeshPhongMaterial({
          color: 0xCCCCCC,
          opacity: 0.9,
          transparent: true
        })
        text2BIMResult.balconyGeometries.forEach((balconyGeometry, index) => {
          const balcony = new THREE.Mesh(balconyGeometry, balconyMaterial)
          balcony.castShadow = true
          balcony.receiveShadow = true
          balcony.userData.type = 'balcony'
          balcony.userData.index = index
          this.scene!.add(balcony)
        })

        // 各階の線を追加（Text2BIMの階高情報を使用）
        const { floorHeights, actualWidth, actualDepth } = text2BIMResult.metadata
        let currentHeight = 0
        for (let i = 1; i < (project.buildingInfo.floors || 1); i++) {
          currentHeight += floorHeights[i - 1]
          const floorLineGeometry = new THREE.BoxGeometry(
            actualWidth + 0.1,
            0.05,
            actualDepth + 0.1
          )
          const floorLineMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 })
          const floorLine = new THREE.Mesh(floorLineGeometry, floorLineMaterial)
          floorLine.position.set(0, currentHeight, 0)
          floorLine.userData.type = 'floorLine'
          floorLine.userData.floor = i
          this.scene.add(floorLine)
        }

        // 地形の標高を取得してモデルを配置
        const modelOrigin = [longitude, latitude] as [number, number]
        // 地形に合わせた適切な高さで配置（通常3Dモードと同じ）
        const modelAltitude = 0 // 地面レベル
        const modelRotate = [Math.PI / 2, 0, 0]

        const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
          modelOrigin,
          modelAltitude
        )

        // 変換行列を設定（グローバルスコープに保存）
        ;(this as any).modelTransform = {
          translateX: modelAsMercatorCoordinate.x,
          translateY: modelAsMercatorCoordinate.y,
          translateZ: modelAsMercatorCoordinate.z,
          rotateX: modelRotate[0],
          rotateY: modelRotate[1],
          rotateZ: modelRotate[2],
          scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
        }

        // スケールを通常3Dモードと同じにする
        const scale = (this as any).modelTransform.scale
        building.scale.set(scale, scale, scale) // 通常サイズ
        foundation.scale.set(scale, scale, scale) // 基礎部分も同じスケール
        this.scene.add(building)
        
        // デバッグ用ログ
        console.log('🏢 プロジェクト建物を追加:', {
          width: text2BIMResult.metadata.actualWidth,
          depth: text2BIMResult.metadata.actualDepth,
          height: text2BIMResult.metadata.actualHeight || 10,
          position: building.position,
          scale: building.scale,
          modelAltitude,
          coordinates: [longitude, latitude]
        })

        // ライティングをセットアップ
        this.setupLighting()

        // 影の地面を追加（より大きく）
        this.addShadowGround(
          text2BIMResult.metadata.actualWidth * 3, 
          text2BIMResult.metadata.actualDepth * 3
        )

        map.triggerRepaint()
      },

      render: (_gl: any, matrix: any) => {
        if (!this.renderer || !this.scene || !this.camera) return

        const rotationX = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(1, 0, 0),
          Math.PI / 2
        )
        const rotationZ = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 0, 1),
          Math.PI
        )

        const m = new THREE.Matrix4().fromArray(matrix)
        const modelTransform = (this as any).modelTransform
        const l = new THREE.Matrix4()
          .makeTranslation(
            modelTransform.translateX,
            modelTransform.translateY,
            modelTransform.translateZ
          )
          .scale(
            new THREE.Vector3(
              modelTransform.scale,
              -modelTransform.scale,
              modelTransform.scale
            )
          )
          .multiply(rotationX)
          .multiply(rotationZ)

        this.camera.projectionMatrix = m.multiply(l)
        this.renderer.resetState()
        this.renderer.render(this.scene, this.camera)
        // Remove map.triggerRepaint() from render function as it causes "map is not defined" error
      }
    }

    this.map.addLayer(buildingLayer)
  }

  /**
   * 太陽光と影のライティングをセットアップ
   */
  private setupLighting() {
    if (!this.scene) return

    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)

    // 太陽光（平行光源）
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8)
    sunLight.position.set(50, 100, 50)
    sunLight.castShadow = true
    
    // 影のマップサイズを設定
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 500
    sunLight.shadow.camera.left = -100
    sunLight.shadow.camera.right = 100
    sunLight.shadow.camera.top = 100
    sunLight.shadow.camera.bottom = -100

    this.scene.add(sunLight)
    this.scene.add(sunLight.target)

    // レンダラーで影を有効化
    if (this.renderer) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }
  }

  /**
   * 影を受ける地面を追加
   */
  private addShadowGround(buildingWidth: number, buildingDepth: number) {
    if (!this.scene) return

    const groundSize = Math.max(buildingWidth, buildingDepth) * 3
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize)
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5
    })

    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)
  }

  /**
   * 太陽位置を更新（時間に応じた影の変化）
   */
  updateSunPosition(dateTime: Date, latitude: number, longitude: number) {
    // Three.jsシーンとMapboxの両方で太陽位置を更新
    const sunPosition = this.calculateSunPosition(dateTime, latitude, longitude)
    
    // Three.jsシーンの太陽光を更新
    if (this.scene) {
      this.updateThreeJSSun(sunPosition)
    }
    
    // Mapboxのsky layerの太陽位置を更新
    if (this.map && this.map.getLayer('sky')) {
      // Mapboxのsky-atmosphere-sunは[0-360, 0-90]の範囲が必要
      const normalizedAzimuth = ((sunPosition.azimuth % 360) + 360) % 360; // 0-360度に正規化
      const clampedAltitude = Math.max(0, Math.min(90, sunPosition.altitude)); // 0-90度にクランプ
      
      try {
        this.map.setPaintProperty('sky', 'sky-atmosphere-sun', [normalizedAzimuth, clampedAltitude]);
      } catch (error) {
        console.warn('Failed to update sun position:', error);
      }
    }
  }

  /**
   * 太陽位置を計算
   */
  private calculateSunPosition(dateTime: Date, latitude: number, _longitude: number) {
    // 簡易的な太陽位置計算
    const hour = dateTime.getHours() + dateTime.getMinutes() / 60
    const dayOfYear = Math.floor((dateTime.getTime() - new Date(dateTime.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    
    // 太陽の高度と方位角を計算
    const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180)
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
      azimuth: azimuth * 180 / Math.PI, // 度数に変換
      altitude: altitude * 180 / Math.PI, // 度数に変換
      azimuthRad: azimuth,
      altitudeRad: altitude
    }
  }

  /**
   * Three.jsシーンの太陽光を更新
   */
  private updateThreeJSSun(sunPosition: any) {
    if (!this.scene) return

    // 太陽光の位置を更新
    const sunLight = this.scene!.children.find(child => 
      child instanceof THREE.DirectionalLight && child !== this.scene!.children[0]
    ) as THREE.DirectionalLight

    if (sunLight) {
      const distance = 100
      const sunX = distance * Math.cos(sunPosition.altitudeRad) * Math.sin(sunPosition.azimuthRad + Math.PI)
      const sunY = Math.max(distance * Math.sin(sunPosition.altitudeRad), 5)
      const sunZ = distance * Math.cos(sunPosition.altitudeRad) * Math.cos(sunPosition.azimuthRad + Math.PI)
      
      sunLight.position.set(sunX, sunY, sunZ)
      sunLight.target.position.set(0, 0, 0)
      
      // 夜間は光を弱くする
      if (sunPosition.altitudeRad < 0) {
        sunLight.intensity = 0.1
      } else {
        sunLight.intensity = 0.8 * Math.sin(sunPosition.altitudeRad)
      }
    }

    // 地図を再描画
    if (this.map) {
      this.map.triggerRepaint()
    }
  }

  /**
   * 建物の高さを動的に変更
   */
  updateBuildingHeight(newHeight: number) {
    if (!this.scene || !this.currentProject) return

    // 建物情報を更新
    const updatedBuildingInfo = {
      ...this.currentProject.buildingInfo,
      maxHeight: newHeight
    }
    
    // Text2BIMで新しいジオメトリを生成
    const newText2BIMResult = text2BIMService.generateDetailedBuilding(
      updatedBuildingInfo,
      this.currentProject.siteInfo,
      this.currentProject.parkingPlan
    )
    
    // 既存の建物関連オブジェクトを削除
    const objectsToRemove = this.scene.children.filter(child => 
      child instanceof THREE.Mesh && 
      (child.userData.type === 'building' || 
       child.userData.type === 'foundation' || 
       child.userData.type === 'balcony' ||
       child.userData.type === 'floorLine')
    )
    
    objectsToRemove.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
      this.scene!.remove(child)
    })
    
    // 新しい建物を追加
    const buildingMaterial = new THREE.MeshPhongMaterial({
      color: 0x00FF00,
      transparent: false,
      side: THREE.DoubleSide,
      shininess: 50
    })
    const building = new THREE.Mesh(newText2BIMResult.geometry, buildingMaterial)
    building.userData.type = 'building'
    building.castShadow = true
    building.receiveShadow = true
    this.scene.add(building)
    
    // 基礎部分を追加
    const foundationMaterial = new THREE.MeshPhongMaterial({
      color: 0x666666,
      opacity: 0.8,
      transparent: true
    })
    const foundation = new THREE.Mesh(newText2BIMResult.foundationGeometry, foundationMaterial)
    foundation.userData.type = 'foundation'
    foundation.castShadow = true
    foundation.receiveShadow = true
    this.scene.add(foundation)
    
    // バルコニーを追加
    const balconyMaterial = new THREE.MeshPhongMaterial({
      color: 0xCCCCCC,
      opacity: 0.9,
      transparent: true
    })
    newText2BIMResult.balconyGeometries.forEach((balconyGeometry, index) => {
      const balcony = new THREE.Mesh(balconyGeometry, balconyMaterial)
      balcony.castShadow = true
      balcony.receiveShadow = true
      balcony.userData.type = 'balcony'
      balcony.userData.index = index
      this.scene!.add(balcony)
    })
    
    // 各階の線を追加
    const { floorHeights, actualWidth, actualDepth } = newText2BIMResult.metadata
    let currentHeight = 0
    for (let i = 1; i < (updatedBuildingInfo.floors || 1); i++) {
      currentHeight += floorHeights[i - 1]
      const floorLineGeometry = new THREE.BoxGeometry(
        actualWidth + 0.1,
        0.05,
        actualDepth + 0.1
      )
      const floorLineMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 })
      const floorLine = new THREE.Mesh(floorLineGeometry, floorLineMaterial)
      floorLine.position.set(0, currentHeight, 0)
      floorLine.userData.type = 'floorLine'
      floorLine.userData.floor = i
      this.scene!.add(floorLine)
    }

    if (this.map) {
      this.map.triggerRepaint()
    }
  }

  /**
   * ストリートビューのような視点に切り替え
   */
  setStreetView() {
    if (!this.map) return

    this.map.easeTo({
      pitch: 85,
      zoom: 19,
      duration: 1000
    })
  }

  /**
   * 鳥瞰図視点に切り替え
   */
  setBirdEyeView() {
    if (!this.map) return

    this.map.easeTo({
      pitch: 60,
      zoom: 16,
      duration: 1000
    })
  }

  /**
   * ホーム位置（建物の住所）に戻る
   */
  goToHome() {
    if (!this.map || !this.homePosition) return

    // 建物が確実に見える視点に調整（サムネイル用の最適な角度）
    this.map.easeTo({
      center: [this.homePosition.lng, this.homePosition.lat],
      zoom: 17.5, // 建物全体が画面に収まる適切なズームレベル
      pitch: 60, // 建物の高さと形状がよく分かる角度
      bearing: -45, // 北西から見る角度（建物の2面が見える）
      duration: 1500
    })
    
    console.log('🏠 ホーム位置に戻る（サムネイル撮影用）:', this.homePosition)
  }

  /**
   * スクリーンショットを撮影
   */
  captureScreenshot(): string | null {
    if (!this.map) {
      console.error('Map is not initialized')
      return null
    }

    try {
      // Mapboxのcanvasを取得
      const canvas = this.map.getCanvas()
      console.log('Canvas element:', canvas)
      console.log('Canvas size:', canvas.width, 'x', canvas.height)
      
      // preserveDrawingBufferの確認
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2')
      if (gl) {
        const preserveDrawingBuffer = gl.getContextAttributes()?.preserveDrawingBuffer
        console.log('preserveDrawingBuffer:', preserveDrawingBuffer)
      }
      
      // Base64エンコードされた画像データを取得（JPEGで圧縮率を高める）
      const screenshot = canvas.toDataURL('image/jpeg', 0.3)
      
      if (!screenshot || screenshot === 'data:,') {
        console.error('Screenshot is empty or invalid')
        return null
      }
      
      console.log('📸 Mapbox 3Dビューのスクリーンショットを撮影しました')
      console.log('Screenshot data URL length:', screenshot.length)
      return screenshot
    } catch (error) {
      console.error('スクリーンショットの撮影に失敗:', error)
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack
      })
      return null
    }
  }

  /**
   * マップを破棄
   */
  dispose() {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
    
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer = null
    }
    
    this.scene = null
    this.camera = null
  }
}

export const mapbox3dService = new Mapbox3DService()