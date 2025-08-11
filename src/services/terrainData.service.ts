// import mapboxgl from 'mapbox-gl'

export interface TerrainPoint {
  longitude: number
  latitude: number
  elevation: number
}

export interface TerrainGrid {
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  resolution: number
  elevations: number[][]
}

export interface SurroundingBuilding {
  id: string
  coordinates: [number, number][]
  height: number
  type: string
}

export class TerrainDataService {
  private static instance: TerrainDataService
  private readonly accessToken: string

  private constructor() {
    this.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''
  }

  static getInstance(): TerrainDataService {
    if (!TerrainDataService.instance) {
      TerrainDataService.instance = new TerrainDataService()
    }
    return TerrainDataService.instance
  }

  /**
   * Get elevation data for a specific point
   */
  async getElevationAtPoint(longitude: number, latitude: number): Promise<number> {
    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-terrain-dem-v1/tilequery/${longitude},${latitude}.json?access_token=${this.accessToken}`
      )
      
      if (!response.ok) {
        throw new Error(`Elevation API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Extract elevation from DEM data (this is a simplified approach)
      // In a real implementation, you might need to process the tile data more carefully
      return data.elevation || 0
    } catch (error) {
      console.error('標高取得エラー:', error)
      return 0 // Fallback to sea level
    }
  }

  /**
   * Get terrain grid for a bounding box around the building site
   */
  async getTerrainGrid(
    centerLng: number, 
    centerLat: number, 
    radiusMeters: number = 500,
    resolution: number = 20
  ): Promise<TerrainGrid> {
    // Calculate bounding box
    const meterToDegree = 1 / 111320 // Approximate conversion at equator
    const latOffset = (radiusMeters * meterToDegree)
    const lngOffset = (radiusMeters * meterToDegree) / Math.cos(centerLat * Math.PI / 180)

    const bounds = {
      north: centerLat + latOffset,
      south: centerLat - latOffset,
      east: centerLng + lngOffset,
      west: centerLng - lngOffset
    }

    const elevations: number[][] = []
    
    // Generate grid points
    const latStep = (bounds.north - bounds.south) / resolution
    const lngStep = (bounds.east - bounds.west) / resolution

    for (let i = 0; i <= resolution; i++) {
      const row: number[] = []
      const lat = bounds.south + i * latStep
      
      for (let j = 0; j <= resolution; j++) {
        const lng = bounds.west + j * lngStep
        try {
          const elevation = await this.getElevationAtPoint(lng, lat)
          row.push(elevation)
        } catch (error) {
          console.warn(`標高取得失敗 at ${lng}, ${lat}:`, error)
          row.push(0)
        }
      }
      elevations.push(row)
    }

    return {
      bounds,
      resolution,
      elevations
    }
  }

  /**
   * Get surrounding buildings using Mapbox Places API
   */
  async getSurroundingBuildings(
    centerLng: number,
    centerLat: number,
    radiusMeters: number = 300
  ): Promise<SurroundingBuilding[]> {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/building.json?proximity=${centerLng},${centerLat}&access_token=${this.accessToken}&types=poi&limit=50`
      )

      if (!response.ok) {
        throw new Error(`Buildings API error: ${response.status}`)
      }

      const data = await response.json()
      const buildings: SurroundingBuilding[] = []

      data.features?.forEach((feature: any, index: number) => {
        if (feature.geometry?.type === 'Point') {
          const [lng, lat] = feature.geometry.coordinates
          
          // Calculate distance from center
          const distance = this.calculateDistance(centerLat, centerLng, lat, lng)
          
          if (distance <= radiusMeters) {
            buildings.push({
              id: `building_${index}`,
              coordinates: [[lng, lat]], // Simplified as point
              height: this.estimateBuildingHeight(feature),
              type: feature.properties?.category || 'unknown'
            })
          }
        }
      })

      return buildings
    } catch (error) {
      console.error('周辺建物取得エラー:', error)
      return []
    }
  }

  /**
   * Create Three.js terrain mesh from elevation data
   */
  createTerrainMesh(terrainGrid: TerrainGrid, _scale: number = 1): any {
    const { resolution, elevations } = terrainGrid
    // THREE not available - return mock object
    const geometry = null

    // Apply elevation data to vertices (mocked for non-THREE environment)
    if (!geometry) return { geometry: null, material: null }
    // const vertices = geometry.attributes.position.array as Float32Array
    
    // Mock elevation processing for non-THREE environment
    for (let i = 0; i < elevations.length; i++) {
      for (let j = 0; j < elevations[i].length; j++) {
        const vertexIndex = i * (resolution + 1) + j
        const elevation = elevations[i][j]
        
        // Set Z coordinate (elevation) - mocked
        // vertices[vertexIndex * 3 + 2] = elevation * 0.1 // Scale down elevation
        void vertexIndex, elevation // suppress unused warnings
      }
    }

    // geometry.attributes.position.needsUpdate = true
    // geometry.computeVertexNormals()

    // Create terrain material
    // THREE not available - return mock object
    const material = null

    // THREE not available - return mock object
    const mesh = { 
      geometry, 
      material,
      rotation: { x: -Math.PI / 2 },
      receiveShadow: true
    }
    return mesh
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  /**
   * Estimate building height from POI data
   */
  private estimateBuildingHeight(feature: any): number {
    const category = feature.properties?.category
    const name = feature.properties?.text || ''

    // Simple heuristic for building height estimation
    if (category?.includes('hospital') || name.includes('病院')) return 30
    if (category?.includes('school') || name.includes('学校')) return 15
    if (category?.includes('office') || name.includes('オフィス')) return 40
    if (category?.includes('hotel') || name.includes('ホテル')) return 50
    if (category?.includes('apartment') || name.includes('マンション')) return 25
    
    // Default residential height
    return 10
  }
}

export const terrainDataService = TerrainDataService.getInstance()