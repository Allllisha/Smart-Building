import * as THREE from 'three'
import mapboxgl from 'mapbox-gl'

/**
 * Utility functions for integrating Three.js with Mapbox GL JS
 */

export interface MapboxCoordinate {
  x: number
  y: number
  z: number
}

export interface MapboxToThreeOptions {
  altitude?: number
  scale?: number
}

/**
 * Convert longitude/latitude to Mapbox Mercator coordinates
 */
export function lngLatToMapboxCoordinate(
  lng: number, 
  lat: number, 
  options: MapboxToThreeOptions = {}
): MapboxCoordinate {
  const { altitude = 0, scale = 1 } = options
  
  const mercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], altitude)
  
  return {
    x: mercatorCoordinate.x * scale,
    y: mercatorCoordinate.y * scale,
    z: mercatorCoordinate.z * scale
  }
}

/**
 * Convert Mapbox coordinates back to longitude/latitude
 */
export function mapboxCoordinateToLngLat(coord: MapboxCoordinate): [number, number] {
  const mercatorCoordinate = new mapboxgl.MercatorCoordinate(coord.x, coord.y, coord.z)
  const lngLat = mercatorCoordinate.toLngLat()
  return [lngLat.lng, lngLat.lat]
}

/**
 * Create transformation matrix for Three.js objects in Mapbox coordinate system
 */
export function createMapboxTransformMatrix(
  lng: number,
  lat: number,
  altitude: number = 0
): THREE.Matrix4 {
  const mercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], altitude)
  
  // Create transformation matrix
  const scale = mercatorCoordinate.meterInMercatorCoordinateUnits()
  
  const matrix = new THREE.Matrix4()
  matrix.makeTranslation(
    mercatorCoordinate.x,
    mercatorCoordinate.y,
    mercatorCoordinate.z
  )
  matrix.scale(new THREE.Vector3(scale, -scale, scale))
  
  return matrix
}

/**
 * Convert Three.js camera to work with Mapbox projection
 */
export function setupMapboxCamera(
  camera: THREE.PerspectiveCamera,
  projectionMatrix: number[],
  modelViewMatrix: number[]
): void {
  // Set projection matrix from Mapbox
  camera.projectionMatrix.fromArray(projectionMatrix)
  
  // Set model-view matrix
  camera.matrix.fromArray(modelViewMatrix)
  camera.matrix.decompose(camera.position, camera.quaternion, camera.scale)
}

/**
 * Create custom Mapbox layer for Three.js integration
 */
export function createThreeJSLayer(
  id: string,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): mapboxgl.CustomLayerInterface {
  return {
    id,
    type: 'custom',
    renderingMode: '3d',
    
    onAdd: function(map: mapboxgl.Map, gl: WebGLRenderingContext) {
      // Configure renderer for Mapbox
      renderer.autoClear = false
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
    },

    render: function(gl: WebGLRenderingContext, matrix: number[]) {
      // Update camera with Mapbox matrix
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix)
      
      // Apply coordinate system transformation
      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0), 
        Math.PI / 2
      )
      const rotationZ = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 0, 1), 
        Math.PI
      )

      const transformMatrix = new THREE.Matrix4().fromArray(matrix)
      transformMatrix.multiply(rotationX)
      transformMatrix.multiply(rotationZ)
      
      camera.matrix = transformMatrix
      camera.matrix.decompose(camera.position, camera.quaternion, camera.scale)

      // Reset OpenGL state
      renderer.resetState()
      
      // Render Three.js scene
      renderer.render(scene, camera)
      
      // Trigger Mapbox repaint for animation
      map.triggerRepaint()
    }
  }
}

/**
 * Calculate optimal building position based on site polygon
 */
export function calculateBuildingPosition(
  sitePolygon: [number, number][],
  buildingDimensions: { width: number; depth: number }
): { lng: number; lat: number; rotation: number } {
  if (sitePolygon.length < 3) {
    // If no polygon, use first point
    return {
      lng: sitePolygon[0]?.[0] || 0,
      lat: sitePolygon[0]?.[1] || 0,
      rotation: 0
    }
  }

  // Calculate centroid of polygon
  let centerLng = 0
  let centerLat = 0
  
  sitePolygon.forEach(([lng, lat]) => {
    centerLng += lng
    centerLat += lat
  })
  
  centerLng /= sitePolygon.length
  centerLat /= sitePolygon.length

  // Calculate optimal rotation based on site orientation
  const firstEdge = [
    sitePolygon[1][0] - sitePolygon[0][0],
    sitePolygon[1][1] - sitePolygon[0][1]
  ]
  const rotation = Math.atan2(firstEdge[1], firstEdge[0])

  return {
    lng: centerLng,
    lat: centerLat,
    rotation
  }
}

/**
 * Create shadow projection geometry for shadow visualization
 */
export function createShadowProjection(
  building: THREE.Object3D,
  sunDirection: THREE.Vector3,
  groundLevel: number = 0
): THREE.Geometry {
  const shadowGeometry = new THREE.Geometry()
  
  // Get building bounding box
  const bbox = new THREE.Box3().setFromObject(building)
  const corners = [
    new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
    new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
    new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
    new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z)
  ]

  // Project corners onto ground plane
  corners.forEach(corner => {
    const t = (groundLevel - corner.y) / sunDirection.y
    const projectedPoint = corner.clone().add(sunDirection.clone().multiplyScalar(t))
    shadowGeometry.vertices.push(projectedPoint)
  })

  // Create shadow faces
  shadowGeometry.faces.push(
    new THREE.Face3(0, 1, 2),
    new THREE.Face3(0, 2, 3)
  )

  return shadowGeometry
}

/**
 * Animate between different sun positions for time-lapse visualization
 */
export function createSunPathAnimation(
  sunLight: THREE.DirectionalLight,
  sunPositions: Array<{ azimuth: number; altitude: number; time: string }>,
  duration: number = 5000
): Promise<void> {
  return new Promise((resolve) => {
    let currentIndex = 0
    const totalSteps = sunPositions.length
    const stepDuration = duration / totalSteps

    const animateStep = () => {
      if (currentIndex >= totalSteps) {
        resolve()
        return
      }

      const position = sunPositions[currentIndex]
      const altitudeRad = position.altitude * Math.PI / 180
      const azimuthRad = position.azimuth * Math.PI / 180

      // Calculate sun position
      const distance = 100
      const sunX = distance * Math.cos(altitudeRad) * Math.sin(azimuthRad)
      const sunY = Math.max(distance * Math.sin(altitudeRad), 5)
      const sunZ = distance * Math.cos(altitudeRad) * Math.cos(azimuthRad)

      // Animate to new position
      const startPos = sunLight.position.clone()
      const endPos = new THREE.Vector3(sunX, sunY, sunZ)
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / stepDuration, 1)
        
        // Smooth interpolation
        const eased = 1 - Math.pow(1 - progress, 3)
        sunLight.position.lerpVectors(startPos, endPos, eased)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          currentIndex++
          setTimeout(animateStep, 100) // Brief pause between steps
        }
      }
      
      animate()
    }

    animateStep()
  })
}