export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

export interface WeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  windDirection: number
  solarRadiation: number
  precipitation: number
}

export interface MapboxFeature {
  type: 'Feature'
  geometry: {
    type: string
    coordinates: number[] | number[][] | number[][][]
  }
  properties: {
    [key: string]: any
  }
}

export interface ElevationData {
  elevation: number
  resolution: number
}

export interface BIMGenerationRequest {
  projectId: string
  buildingData: any
  siteData: any
}

export interface BIMGenerationResponse {
  ifcFileUrl: string
  modelId: string
  generationTime: number
}