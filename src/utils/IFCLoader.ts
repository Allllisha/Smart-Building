import * as THREE from 'three'
import * as WebIFC from 'web-ifc'

export class IFCLoader {
  private ifcAPI: WebIFC.IfcAPI
  
  constructor() {
    this.ifcAPI = new WebIFC.IfcAPI()
  }

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
      // WebAssemblyの初期化
      await this.ifcAPI.Init()
      
      // IFCファイルの読み込み
      const response = await fetch(url)
      const data = await response.arrayBuffer()
      const uint8Array = new Uint8Array(data)
      
      // IFCモデルを開く
      const modelID = this.ifcAPI.OpenModel(uint8Array)
      
      // Three.jsのグループを作成
      const group = new THREE.Group()
      
      // すべてのメッシュを取得
      const flatMeshes = this.getFlatMeshes(modelID)
      
      // Three.jsのメッシュに変換
      for (const flatMesh of flatMeshes) {
        const geometry = this.getGeometry(flatMesh)
        const material = this.getMaterial(flatMesh)
        const mesh = new THREE.Mesh(geometry, material)
        
        // 変換行列を適用（FlatMeshに matrix プロパティがない場合はスキップ）
        if ('matrix' in flatMesh && Array.isArray((flatMesh as any).matrix)) {
          const matrix = new THREE.Matrix4()
          matrix.fromArray((flatMesh as any).matrix)
          mesh.applyMatrix4(matrix)
        }
        
        mesh.castShadow = true
        mesh.receiveShadow = true
        
        group.add(mesh)
      }
      
      // モデルをクローズ
      this.ifcAPI.CloseModel(modelID)
      
      onLoad(group)
    } catch (error) {
      console.error('IFC loading error:', error)
      if (onError) {
        onError(error as Error)
      }
    }
  }

  private getFlatMeshes(modelID: number): WebIFC.FlatMesh[] {
    const flatMeshes: WebIFC.FlatMesh[] = []
    const geometries = this.ifcAPI.LoadAllGeometry(modelID)
    
    for (let i = 0; i < geometries.size(); i++) {
      const geometry = geometries.get(i)
      if (geometry) {
        flatMeshes.push(geometry)
      }
    }
    
    return flatMeshes
  }

  private getGeometry(flatMesh: WebIFC.FlatMesh): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    
    // 頂点データ
    if ('vertices' in flatMesh && flatMesh.vertices) {
      const vertices = new Float32Array(flatMesh.vertices as ArrayLike<number>)
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    }
    
    // インデックスデータ
    if ('indices' in flatMesh && flatMesh.indices) {
      const indices = new Uint32Array(flatMesh.indices as ArrayLike<number>)
      geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    }
    
    // 法線を計算
    geometry.computeVertexNormals()
    
    return geometry
  }

  private getMaterial(flatMesh: WebIFC.FlatMesh): THREE.Material {
    // カラーデータからマテリアルを作成
    let color = new THREE.Color(0xcccccc) // デフォルトカラー
    let opacity = 1
    
    if ('color' in flatMesh && flatMesh.color) {
      const c = flatMesh.color as any
      if ('x' in c && 'y' in c && 'z' in c) {
        color = new THREE.Color(c.x, c.y, c.z)
        opacity = 'w' in c ? c.w : 1
      }
    }
    
    return new THREE.MeshStandardMaterial({
      color,
      opacity,
      transparent: opacity < 1,
      side: THREE.DoubleSide,
    })
  }
}

// IFCLoaderのラッパークラス（互換性のため）
export class IFCLoaderWrapper {
  private loader: IFCLoader
  
  constructor() {
    this.loader = new IFCLoader()
  }
  
  get ifcManager() {
    return {
      setWasmPath: (path: string) => this.loader.setWasmPath(path)
    }
  }
  
  load(
    url: string,
    onLoad: (model: THREE.Group) => void,
    onProgress?: (xhr: ProgressEvent) => void,
    onError?: (error: Error) => void
  ) {
    return this.loader.load(url, onLoad, onProgress, onError)
  }
}