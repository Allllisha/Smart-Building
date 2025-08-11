import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Box } from '@mui/material'

interface Scene3DSimpleProps {
  width?: number
  height?: number
}

export default function Scene3DSimple({ width = 800, height = 600 }: Scene3DSimpleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    console.log('🚀 初期化開始: Scene3DSimple')

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(25, 20, 25) // より遠い位置から全体を見渡せる角度
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    
    // DOM要素をクリア
    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer
    
    console.log('🖥️ Renderer作成完了')

    // Controls - 最もシンプルな設定
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.25
    controls.enableZoom = true
    controls.enableRotate = true
    controls.enablePan = true
    
    // イベントリスナー
    controls.addEventListener('change', () => {
      console.log('🎮 Controls変更:', camera.position)
    })
    
    controlsRef.current = controls
    console.log('🎮 OrbitControls作成完了')

    // ライト
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 1, 1)
    scene.add(directionalLight)

    // テスト用のキューブ
    const geometry = new THREE.BoxGeometry(2, 2, 2)
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff })
    const cube = new THREE.Mesh(geometry, material)
    scene.add(cube)
    console.log('📦 テストキューブ追加')

    // 地面
    const groundGeometry = new THREE.PlaneGeometry(20, 20)
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1
    scene.add(ground)

    // アニメーションループ
    function animate() {
      controls.update()
      renderer.render(scene, camera)
      animationIdRef.current = requestAnimationFrame(animate)
    }
    
    console.log('🎬 アニメーション開始')
    animate()

    // マウスイベントテスト
    renderer.domElement.addEventListener('mousedown', (e) => {
      console.log('🖱️ マウスダウン:', e.clientX, e.clientY)
    })
    
    renderer.domElement.addEventListener('mousemove', () => {
      // console.log('🖱️ マウス移動:', e.clientX, e.clientY) // ノイズになるのでコメント
    })

    // クリーンアップ
    return () => {
      console.log('🧹 クリーンアップ開始')
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
      
      if (containerRef.current && containerRef.current.children.length > 0) {
        containerRef.current.innerHTML = ''
      }
      
      console.log('🧹 クリーンアップ完了')
    }
  }, [width, height])

  return (
    <Box
      ref={containerRef}
      sx={{
        width: `${width}px`,
        height: `${height}px`,
        border: '2px solid #ddd',
        borderRadius: 1,
        overflow: 'hidden',
        '& canvas': {
          display: 'block',
          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing'
          }
        }
      }}
    />
  )
}