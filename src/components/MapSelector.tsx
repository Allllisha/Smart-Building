import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { Box, Paper, Typography, IconButton, TextField, InputAdornment, CircularProgress } from '@mui/material'
import { MyLocation as MyLocationIcon, Search as SearchIcon } from '@mui/icons-material'
import { ProjectLocation } from '@/types/project'

// MapboxトークンをENVから取得
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'your-mapbox-token'

interface MapSelectorProps {
  location: ProjectLocation
  onLocationChange: (location: ProjectLocation) => void
  enablePolygon?: boolean
}

export default function MapSelector({ location, onLocationChange, enablePolygon = false }: MapSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const [isDrawing] = useState(false)
  const [polygonCoordinates, setPolygonCoordinates] = useState<[number, number][]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // 逆ジオコーディング（座標から住所を取得）
  const reverseGeocode = async (lng: number, lat: number) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=ja&types=address,poi`
      )
      const data = await response.json()
      if (data.features && data.features.length > 0) {
        const address = data.features[0].place_name
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

  // Mapbox Search Box API（Zenrinデータ使用）による前方ジオコーディング
  const forwardGeocode = async (query: string) => {
    if (!query.trim()) return
    
    setIsSearching(true)
    
    try {
      // 検索クエリに「東京都」を付加（部分的な住所の場合）
      let searchQuery = query
      if (!query.includes('東京都') && !query.includes('都')) {
        // 世田谷区で始まる場合は東京都を付加
        if (query.startsWith('世田谷区') || query.includes('世田谷区')) {
          searchQuery = '東京都' + query
        }
      }
      
      // Mapbox Search Box API（Zenrinデータ使用・番地レベル対応）を使用
      const params = new URLSearchParams({
        q: searchQuery,
        access_token: mapboxgl.accessToken,
        language: 'ja',
        country: 'JP',
        limit: '5',
        types: 'address,poi'
      })
      
      const url = `https://api.mapbox.com/search/searchbox/v1/forward?${params.toString()}`
      console.log('Search API URL:', url)
      
      const searchApiResponse = await fetch(url)
      
      if (!searchApiResponse.ok) {
        console.error('Search API Error:', {
          status: searchApiResponse.status,
          statusText: searchApiResponse.statusText,
          url: url
        })
        const errorText = await searchApiResponse.text()
        console.error('Error response:', errorText)
        return
      }
      
      const searchData = await searchApiResponse.json()
      console.log('Search API response:', searchData)
      
      if (searchData.features && searchData.features.length > 0) {
        const result = searchData.features[0]
        const coords = result.geometry.coordinates
        
        console.log('Search API result found:', {
          name: result.properties.name,
          full_address: result.properties.full_address,
          coordinates: coords,
          properties: result.properties
        })
        
        // 住所の選択（full_addressまたはnameを使用）
        const displayAddress = result.properties.name || result.properties.full_address || searchQuery
        
        onLocationChange({
          ...location,
          latitude: coords[1],
          longitude: coords[0],
          address: displayAddress,
        })
      } else {
        console.log('No results found for query:', searchQuery)
      }
    } catch (error) {
      console.error('ジオコーディングエラー:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Google Geocoding APIを使用する代替実装（オプション）
  const forwardGeocodeWithGoogle = async (query: string) => {
    // Google Maps Geocoding APIキーが必要
    const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!googleApiKey) {
      console.log('Google Maps API key not configured')
      return null
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=ja&region=jp&key=${googleApiKey}`
      )
      const data = await response.json()
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0]
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          address: result.formatted_address
        }
      }
    } catch (error) {
      console.error('Google Geocoding error:', error)
    }
    return null
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
      if (isDrawing && enablePolygon) {
        const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
        setPolygonCoordinates([...polygonCoordinates, coords])
      } else {
        marker.current!.setLngLat(e.lngLat)
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