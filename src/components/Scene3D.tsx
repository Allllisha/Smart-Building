import { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Box } from '@mui/material'
import { Project } from '@/types/project'
import { solarDataService } from '@/services/solarData.service'
import { advancedSolarAnalysisService, PreciseSolarAnalysis } from '@/services/advancedSolarAnalysis.service'
import { VolumeCheckResult } from '@/services/shadowRegulationCheck.service'

// IFCLoaderの実装
import { IFCLoader } from '@/utils/IFCLoader'

interface Scene3DProps {
  project: Project
  ifcUrl?: string
  showShadows?: boolean
  dateTime?: Date
  onAnalysisUpdate?: (analysis: PreciseSolarAnalysis | null) => void
  onScreenshotReady?: (screenshot: string) => void
  volumeCheckResult?: VolumeCheckResult | null
  showVolumeCheck?: boolean
  currentTime?: number
  showShadowAnalysis?: boolean
  showTerrain?: boolean
}

export default function Scene3D({ project, ifcUrl, showShadows = true, dateTime = new Date(), onAnalysisUpdate, onScreenshotReady, volumeCheckResult, showVolumeCheck = false, currentTime = 12 }: Scene3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const buildingGroupRef = useRef<THREE.Group | null>(null)
  const volumeVisualizationRef = useRef<THREE.Group | null>(null)
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null)
  const buildingRef = useRef<THREE.Mesh | null>(null)
  const shadowCasterRef = useRef<THREE.Mesh | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
    renderer.shadowMap.enabled = true // 常に有効に
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
    sunLightRef.current = sunLight

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

    // グリッドヘルパー（より控えめな設定）
    const gridHelper = new THREE.GridHelper(200, 50)
    gridHelper.material.opacity = 0.2
    gridHelper.material.transparent = true
    scene.add(gridHelper)

    // 建物グループの作成
    const buildingGroup = new THREE.Group()
    buildingGroupRef.current = buildingGroup
    scene.add(buildingGroup)


    // アニメーションループ
    function animate() {
      try {
        controls.update()
        renderer.render(scene, camera)
        animationIdRef.current = requestAnimationFrame(animate)
      } catch (error) {
        console.error('Animation error:', error)
        // エラーが発生してもアニメーションを継続
        animationIdRef.current = requestAnimationFrame(animate)
      }
    }
    
    console.log('🎬 アニメーション開始')
    animate()

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
      console.log('🎮 Scene3D cleanup starting')
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
      if (controlsRef.current) {
        controlsRef.current.dispose()
        controlsRef.current = null
      }
      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (mountRef.current && rendererRef.current.domElement && mountRef.current.contains(rendererRef.current.domElement)) {
          mountRef.current.removeChild(rendererRef.current.domElement)
        }
        rendererRef.current = null
      }
      sceneRef.current = null
      cameraRef.current = null
      sunLightRef.current = null
      buildingRef.current = null
      shadowCasterRef.current = null
      console.log('🎮 Scene3D cleanup completed')
    }
  }, [])

  // 建物の表示（プロジェクトデータが変更された時）
  useEffect(() => {
    if (!sceneRef.current || !buildingGroupRef.current || ifcUrl) return

    try {
      // 既存の建物を削除
      buildingGroupRef.current.clear()
      buildingRef.current = null
      shadowCasterRef.current = null

      // 仮の建物を表示（必要な情報がある場合）
      if (hasValidBuildingInfo(project)) {
        const { buildingArea, floors, maxHeight } = project.buildingInfo
        const buildingWidth = Math.sqrt(buildingArea!)
        const buildingDepth = buildingWidth
        const floorHeight = (maxHeight || 10000) / (floors || 1) / 1000 // mm to m

        const buildingGeometry = new THREE.BoxGeometry(
          buildingWidth,
          (floors || 1) * floorHeight,
          buildingDepth
        )
        const buildingMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x00FF00, // 3D Terrainモードと同じ緑色
          roughness: 0.7,
          metalness: 0.1,
        })
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial)
        building.position.y = ((floors || 1) * floorHeight) / 2
        building.castShadow = true
        building.receiveShadow = true
        buildingGroupRef.current.add(building)
        buildingRef.current = building
        shadowCasterRef.current = building

      // 各階の線を追加
      for (let i = 1; i < (floors || 1); i++) {
        const floorLineGeometry = new THREE.BoxGeometry(
          buildingWidth + 0.1,
          0.1,
          buildingDepth + 0.1
        )
        const floorLineMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 })
        const floorLine = new THREE.Mesh(floorLineGeometry, floorLineMaterial)
        floorLine.position.y = i * floorHeight
        buildingGroupRef.current.add(floorLine)
      }

        // プロジェクトにpreviewImageがない場合のみ、スクリーンショットを撮影
        // 注意: previewImageフィールドがundefinedまたはnull、または空文字列の場合に撮影
        const shouldTakeScreenshot = onScreenshotReady && (!project.previewImage || project.previewImage === '')
        
        if (shouldTakeScreenshot) {
          console.log('📸 プレビュー画像が未設定のため、スクリーンショットを撮影します')
          console.log('Current previewImage:', project.previewImage)
          setTimeout(() => {
            captureScreenshot()
          }, 1000) // 1秒待機してからスクリーンショット撮影
        } else if (project.previewImage && project.previewImage !== '') {
          console.log('✅ プレビュー画像が既に存在するため、スクリーンショット撮影をスキップします')
          console.log('Existing previewImage length:', project.previewImage.length)
        }
      }
    } catch (error) {
      console.error('Error creating building:', error)
    }
  }, [project.buildingInfo, ifcUrl])

  // ボリュームチェック結果のキーをメモ化（変更検知用）
  // const volumeCheckKey = useMemo(() => {
  //   if (!volumeCheckResult) return null
  //   return `${volumeCheckResult.isCompliant}_${volumeCheckResult.checkPoints.length}_${volumeCheckResult.complianceRate}`
  // }, [volumeCheckResult])

  // Volume check visualization - Three.jsシーン外で管理
  const volumeCheckVisualization = useMemo(() => {
    if (!showVolumeCheck || !volumeCheckResult) return null

    console.log('🎨 Creating volume check visualization', {
      showVolumeCheck,
      hasDetailedResult: !!volumeCheckResult.detailedResult,
      checkPointsCount: volumeCheckResult.checkPoints?.length || 0
    })

    const group = new THREE.Group()
    // detailedResultがある場合はそれを使用、なければ通常のcheckPointsを使用
    const checkPoints = volumeCheckResult.detailedResult?.checkPoints || volumeCheckResult.checkPoints

    // 測定高平面（半透明の青い平面）
    const planeSize = 100
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize)
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    })
    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = volumeCheckResult.regulation.measurementHeight
    group.add(plane)

    // ヒートマップ（違反度合いに応じた色の円）
    let violationCount = 0
    let complianceCount = 0
    
    checkPoints.forEach((point: any, index: number) => {
      // detailedResultの場合はtotalShadowHours、通常はshadowHoursを使用
      const shadowHours = point.totalShadowHours !== undefined ? point.totalShadowHours : point.shadowHours
      
      // 最初の5ポイントだけログ出力
      if (index < 5) {
        console.log(`Point ${index}:`, {
          x: point.x,
          y: point.y,
          shadowHours,
          applicableLimit: point.applicableLimit,
          isCompliant: point.isCompliant
        })
      }
      
      // 影響を受けるすべてのポイントを表示（影時間が0のポイントも含む）
      const violationRatio = point.applicableLimit > 0 ? 
        Math.min((shadowHours - point.applicableLimit) / point.applicableLimit, 1) : 0
        
        // 色を決定（緑→黄→オレンジ→赤）
        let color
        if (point.isCompliant) {
          color = new THREE.Color(0x4caf50) // 緑（適合）
        } else if (violationRatio < 0.25) {
          color = new THREE.Color(0xffeb3b) // 黄（軽微な違反）
        } else if (violationRatio < 0.5) {
          color = new THREE.Color(0xff9800) // オレンジ（中程度の違反）
        } else {
          color = new THREE.Color(0xf44336) // 赤（重大な違反）
        }

        // 円形のマーカー
        const circleGeometry = new THREE.CircleGeometry(0.5, 16)
        const circleMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        })
        const circle = new THREE.Mesh(circleGeometry, circleMaterial)
        circle.rotation.x = -Math.PI / 2
        circle.position.set(
          point.x,
          volumeCheckResult.regulation.measurementHeight + 0.01,
          point.y
        )
        
        // メタデータを保存（アニメーション用）
        circle.userData = {
          pointKey: `${point.x},${point.y}`,
          baseOpacity: 0.7,
          baseColor: color,
          isInShadow: false
        }
        
        group.add(circle)
        
        if (point.isCompliant) {
          complianceCount++
        } else {
          violationCount++
        }
      // }  // このif文を削除して、すべてのポイントを表示
    })
    
    console.log('🎯 Volume check summary:', {
      totalPoints: checkPoints.length,
      complianceCount,
      violationCount
    })

    return group
  }, [showVolumeCheck, volumeCheckResult])

  // 太陽位置の更新
  useEffect(() => {
    if (!sunLightRef.current || !sceneRef.current) return

    try {
      const hours = Math.floor(currentTime)
      const minutes = (currentTime - hours) * 60
      // 現在の年から1年前の冬至を使用
      const currentYear = new Date().getFullYear()
      const winterSolsticeYear = currentYear - 1
      const sunPosition = calculateSunPosition(
        new Date(winterSolsticeYear, 11, 21, hours, minutes), // Winter solstice (1年前)
        project.location.latitude,
        project.location.longitude
      )

      if (sunPosition.altitude > 0) {
        const distance = 50
        const azimuthRad = (sunPosition.azimuth - 180) * Math.PI / 180
        const altitudeRad = sunPosition.altitude * Math.PI / 180

        sunLightRef.current.position.set(
          distance * Math.sin(azimuthRad) * Math.cos(altitudeRad),
          distance * Math.sin(altitudeRad),
          distance * Math.cos(azimuthRad) * Math.cos(altitudeRad)
        )
        sunLightRef.current.intensity = Math.max(0.5, sunPosition.altitude / 45)
        sunLightRef.current.visible = true
        sunLightRef.current.castShadow = true
        if (shadowCasterRef.current) {
          shadowCasterRef.current.castShadow = true
        }
      } else {
        sunLightRef.current.visible = false
      }
    } catch (error) {
      console.error('Error updating sun position:', error)
    }
  }, [currentTime, project.location.latitude, project.location.longitude])

  // ボリュームチェックの視覚化
  useEffect(() => {
    if (!sceneRef.current) return

    try {
      // 既存の視覚化を削除
      if (volumeVisualizationRef.current) {
        sceneRef.current.remove(volumeVisualizationRef.current)
        // ジオメトリとマテリアルのクリーンアップ
        volumeVisualizationRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (child.material instanceof THREE.Material) {
              child.material.dispose()
            }
          }
        })
        volumeVisualizationRef.current = null
      }

      // 新しい視覚化を追加
      if (volumeCheckVisualization && showVolumeCheck) {
        volumeVisualizationRef.current = volumeCheckVisualization
        sceneRef.current.add(volumeCheckVisualization)
      }
    } catch (error) {
      console.error('Error updating volume check visualization:', error)
    }
  }, [volumeCheckVisualization, showVolumeCheck])

  // 現在時刻の影とボリュームチェックの連動
  useEffect(() => {
    if (!showVolumeCheck || !volumeVisualizationRef.current || !sunLightRef.current || !buildingRef.current || !volumeCheckResult) {
      return
    }

    try {
      const shadowRay = new THREE.Raycaster()
      const sunDirection = sunLightRef.current.position.clone().normalize().negate()
      
      volumeVisualizationRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.pointKey) {
          const [x, y] = child.userData.pointKey.split(',').map(Number)
          const origin = new THREE.Vector3(
            x,
            volumeCheckResult.regulation.measurementHeight,
            y
          )
          
          shadowRay.set(origin, sunDirection)
          const intersects = shadowRay.intersectObject(buildingRef.current!, true)
          
          const isCurrentlyInShadow = intersects.length > 0
          const material = child.material as THREE.MeshBasicMaterial
          
          if (isCurrentlyInShadow) {
            // 現在影の中にある点は強調表示
            material.opacity = 1.0
            // 白い輪郭を追加して強調
            if (!child.userData.highlight) {
              const highlightGeometry = new THREE.RingGeometry(0.5, 0.6, 16)
              const highlightMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
              })
              const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial)
              highlight.rotation.x = -Math.PI / 2
              highlight.position.copy(child.position)
              highlight.position.y += 0.001
              child.userData.highlight = highlight
              child.parent?.add(highlight)
            }
          } else {
            // 影の外にある点は通常の透明度
            material.opacity = child.userData.baseOpacity || 0.7
            // ハイライトを削除
            if (child.userData.highlight) {
              child.parent?.remove(child.userData.highlight)
              child.userData.highlight.geometry.dispose()
              ;(child.userData.highlight.material as THREE.Material).dispose()
              child.userData.highlight = null
            }
          }
        }
      })
    } catch (error) {
      console.error('Error updating shadow-volume check integration:', error)
    }
  }, [currentTime, showVolumeCheck, volumeCheckResult])


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
  }, [dateTime, showShadows, project.location.latitude, project.location.longitude, project.location.address])

  // 精密な太陽位置更新関数
  const updateSunPosition = async (date: Date) => {
    if (!sceneRef.current) return
    
    try {
      const { latitude, longitude, address } = project.location
      
      // 精密分析を実行
      const analysis = await advancedSolarAnalysisService.analyzePreciseShadows(
        latitude, longitude, address, date
      )
      // setPreciseAnalysis(analysis)
      
      // 分析結果を親コンポーネントに通知
      if (onAnalysisUpdate) {
        onAnalysisUpdate(analysis)
      }
      
      // 基本的な太陽データも取得
      const data = await solarDataService.getSolarData(latitude, longitude, date)
      // setSolarData(data)
      
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
function calculateSunPosition(date: Date, latitude: number, _longitude: number) {
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
    azimuth: ((azimuth + Math.PI) * 180 / Math.PI) % 360, // 北を0度とする
  }
}