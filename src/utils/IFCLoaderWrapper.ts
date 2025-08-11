import * as THREE from 'three'

// IFC読み込みの代替実装
// 本実装では簡易的なモックローダーを使用
export class IFCLoaderWrapper {
  setWasmPath(_path: string) {
    // wasmPath is no longer used
  }

  async load(
    url: string,
    onLoad: (model: THREE.Group) => void,
    _onProgress?: (xhr: ProgressEvent) => void,
    onError?: (error: Error) => void
  ) {
    try {
      // 簡易的なモック実装
      // 実際のIFCファイル読み込みの代わりに、ダミーの3Dモデルを生成
      console.log('IFC Loading from:', url)
      
      const group = new THREE.Group()
      
      // サンプル建物を生成
      const geometry = new THREE.BoxGeometry(20, 30, 15)
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x606060,
        roughness: 0.5,
        metalness: 0.1
      })
      const building = new THREE.Mesh(geometry, material)
      building.position.y = 15
      building.castShadow = true
      building.receiveShadow = true
      
      group.add(building)
      
      // 窓を追加
      const windowGeometry = new THREE.BoxGeometry(2, 3, 0.1)
      const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.6
      })
      
      for (let floor = 0; floor < 10; floor++) {
        for (let i = 0; i < 4; i++) {
          const window1 = new THREE.Mesh(windowGeometry, windowMaterial)
          window1.position.set(11, floor * 3 + 3, i * 4 - 6)
          window1.rotation.y = Math.PI / 2
          group.add(window1)
          
          const window2 = new THREE.Mesh(windowGeometry, windowMaterial)
          window2.position.set(-11, floor * 3 + 3, i * 4 - 6)
          window2.rotation.y = Math.PI / 2
          group.add(window2)
        }
      }
      
      // 擬似的な読み込み遅延
      setTimeout(() => {
        onLoad(group)
      }, 1000)
      
    } catch (error) {
      if (onError) {
        onError(error as Error)
      }
    }
  }
}

export const IFCLoader = IFCLoaderWrapper