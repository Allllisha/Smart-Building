import { useEffect, useRef, useState } from 'react'
import { Box, Switch, FormControlLabel, Typography, IconButton, Tooltip } from '@mui/material'
import { 
  Visibility as StreetViewIcon, 
  FlightTakeoff as BirdEyeIcon,
  Home as HomeIcon,
  Architecture as ArchitectureIcon
} from '@mui/icons-material'
import { Project } from '@/types/project'
import { mapbox3dService } from '@/services/mapbox3d.service'
import { VolumeCheckResult } from '@/services/shadowRegulationCheck.service'
import Scene3D from './Scene3D'
import 'mapbox-gl/dist/mapbox-gl.css'

interface Scene3DWithTerrainProps {
  project: Project
  showShadows?: boolean
  dateTime?: Date
  showTerrain?: boolean
  onScreenshotReady?: (screenshot: string) => void
  volumeCheckResult?: VolumeCheckResult | null
  showVolumeCheck?: boolean
  currentTime?: number
  showShadowAnalysis?: boolean
}

export default function Scene3DWithTerrain({ 
  project, 
  showShadows = true, 
  dateTime = new Date(),
  showTerrain = true,
  onScreenshotReady,
  volumeCheckResult,
  showVolumeCheck = false,
  currentTime = 12,
  showShadowAnalysis = true
}: Scene3DWithTerrainProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const scene3dContainerRef = useRef<HTMLDivElement>(null)
  const [isTerrainMode, setIsTerrainMode] = useState(showTerrain)
  const [mapInitialized, setMapInitialized] = useState(false)

  // 建物情報が有効かチェック
  const hasValidBuildingInfo = (project: Project): boolean => {
    const { buildingInfo, siteInfo, location } = project
    
    return !!(
      buildingInfo.usage &&
      buildingInfo.structure &&
      buildingInfo.floors && buildingInfo.floors > 0 &&
      buildingInfo.buildingArea && buildingInfo.buildingArea > 0 &&
      siteInfo.siteArea && siteInfo.siteArea > 0 &&
      siteInfo.zoningType &&
      location.address
    )
  }

  // 3D地形マップの初期化
  useEffect(() => {
    if (isTerrainMode && mapContainerRef.current && !mapInitialized) {
      initializeTerrain()
    }
  }, [isTerrainMode, project])

  // 時間変更時の太陽位置更新（より頻繁に）
  useEffect(() => {
    if (isTerrainMode && mapInitialized && dateTime) {
      // 太陽位置と影をリアルタイムで更新
      const updateSunPosition = () => {
        mapbox3dService.updateSunPosition(
          dateTime, 
          project.location.latitude, 
          project.location.longitude
        )
      }
      
      updateSunPosition()
      
      // アニメーション中は更新頻度を上げる
      const interval = setInterval(updateSunPosition, 100)
      return () => clearInterval(interval)
    }
  }, [dateTime, isTerrainMode, mapInitialized, project.location])

  // 建物高さ変更時の更新
  useEffect(() => {
    if (isTerrainMode && mapInitialized) {
      mapbox3dService.updateBuildingHeight(project.buildingInfo.maxHeight || 10000)
    }
  }, [project.buildingInfo.maxHeight, isTerrainMode, mapInitialized])

  const initializeTerrain = async () => {
    if (!mapContainerRef.current) return

    try {
      console.log('🗺️ 3D地形マップを初期化中...')
      await mapbox3dService.initializeMap(mapContainerRef.current, project)
      setMapInitialized(true)
      console.log('✅ 3D地形マップ初期化完了')
    } catch (error) {
      console.error('3D地形マップの初期化に失敗:', error)
      // フォールバックとして通常の3Dビューを表示
      setIsTerrainMode(false)
    }
  }

  const handleTerrainToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTerrainMode = event.target.checked
    
    // スムーズな遷移のためのフェード効果
    if (newTerrainMode) {
      setIsTerrainMode(true)
    } else {
      // 地形モードを無効にする場合、マップを破棄
      mapbox3dService.dispose()
      setMapInitialized(false)
      // 少し遅延してから切り替え（スムーズな遷移）
      setTimeout(() => {
        setIsTerrainMode(false)
      }, 200)
    }
  }

  // クリーンアップ
  useEffect(() => {
    return () => {
      mapbox3dService.dispose()
    }
  }, [])

  // 建物情報が不足している場合のメッセージ表示
  if (!hasValidBuildingInfo(project)) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        color: 'text.secondary'
      }}>
        <ArchitectureIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" gutterBottom>
          建物情報が不足しています
        </Typography>
        <Typography variant="body2" textAlign="center" sx={{ maxWidth: 400 }}>
          3Dシミュレーションを表示するには、プロジェクト編集画面で以下の情報を入力してください：
          <br />• 建物用途・構造・階数・建築面積
          <br />• 敷地面積・用途地域・住所
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* モード切り替えコントロール */}
      <Box sx={{ 
        position: 'absolute', 
        top: 16, 
        right: 16, 
        zIndex: 1000,
        bgcolor: 'background.paper',
        borderRadius: 2,
        p: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <FormControlLabel
          control={
            <Switch
              checked={isTerrainMode}
              onChange={handleTerrainToggle}
              color="primary"
            />
          }
          label={
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              3D Terrain
            </Typography>
          }
        />
      </Box>

      {/* 地形モード時の表示状態 */}
      {isTerrainMode && (
        <>
          <Box sx={{ 
            position: 'absolute', 
            top: 16, 
            left: 16, 
            zIndex: 1000,
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: 1,
            px: 2,
            py: 1
          }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {mapInitialized ? '3D TERRAIN ACTIVE' : 'LOADING TERRAIN...'}
            </Typography>
          </Box>
          
          {/* 視点切り替えボタン */}
          {mapInitialized && (
            <Box sx={{ 
              position: 'absolute', 
              bottom: 16, 
              right: 16, 
              zIndex: 1000,
              display: 'flex',
              gap: 1,
              bgcolor: 'background.paper',
              borderRadius: 2,
              p: 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              <Tooltip title="ストリートビュー（地上視点）">
                <IconButton
                  onClick={() => mapbox3dService.setStreetView()}
                  color="primary"
                  size="small"
                >
                  <StreetViewIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="鳥瞰図">
                <IconButton
                  onClick={() => mapbox3dService.setBirdEyeView()}
                  color="primary"
                  size="small"
                >
                  <BirdEyeIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="建物住所に戻る">
                <IconButton
                  onClick={() => mapbox3dService.goToHome()}
                  color="secondary"
                  size="small"
                  sx={{ 
                    bgcolor: 'secondary.main', 
                    color: 'white',
                    '&:hover': { 
                      bgcolor: 'secondary.dark',
                      transform: 'scale(1.05)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <HomeIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </>
      )}

      {/* 3D地形マップコンテナ */}
      <Box
        ref={mapContainerRef}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: isTerrainMode ? 'block' : 'none',
          visibility: isTerrainMode ? 'visible' : 'hidden',
          zIndex: isTerrainMode ? 1 : 0,
          opacity: isTerrainMode && mapInitialized ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />

      {/* 従来の3Dシーンコンテナ */}
      <Box
        ref={scene3dContainerRef}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: !isTerrainMode ? 'block' : 'none',
          visibility: !isTerrainMode ? 'visible' : 'hidden',
          zIndex: !isTerrainMode ? 1 : 0,
          opacity: !isTerrainMode ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        {!isTerrainMode && (
          <Scene3D
            project={project}
            showShadows={showShadows}
            dateTime={dateTime}
            onScreenshotReady={onScreenshotReady}
            volumeCheckResult={volumeCheckResult}
            showVolumeCheck={showVolumeCheck}
            currentTime={currentTime}
            showShadowAnalysis={showShadowAnalysis}
            showTerrain={false}
          />
        )}
      </Box>

      {/* 地形データの読み込み状態表示 */}
      {isTerrainMode && !mapInitialized && (
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          p: 3,
          borderRadius: 2,
          textAlign: 'center'
        }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Loading 3D Terrain
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.7)">
            Fetching satellite imagery and elevation data...
          </Typography>
        </Box>
      )}
    </Box>
  )
}