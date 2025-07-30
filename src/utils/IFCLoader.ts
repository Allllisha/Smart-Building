import * as THREE from 'three'
import * as WebIFC from 'web-ifc'

export class IFCLoader {
  private ifcAPI: WebIFC.IfcAPI
  private wasmPath: string = ''
  
  constructor() {
    this.ifcAPI = new WebIFC.IfcAPI()
  }

  setWasmPath(path: string) {
    this.wasmPath = path
  }

  async load(
    url: string,
    onLoad: (model: THREE.Group) => void,
    onProgress?: (xhr: ProgressEvent) => void,
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
        
        // 変換行列を適用
        const matrix = new THREE.Matrix4()
        matrix.fromArray(flatMesh.matrix)
        mesh.applyMatrix4(matrix)
        
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
    const vertices = new Float32Array(flatMesh.vertices)
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    
    // インデックスデータ
    const indices = new Uint32Array(flatMesh.indices)
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    
    // 法線を計算
    geometry.computeVertexNormals()
    
    return geometry
  }

  private getMaterial(flatMesh: WebIFC.FlatMesh): THREE.Material {
    // カラーデータからマテリアルを作成
    const color = new THREE.Color(flatMesh.color.x, flatMesh.color.y, flatMesh.color.z)
    
    return new THREE.MeshStandardMaterial({
      color,
      opacity: flatMesh.color.w,
      transparent: flatMesh.color.w < 1,
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