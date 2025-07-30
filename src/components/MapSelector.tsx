import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { Box, Paper, Typography, IconButton, TextField, InputAdornment, CircularProgress } from '@mui/material'
import { MyLocation as MyLocationIcon, Search as SearchIcon } from '@mui/icons-material'
import { ProjectLocation } from '@/types/project'

// MapboxトークンをENVから取得（実際の使用時は.envファイルに設定）
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'your-mapbox-token'
console.log('MapSelector: Mapbox token available:', !!mapboxgl.accessToken && mapboxgl.accessToken !== 'your-mapbox-token')

interface MapSelectorProps {
  location: ProjectLocation
  onLocationChange: (location: ProjectLocation) => void
  enablePolygon?: boolean
}

export default function MapSelector({ location, onLocationChange, enablePolygon = false }: MapSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [polygonCoordinates, setPolygonCoordinates] = useState<[number, number][]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  // 逆ジオコーディング（座標から住所を取得）
  const reverseGeocode = async (lng: number, lat: number) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=ja&types=address,poi`
      )
      const data = await response.json()
      if (data.features && data.features.length > 0) {
        const address = data.features[0].place_name
        console.log('MapSelector: Setting address from reverse geocoding:', address)
        onLocationChange({
          ...location,
          latitude: lat,
          longitude: lng,
          address: address,
        })
      }
    } catch (error) {
      console.error('逆ジオコーディングエラー:', error)
      onLocationChange({
        ...location,
        latitude: lat,
        longitude: lng,
      })
    }
  }

  // 前方ジオコーディング（住所・施設名から座標を取得）
  const forwardGeocode = async (query: string) => {
    if (!query.trim()) return
    
    setIsSearching(true)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&language=ja&country=JP&limit=5&types=address,poi,place`
      )
      const data = await response.json()
      if (data.features && data.features.length > 0) {
        const result = data.features[0]
        const [lng, lat] = result.center
        console.log('MapSelector: Setting address from search:', result.place_name)
        onLocationChange({
          ...location,
          latitude: lat,
          longitude: lng,
          address: result.place_name,
        })
        setSearchResults(data.features)
      }
    } catch (error) {
      console.error('前方ジオコーディングエラー:', error)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (!mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [Number(location.longitude), Number(location.latitude)],
      zoom: 16,
      language: 'ja',
    })

    // マーカーを追加
    marker.current = new mapboxgl.Marker({
      draggable: true,
    })
      .setLngLat([Number(location.longitude), Number(location.latitude)])
      .addTo(map.current)

    // マーカーのドラッグイベント
    marker.current.on('dragend', () => {
      const lngLat = marker.current!.getLngLat()
      reverseGeocode(lngLat.lng, lngLat.lat)
    })

    // 地図クリックイベント
    map.current.on('click', (e) => {
      console.log('MapSelector: Map clicked at:', e.lngLat.lng, e.lngLat.lat)
      if (isDrawing && enablePolygon) {
        const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
        setPolygonCoordinates([...polygonCoordinates, coords])
      } else {
        marker.current!.setLngLat(e.lngLat)
        console.log('MapSelector: Starting reverse geocoding for clicked location')
        reverseGeocode(e.lngLat.lng, e.lngLat.lat)
      }
    })

    // 地形表示を追加
    map.current.on('load', () => {
      map.current!.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      map.current!.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
    })

    return () => map.current?.remove()
  }, [])

  // 位置情報が変更されたらマーカーを更新
  useEffect(() => {
    if (marker.current) {
      marker.current.setLngLat([Number(location.longitude), Number(location.latitude)])
      map.current?.flyTo({
        center: [Number(location.longitude), Number(location.latitude)],
        zoom: 16,
      })
    }
  }, [location.latitude, location.longitude])

  // ポリゴンの描画
  useEffect(() => {
    if (!map.current || !enablePolygon) return

    if (polygonCoordinates.length > 2) {
      const sourceId = 'site-polygon'
      const layerId = 'site-polygon-layer'

      if (map.current.getSource(sourceId)) {
        (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[...polygonCoordinates, polygonCoordinates[0]]],
          },
          properties: {},
        })
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[...polygonCoordinates, polygonCoordinates[0]]],
            },
            properties: {},
          },
        })

        map.current.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          layout: {},
          paint: {
            'fill-color': '#088',
            'fill-opacity': 0.5,
          },
        })

        map.current.addLayer({
          id: `${layerId}-outline`,
          type: 'line',
          source: sourceId,
          layout: {},
          paint: {
            'line-color': '#088',
            'line-width': 3,
          },
        })
      }

      onLocationChange({
        ...location,
        polygon: polygonCoordinates,
      })
    }
  }, [polygonCoordinates])

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          console.log('MapSelector: Getting current location:', latitude, longitude)
          reverseGeocode(longitude, latitude)
        },
        (error) => {
          console.error('位置情報の取得に失敗しました:', error)
        }
      )
    }
  }

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      forwardGeocode(searchQuery)
    }
  }

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      <Box ref={mapContainer} sx={{ height: '100%', width: '100%' }} />
      
      {/* 検索ボックス */}
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 70,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="住所や建物名で検索（例：東京駅、渋谷区神宮前1-1-1）"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: isSearching ? (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ) : null,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'transparent',
              '& fieldset': {
                border: 'none',
              },
            },
          }}
        />
      </Paper>

      {/* 座標表示 */}
      <Paper
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          p: 1.5,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography variant="caption" display="block">
          緯度: {Number(location.latitude).toFixed(6)}
        </Typography>
        <Typography variant="caption">
          経度: {Number(location.longitude).toFixed(6)}
        </Typography>
      </Paper>

      {/* 現在地ボタン */}
      <IconButton
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          boxShadow: 2,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
          },
        }}
        onClick={handleCurrentLocation}
      >
        <MyLocationIcon />
      </IconButton>
    </Box>
  )
}