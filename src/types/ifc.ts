// IFC関連の型定義
export interface IFCGeometry {
  vertices: Float32Array
  indices: Uint32Array
  matrix: number[]
  color: {
    x: number
    y: number
    z: number
    w: number
  }
}

export interface IFCModel {
  id: number
  meshes: IFCGeometry[]
}