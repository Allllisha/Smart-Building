import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Box } from '@mui/material'
import { Project } from '@/types/project'
import { solarDataService, SolarData } from '@/services/solarData.service'
import { advancedSolarAnalysisService, PreciseSolarAnalysis } from '@/services/advancedSolarAnalysis.service'

// IFCLoaderの実装
import { IFCLoader } from '@/utils/IFCLoader'

interface Scene3DProps {
  project: Project
  ifcUrl?: string
  showShadows?: boolean
  dateTime?: Date
  onAnalysisUpdate?: (analysis: PreciseSolarAnalysis | null) => void
  onScreenshotReady?: (screenshot: string) => void
}

export default function Scene3D({ project, ifcUrl, showShadows = true, dateTime = new Date(), onAnalysisUpdate, onScreenshotReady }: Scene3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const buildingGroupRef = useRef<THREE.Group | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [solarData, setSolarData] = useState<SolarData | null>(null)
  const [preciseAnalysis, setPreciseAnalysis] = useState<PreciseSolarAnalysis | null>(null)

  // 建物情報が有効かチェック
  const hasValidBuildingInfo = (project: Project): boolean => {
    const { buildingInfo, siteInfo, location } = project
    
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

  // スクリーンショットを撮影する関数
  const captureScreenshot = () => {
    if (rendererRef.current && onScreenshotReady) {
      try {
        // レンダラーからcanvasを取得してBase64に変換
        const screenshot = rendererRef.current.domElement.toDataURL('image/png', 0.8)
        onScreenshotReady(screenshot)
        console.log('📸 3Dビューのスクリーンショットを撮影しました')
      } catch (error) {
        console.error('スクリーンショットの撮影に失敗:', error)
      }
    }
  }

  useEffect(() => {
    if (!mountRef.current) return

    console.log('🚀 Scene3D初期化開始')

    // シーンの初期化
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    // カメラの設定 - より近い位置から開始
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(30, 25, 30) // より遠い位置から全体を見渡せる角度
    cameraRef.current = camera

    // レンダラーの設定 - シンプルに
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.shadowMap.enabled = showShadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    
    // DOM要素をクリア
    mountRef.current.innerHTML = ''
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer
    
    console.log('🖥️ Renderer作成完了', renderer.domElement.clientWidth, 'x', renderer.domElement.clientHeight)

    // OrbitControls - テスト済みの設定を使用
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.25  // テストと同じ値
    controls.enableZoom = true
    controls.enableRotate = true
    controls.enablePan = true
    
    // 制限設定
    controls.minDistance = 5
    controls.maxDistance = 200
    
    controlsRef.current = controls
    
    // イベントリスナー
    controls.addEventListener('change', () => {
      console.log('🎮 Scene3D Controls変更:', camera.position)
    })
    
    console.log('🎮 OrbitControls作成完了')

    // ライトの設定
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    // 太陽光（平行光源）の設定
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8)
    sunLight.castShadow = showShadows
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 500
    sunLight.shadow.camera.left = -100
    sunLight.shadow.camera.right = 100
    sunLight.shadow.camera.top = 100
    sunLight.shadow.camera.bottom = -100
    scene.add(sunLight)

    // 太陽の視覚化（小さな球体）
    const sunGeometry = new THREE.SphereGeometry(2, 16, 16)
    const sunMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00
    })
    const sunSphere = new THREE.Mesh(sunGeometry, sunMaterial)
    sunSphere.name = 'sun_sphere' // ユニークな名前を設定
    scene.add(sunSphere)

    // 地面の追加
    const groundGeometry = new THREE.PlaneGeometry(200, 200)
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.2,
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = showShadows
    scene.add(ground)

    // グリッドヘルパー
    const gridHelper = new THREE.GridHelper(200, 50)
    scene.add(gridHelper)

    // 建物グループの作成
    const buildingGroup = new THREE.Group()
    buildingGroupRef.current = buildingGroup
    scene.add(buildingGroup)

    // 仮の建物を表示（IFCファイルがない場合かつ必要な情報がある場合）
    if (!ifcUrl && hasValidBuildingInfo(project)) {
      const { buildingArea, floors, maxHeight } = project.buildingInfo
      const buildingWidth = Math.sqrt(buildingArea!)
      const buildingDepth = buildingWidth
      const floorHeight = (maxHeight || 10000) / floors! / 1000 // mm to m

      const buildingGeometry = new THREE.BoxGeometry(
        buildingWidth,
        floors * floorHeight,
        buildingDepth
      )
      const buildingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00FF00, // 3D Terrainモードと同じ緑色
        roughness: 0.7,
        metalness: 0.1,
      })
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial)
      building.position.y = (floors * floorHeight) / 2
      building.castShadow = showShadows
      building.receiveShadow = showShadows
      buildingGroup.add(building)

      // 各階の線を追加
      for (let i = 1; i < floors; i++) {
        const floorLineGeometry = new THREE.BoxGeometry(
          buildingWidth + 0.1,
          0.1,
          buildingDepth + 0.1
        )
        const floorLineMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 })
        const floorLine = new THREE.Mesh(floorLineGeometry, floorLineMaterial)
        floorLine.position.y = i * floorHeight
        buildingGroup.add(floorLine)
      }
    }

    // 太陽位置の更新関数（Open-Meteo API使用）
    const updateSunPosition = async (date: Date) => {
      try {
        const { latitude, longitude } = project.location
        const data = await solarDataService.getSolarData(latitude, longitude, date)
        setSolarData(data)
        
        const { position, isDayTime } = data
        
        // 高度と方位角をラジアンに変換
        const altitudeRad = position.altitude * Math.PI / 180
        const azimuthRad = position.azimuth * Math.PI / 180
        
        // 夜間・昼間の処理
        if (!isDayTime || position.altitude < 0) {
          sunLight.intensity = 0.1
          ambientLight.intensity = 0.2
          scene.background = new THREE.Color(0x2a2a3a) // 夜の空の色
          sunSphere.visible = false // 夜間は太陽を非表示
        } else {
          const intensityFactor = Math.max(position.altitude / 90, 0.1) // 0.1〜1.0
          sunLight.intensity = 0.8 * intensityFactor
          ambientLight.intensity = 0.4 + 0.3 * intensityFactor
          scene.background = new THREE.Color(0xf0f0f0) // 昼の空の色
          sunSphere.visible = true
        }
        
        // 太陽の3D位置を計算
        const distance = 100
        const sunX = distance * Math.cos(altitudeRad) * Math.sin(azimuthRad)
        const sunY = Math.max(distance * Math.sin(altitudeRad), 5)
        const sunZ = distance * Math.cos(altitudeRad) * Math.cos(azimuthRad)
        
        sunLight.position.set(sunX, sunY, sunZ)
        sunLight.target.position.set(0, 0, 0)
        
        // 太陽の視覚化
        sunSphere.position.set(sunX * 0.8, sunY * 0.8, sunZ * 0.8)
        
        console.log(`☀️ 太陽位置更新 (Open-Meteo): 高度${position.altitude.toFixed(1)}°, 方位${position.azimuth.toFixed(1)}°, 昼間:${isDayTime}`)
      } catch (error) {
        console.error('太陽位置更新エラー:', error)
        // フォールバック用の簡易計算
        updateSunPositionFallback(date)
      }
    }

    // フォールバック用の太陽位置更新
    const updateSunPositionFallback = (date: Date) => {
      const { latitude, longitude } = project.location
      const sunPosition = calculateSunPosition(date, latitude, longitude)
      
      const isNight = sunPosition.altitude < 0
      
      if (isNight) {
        sunLight.intensity = 0.1
        ambientLight.intensity = 0.2
        scene.background = new THREE.Color(0x2a2a3a)
        sunSphere.visible = false
      } else {
        sunLight.intensity = 0.8 + sunPosition.altitude * 0.5
        ambientLight.intensity = 0.4 + sunPosition.altitude * 0.2
        scene.background = new THREE.Color(0xf0f0f0)
        sunSphere.visible = true
      }
      
      const distance = 100
      const sunX = distance * Math.cos(sunPosition.altitude) * Math.sin(sunPosition.azimuth)
      const sunY = Math.max(distance * Math.sin(sunPosition.altitude), 5)
      const sunZ = distance * Math.cos(sunPosition.altitude) * Math.cos(sunPosition.azimuth)
      
      sunLight.position.set(sunX, sunY, sunZ)
      sunLight.target.position.set(0, 0, 0)
      sunSphere.position.set(sunX * 0.8, sunY * 0.8, sunZ * 0.8)
      
      console.log(`☀️ 太陽位置更新 (フォールバック): 高度${(sunPosition.altitude * 180 / Math.PI).toFixed(1)}°`)
    }

    // アニメーションループ - 非同期対応
    function animate() {
      controls.update()
      renderer.render(scene, camera)
      animationIdRef.current = requestAnimationFrame(animate)
    }
    
    console.log('🎬 アニメーション開始')
    animate()

    // 初期太陽位置設定
    if (showShadows) {
      updateSunPosition(dateTime)
    }

    // 建物表示完了後にスクリーンショットを撮影
    if (hasValidBuildingInfo(project) && onScreenshotReady) {
      setTimeout(() => {
        captureScreenshot()
      }, 2000) // 2秒待機してからスクリーンショット撮影
    }

    // リサイズハンドラー
    const handleResize = () => {
      if (!mountRef.current) return
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      renderer.dispose()
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement)
      }
      console.log('🎮 Scene3D cleanup completed')
    }
  }, [project, showShadows])

  // IFCファイルの読み込み
  useEffect(() => {
    if (!ifcUrl || !sceneRef.current || !buildingGroupRef.current) return

    setIsLoading(true)
    const ifcLoader = new IFCLoader()
    
    // web-ifc-wasmのパスを設定
    ifcLoader.setWasmPath('https://unpkg.com/web-ifc@0.0.69/')
    
    ifcLoader.load(
      ifcUrl,
      (ifcModel) => {
        // 既存の建物を削除
        buildingGroupRef.current!.clear()
        
        // IFCモデルを追加
        ifcModel.castShadow = showShadows
        ifcModel.receiveShadow = showShadows
        buildingGroupRef.current!.add(ifcModel)
        
        // カメラを建物に合わせる
        const box = new THREE.Box3().setFromObject(ifcModel)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        
        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = cameraRef.current!.fov * (Math.PI / 180)
        const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
        
        cameraRef.current!.position.set(center.x, center.y + size.y, center.z + cameraZ)
        controlsRef.current!.target = center
        controlsRef.current!.update()
        
        setIsLoading(false)
      },
      (progress) => {
        console.log('Loading progress:', progress)
      },
      (error) => {
        console.error('IFC loading error:', error)
        setIsLoading(false)
      }
    )
  }, [ifcUrl, showShadows])

  // 日時が変更されたら太陽位置を更新
  useEffect(() => {
    if (showShadows && sceneRef.current) {
      updateSunPosition(dateTime)
    }
  }, [dateTime, showShadows])

  // 精密な太陽位置更新関数
  const updateSunPosition = async (date: Date) => {
    if (!sceneRef.current) return
    
    try {
      const { latitude, longitude, address } = project.location
      
      // 精密分析を実行
      const analysis = await advancedSolarAnalysisService.analyzePreciseShadows(
        latitude, longitude, address, date
      )
      setPreciseAnalysis(analysis)
      
      // 分析結果を親コンポーネントに通知
      if (onAnalysisUpdate) {
        onAnalysisUpdate(analysis)
      }
      
      // 基本的な太陽データも取得
      const data = await solarDataService.getSolarData(latitude, longitude, date)
      setSolarData(data)
      
      const { position, isDayTime } = data
      
      // 高度と方位角をラジアンに変換
      const altitudeRad = position.altitude * Math.PI / 180
      const azimuthRad = position.azimuth * Math.PI / 180
      
      // シーン内の要素を取得
      const sunLight = sceneRef.current.children.find(child => 
        child instanceof THREE.DirectionalLight
      ) as THREE.DirectionalLight
      const ambientLight = sceneRef.current.children.find(child => 
        child instanceof THREE.AmbientLight
      ) as THREE.AmbientLight
      const sunSphere = sceneRef.current.getObjectByName('sun_sphere') as THREE.Mesh
      
      if (!sunLight || !ambientLight || !sunSphere) {
        console.warn('太陽シミュレーション要素が見つかりません:', {
          sunLight: !!sunLight,
          ambientLight: !!ambientLight,
          sunSphere: !!sunSphere
        })
        return
      }
      
      // 精密な照明設定
      const { shadowData, weather, radiation } = analysis
      
      if (!isDayTime || position.altitude < 0) {
        sunLight.intensity = 0.05 + shadowData.ambientBrightness * 0.1
        ambientLight.intensity = 0.15 + shadowData.ambientBrightness * 0.1
        sceneRef.current.background = new THREE.Color(0x1a1a2e)
        sunSphere.visible = false
      } else {
        // 実際の日射量に基づく光の強度
        const radiationFactor = Math.min(1, radiation.global / 800) // 800W/m²を最大とする
        const weatherFactor = (100 - weather.cloudCover) / 100
        
        sunLight.intensity = radiationFactor * weatherFactor * analysis.timeOfDayFactor * 1.2
        ambientLight.intensity = shadowData.ambientBrightness * 0.8 + 0.2
        
        // 天候に応じた空の色
        let skyColor = 0xf0f0f0 // 晴れ
        if (weather.cloudCover > 80) {
          skyColor = 0xd0d0d0 // 曇り
        } else if (weather.cloudCover > 50) {
          skyColor = 0xe0e0e0 // 薄曇り
        }
        
        sceneRef.current.background = new THREE.Color(skyColor)
        sunSphere.visible = true
        
        // 太陽の色も調整（朝夕は暖色、正午は白色）
        const hour = date.getHours()
        let sunColor = 0xffff00
        if (hour < 9 || hour > 15) {
          sunColor = 0xffa500 // オレンジ
        } else if (hour < 11 || hour > 13) {
          sunColor = 0xffff80 // 薄黄色
        }
        
        // より安全な太陽の色変更
        if (sunSphere && sunSphere.material && sunSphere.material instanceof THREE.MeshBasicMaterial) {
          try {
            sunSphere.material.color.setHex(sunColor)
          } catch (error) {
            console.warn('太陽の色変更に失敗:', error)
          }
        }
      }
      
      // 太陽の3D位置を計算
      const distance = 100
      const sunX = distance * Math.cos(altitudeRad) * Math.sin(azimuthRad)
      const sunY = Math.max(distance * Math.sin(altitudeRad), 5)
      const sunZ = distance * Math.cos(altitudeRad) * Math.cos(azimuthRad)
      
      sunLight.position.set(sunX, sunY, sunZ)
      sunLight.target.position.set(0, 0, 0)
      sunSphere.position.set(sunX * 0.8, sunY * 0.8, sunZ * 0.8)
      
      // 影の設定を調整
      if (sunLight.shadow) {
        // 影の鮮明度を天候に応じて調整
        sunLight.shadow.radius = shadowData.lightQuality === 'harsh' ? 1 : 
                                shadowData.lightQuality === 'soft' ? 3 :
                                shadowData.lightQuality === 'diffused' ? 5 : 8
        
        // 影の濃さを調整
        sunLight.shadow.mapSize.width = shadowData.shadowSharpness > 0.7 ? 2048 : 1024
        sunLight.shadow.mapSize.height = shadowData.shadowSharpness > 0.7 ? 2048 : 1024
      }
      
      console.log(`🌟 精密太陽分析完了:`, {
        高度: position.altitude.toFixed(1) + '°',
        方位: position.azimuth.toFixed(1) + '°',
        雲量: weather.cloudCover + '%',
        日射量: radiation.global.toFixed(0) + 'W/m²',
        光の質: shadowData.lightQuality,
        影の濃さ: (shadowData.shadowIntensity * 100).toFixed(0) + '%'
      })
    } catch (error) {
      console.error('精密太陽位置更新エラー:', error)
      // フォールバックとして通常の更新を実行
      await updateSunPositionBasic(date)
    }
  }

  // 基本的な太陽位置更新（フォールバック用）
  const updateSunPositionBasic = async (date: Date) => {
    if (!sceneRef.current) return
    
    const { latitude, longitude } = project.location
    const data = await solarDataService.getSolarData(latitude, longitude, date)
    const { position, isDayTime } = data
    
    const altitudeRad = position.altitude * Math.PI / 180
    const azimuthRad = position.azimuth * Math.PI / 180
    
    const sunLight = sceneRef.current.children.find(child => 
      child instanceof THREE.DirectionalLight
    ) as THREE.DirectionalLight
    const ambientLight = sceneRef.current.children.find(child => 
      child instanceof THREE.AmbientLight
    ) as THREE.AmbientLight
    const sunSphere = sceneRef.current.getObjectByName('sun_sphere') as THREE.Mesh
    
    if (!sunLight || !ambientLight || !sunSphere) return
    
    if (!isDayTime || position.altitude < 0) {
      sunLight.intensity = 0.1
      ambientLight.intensity = 0.2
      sceneRef.current.background = new THREE.Color(0x2a2a3a)
      sunSphere.visible = false
    } else {
      const intensityFactor = Math.max(position.altitude / 90, 0.1)
      sunLight.intensity = 0.8 * intensityFactor
      ambientLight.intensity = 0.4 + 0.3 * intensityFactor
      sceneRef.current.background = new THREE.Color(0xf0f0f0)
      sunSphere.visible = true
    }
    
    const distance = 100
    const sunX = distance * Math.cos(altitudeRad) * Math.sin(azimuthRad)
    const sunY = Math.max(distance * Math.sin(altitudeRad), 5)
    const sunZ = distance * Math.cos(altitudeRad) * Math.cos(azimuthRad)
    
    sunLight.position.set(sunX, sunY, sunZ)
    sunLight.target.position.set(0, 0, 0)
    sunSphere.position.set(sunX * 0.8, sunY * 0.8, sunZ * 0.8)
  }

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <Box 
        ref={mountRef} 
        sx={{ 
          width: '100%', 
          height: '100%'
        }} 
      />
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: 2,
            borderRadius: 1,
          }}
        >
          IFCファイルを読み込み中...
        </Box>
      )}
    </Box>
  )
}

// 太陽位置計算関数（簡易版）
function calculateSunPosition(date: Date, latitude: number, longitude: number) {
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
    altitude: altitude,
    azimuth: azimuth + Math.PI, // 北を0度とする
  }
}