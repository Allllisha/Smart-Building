import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme, useMediaQuery } from '@mui/material'
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Slider,
  FormControl,
  FormControlLabel,
  Switch,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  LightMode as SunIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Architecture as ArchitectureIcon,
  Assessment as AnalysisIcon,
  Timeline as TimelineIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import Scene3DWithTerrain from '@/components/Scene3DWithTerrain'
import { useProjectStore } from '@/store/projectStore'
import { solarDataService } from '@/services/solarData.service'
import { shadowRegulationCheckService, VolumeCheckResult } from '@/services/shadowRegulationCheck.service'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function SimulationView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, projects, setCurrentProject, isLoading, updateProject } = useProjectStore()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'))
  
  // 現在の年から1年前の冬至を初期値に
  const currentYear = new Date().getFullYear()
  const winterSolsticeYear = currentYear - 1
  const [selectedDate, setSelectedDate] = useState(new Date(winterSolsticeYear, 11, 21)) // 冬至日を初期値に
  const [selectedTime, setSelectedTime] = useState(12) // 12時
  const [isPlaying, setIsPlaying] = useState(false)
  const [showShadows, setShowShadows] = useState(true)
  const [volumeCheckResult, setVolumeCheckResult] = useState<VolumeCheckResult | null>(null)
  const [isCheckingRegulation, setIsCheckingRegulation] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [showVolumeCheck] = useState(false) // 一旦無効化

  // レスポンシブな右パネル幅の計算
  const getResponsiveWidth = () => {
    if (isMobile) return Math.min(window.innerWidth * 0.9, 450) // モバイル: 画面幅の90%、最大450px
    if (isTablet) return Math.min(window.innerWidth * 0.5, 600) // タブレット: 画面幅の50%、最大600px
    return 680 // デスクトップ: 固定680px
  }

  const [rightPanelWidth, setRightPanelWidth] = useState(getResponsiveWidth())
  const [showMobileSidebar, setShowMobileSidebar] = useState(true)

  // 画面サイズ変更時に右パネル幅を更新
  useEffect(() => {
    const handleResize = () => {
      if (!isResizing) { // リサイズ中でない場合のみ自動調整
        setRightPanelWidth(getResponsiveWidth())
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobile, isTablet, isResizing])

  useEffect(() => {
    console.log('SimulationView - useEffect triggered:', { id, currentProject: !!currentProject, projectsCount: projects.length })
    
    if (id && !currentProject) {
      const project = projects.find(p => p.id === id)
      console.log('Looking for project with id:', id, 'Found:', !!project)
      if (project) {
        console.log('Setting current project:', project.name)
        setCurrentProject(project)
      } else if (projects.length === 0) {
        // プロジェクト一覧がまだ読み込まれていない場合、直接APIから取得を試す
        console.log('Projects not loaded yet, trying to fetch project directly')
        fetchProjectDirectly()
      } else {
        console.log('Project not found, navigating to dashboard')
        navigate('/dashboard')
      }
    }
  }, [id, currentProject, projects, setCurrentProject, navigate])

  // プロジェクトを直接APIから取得
  const fetchProjectDirectly = async () => {
    if (!id) return
    
    try {
      console.log('Fetching project directly from API:', id)
      const response = await fetch(`/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('API response:', data)
        const project = data.data || data // APIがdataプロパティを返すかもしれない
        console.log('Successfully fetched project:', project?.name)
        setCurrentProject(project)
      } else {
        console.error('Failed to fetch project:', response.status)
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      // ブラウザ拡張機能のエラーは無視
      if (error instanceof Error && error.message.includes('message channel closed')) {
        console.warn('Browser extension error ignored:', error.message)
        return
      }
      navigate('/dashboard')
    }
  }

  // プロジェクトが設定されたら日影規制チェックを実行
  useEffect(() => {
    if (currentProject) {
      performVolumeCheck()
    }
  }, [currentProject])

  // 日影規制チェックを実行
  const performVolumeCheck = async () => {
    if (!currentProject) return
    
    setIsCheckingRegulation(true)
    try {
      console.log('🏗️ ボリュームチェック開始')
      const result = await shadowRegulationCheckService.checkShadowRegulation(currentProject)
      setVolumeCheckResult(result)
      console.log('✅ ボリュームチェック完了:', result)
    } catch (error) {
      console.error('ボリュームチェックエラー:', error)
    } finally {
      setIsCheckingRegulation(false)
    }
  }

  useEffect(() => {
    // 時間アニメーション - 6時〜18時の範囲で動作（日出から日没まで）
    if (isPlaying) {
      const interval = setInterval(() => {
        setSelectedTime((prevTime) => {
          const newTime = prevTime + 0.25 // より細かい刻み（15分単位）
          // 18時を超えたら6時に戻る
          return newTime > 18 ? 6 : newTime
        })
      }, 800) // よりゆっくり（800ms間隔）
      return () => clearInterval(interval)
    }
  }, [isPlaying])

  // 建物設計が変更された際のリアルタイムチェック
  useEffect(() => {
    if (currentProject && volumeCheckResult && !isCheckingRegulation) {
      // 設計変更時は簡易チェックのみ（フルチェックは重いため）
      const quickCheck = checkQuickCompliance()
      if (!quickCheck) {
        // フルチェックが必要な場合のみ再実行
        performVolumeCheck()
      }
    }
  }, [currentProject?.buildingInfo, showShadows])

  // 簡易適合チェック
  const checkQuickCompliance = (): boolean => {
    if (!currentProject || !volumeCheckResult) return true
    
    const buildingHeight = currentProject.buildingInfo.maxHeight / 1000
    const isSubjectToRegulation = buildingHeight > volumeCheckResult.regulation.targetHeight || 
                                  currentProject.buildingInfo.floors >= volumeCheckResult.regulation.targetFloors
    
    return !isSubjectToRegulation || volumeCheckResult.isCompliant
  }

  // リサイズ機能
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = rightPanelWidth
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX
      
      // レスポンシブな最小・最大幅の設定
      let minWidth = 450
      let maxWidth = window.innerWidth * 0.7 // 画面幅の70%まで
      
      if (isMobile) {
        minWidth = 400
        maxWidth = Math.min(window.innerWidth * 0.95, 500)
      } else if (isTablet) {
        minWidth = 500
        maxWidth = Math.min(window.innerWidth * 0.65, 700)
      } else {
        minWidth = 600
        maxWidth = Math.min(window.innerWidth * 0.6, 900)
      }
      
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
      setRightPanelWidth(newWidth)
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // 3Dビューのスクリーンショットを受け取って保存
  const handleScreenshotReady = async (screenshot: string) => {
    if (!currentProject) return
    
    try {
      console.log('📸 スクリーンショットを受け取りました、プロジェクトに保存中...')
      
      // プロジェクトストアを更新
      updateProject(currentProject.id, { previewImage: screenshot })
      
      console.log('✅ スクリーンショットをプロジェクトに保存しました')
    } catch (error) {
      console.error('スクリーンショットの保存に失敗:', error)
    }
  }

  if (!currentProject) {
    return (
      <Box sx={{ 
        height: 'calc(100vh - 64px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {isLoading ? 'プロジェクトを読み込み中...' : 'プロジェクトが見つかりません'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isLoading 
              ? 'しばらくお待ちください' 
              : `プロジェクトID: ${id} が見つかりません。ダッシュボードに戻ります。`
            }
          </Typography>
          {!isLoading && (
            <Button 
              variant="contained" 
              onClick={() => navigate('/dashboard')}
              sx={{ mt: 2 }}
            >
              ダッシュボードに戻る
            </Button>
          )}
        </Box>
      </Box>
    )
  }

  const handleDateChange = (event: any) => {
    const month = parseInt(event.target.value)
    const newDate = new Date(selectedDate)
    newDate.setMonth(month)
    setSelectedDate(newDate)
  }

  const getDateTime = () => {
    const dateTime = new Date(selectedDate)
    dateTime.setHours(Math.floor(selectedTime))
    dateTime.setMinutes((selectedTime % 1) * 60)
    return dateTime
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Box sx={{ 
        p: 3, 
        borderBottom: 1, 
        borderColor: 'divider', 
        bgcolor: 'background.paper',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ArchitectureIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 300, color: 'primary.main', mb: 0.5 }}>
                Volume Study
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                {currentProject.name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/project/${currentProject.id}?step=0`)}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              1. 敷地設定
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/project/${currentProject.id}?step=1`)}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              2. 建物情報
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/project/${currentProject.id}?step=2`)}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              3. 面積・規制
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/project/${currentProject.id}?step=3`)}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              4. クライアント
            </Button>
            <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 2, ml: 1 }}>
              <Button
                variant="contained"
                onClick={() => navigate(`/project/${currentProject.id}/estimation`)}
                sx={{ textTransform: 'none', fontWeight: 500 }}
              >
                Cost Analysis
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* メインコンテンツ */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* 3Dビュー */}
        <Box sx={{ 
          width: `calc(100% - ${rightPanelWidth}px)`,
          position: 'relative',
          bgcolor: 'background.paper',
          '& canvas': {
            display: 'block !important',
            cursor: 'grab',
            '&:active': {
              cursor: 'grabbing'
            }
          }
        }}>
          <Scene3DWithTerrain
            project={currentProject}
            showShadows={showShadows}
            dateTime={getDateTime()}
            showTerrain={true}
            onScreenshotReady={handleScreenshotReady}
            volumeCheckResult={volumeCheckResult}
            showVolumeCheck={showVolumeCheck}
            currentTime={selectedTime}
            showShadowAnalysis={true}
          />
        </Box>
        
        {/* リサイズハンドル */}
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            width: 4,
            bgcolor: isResizing ? 'primary.main' : 'divider',
            cursor: 'col-resize',
            transition: 'background-color 0.2s',
            '&:hover': {
              bgcolor: 'primary.light'
            },
            position: 'relative',
            zIndex: 1000
          }}
        />
        
        {/* 右側パネル */}
        {(!isMobile || showMobileSidebar) && (
          <Box sx={{ 
            width: rightPanelWidth,
            bgcolor: 'background.default',
            overflow: 'auto',
            borderLeft: '1px solid',
            borderColor: 'divider',
            ...(isMobile && {
              position: 'absolute',
              top: 0,
              right: 0,
              height: '100%',
              zIndex: 1000,
              boxShadow: '-2px 0 8px rgba(0,0,0,0.15)'
            })
          }}>
            {/* モバイル用閉じるボタン */}
            {isMobile && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                p: 1, 
                borderBottom: '1px solid',
                borderColor: 'divider' 
              }}>
                <IconButton 
                  onClick={() => setShowMobileSidebar(false)}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            )}
            
            <Box sx={{ 
              p: isMobile ? 2 : 3, // モバイルでは余白を少なく
              fontSize: isMobile ? '0.875rem' : '1rem' // モバイルでは文字サイズを小さく
            }}>
            {/* 日影シミュレーション */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimelineIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 500, color: 'primary.main' }}>
                  Shadow Analysis
                </Typography>
              </Box>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel sx={{ fontWeight: 500 }}>Reference Date</InputLabel>
                <Select
                  value={selectedDate.getMonth()}
                  label="Reference Date"
                  onChange={handleDateChange}
                  sx={{ bgcolor: 'background.default' }}
                >
                  <MenuItem value={11}>
                    <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                      <SunIcon sx={{ mr: 2, color: 'warning.main', fontSize: 20 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>December (Winter Solstice)</Typography>
                        <Typography variant="caption" color="text.secondary">Shadow regulation standard</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                  <MenuItem value={5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                      <SunIcon sx={{ mr: 2, color: 'warning.light', fontSize: 20 }} />
                      <Typography variant="body2">June (Summer Solstice) - Reference</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value={8}>
                    <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                      <SunIcon sx={{ mr: 2, color: 'warning.main', fontSize: 20 }} />
                      <Typography variant="body2">September (Autumnal Equinox) - Reference</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                      <SunIcon sx={{ mr: 2, color: 'warning.main', fontSize: 20 }} />
                      <Typography variant="body2">March (Vernal Equinox) - Reference</Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      Time: {Math.floor(selectedTime)}:{String(Math.round((selectedTime % 1) * 60)).padStart(2, '0')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Regulation measurement period
                    </Typography>
                  </Box>
                  <Button
                    variant={isPlaying ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setIsPlaying(!isPlaying)}
                    startIcon={isPlaying ? <PauseIcon /> : <PlayIcon />}
                    sx={{ 
                      minWidth: 100,
                      textTransform: 'none',
                      fontWeight: 500,
                      borderRadius: 2
                    }}
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                </Box>
                <Box sx={{ position: 'relative', mt: 2, mb: 1 }}>
                  {/* 規制時間帯の背景ハイライト */}
                  {volumeCheckResult && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        left: `${((volumeCheckResult.regulation.timeRange.start - 6) / 12) * 100}%`,
                        width: `${((volumeCheckResult.regulation.timeRange.end - volumeCheckResult.regulation.timeRange.start) / 12) * 100}%`,
                        height: 8,
                        bgcolor: 'warning.light',
                        opacity: 0.3,
                        borderRadius: 1,
                        zIndex: 0,
                      }}
                    />
                  )}
                  <Slider
                    value={selectedTime}
                    onChange={(_, value) => setSelectedTime(value as number)}
                    min={6}
                    max={18}
                    step={0.5}
                    marks={[
                      { value: 6, label: '06:00' },
                      { value: 9, label: '09:00' },
                      { value: 12, label: '12:00' },
                      { value: 15, label: '15:00' },
                      { value: 18, label: '18:00' },
                    ]}
                    sx={{ 
                      position: 'relative',
                      zIndex: 1,
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                  Analysis period: 06:00 - 18:00 
                  {volumeCheckResult && (
                    <span> (Shadow regulation: {volumeCheckResult.regulation.timeRange.start}:00 - {volumeCheckResult.regulation.timeRange.end}:00)</span>
                  )}
                </Typography>
              </Box>

              <Card variant="outlined" sx={{ bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SunIcon sx={{ mr: 2, color: 'info.main', fontSize: 24 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'info.dark' }}>
                        Sun Altitude: {calculateSunAltitude(getDateTime(), currentProject.location.latitude).toFixed(1)}°
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(getDateTime(), 'MMM d, HH:mm')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Paper>

            {/* ボリュームチェック結果 */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AnalysisIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 500, color: 'primary.main' }}>
                  Compliance Analysis
                </Typography>
              </Box>
              
              {isCheckingRegulation ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Analyzing shadow regulation compliance...
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Performing detailed volume study based on building code
                  </Typography>
                </Box>
              ) : volumeCheckResult ? (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Alert 
                      severity={volumeCheckResult.isCompliant ? 'success' : 'error'}
                      icon={volumeCheckResult.isCompliant ? <CheckIcon /> : <ErrorIcon />}
                      sx={{ 
                        mb: 3, 
                        borderRadius: 2,
                        '& .MuiAlert-message': { 
                          fontWeight: 500,
                          fontSize: '0.95rem'
                        }
                      }}
                    >
                      {volumeCheckResult.isCompliant ? 
                        'Compliant with shadow regulations' : 
                        'Non-compliant with shadow regulations'}
                    </Alert>
                    
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: 2,
                      p: 2,
                      bgcolor: 'background.default',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Zone Type
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                          {volumeCheckResult.regulation.zone}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Height Threshold
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                          {volumeCheckResult.regulation.targetHeight}m+
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Measurement Height
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                          {volumeCheckResult.regulation.measurementHeight}m
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Compliance Rate
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600, 
                          mt: 0.5,
                          color: volumeCheckResult.complianceRate >= 90 ? 'success.main' : 
                                 volumeCheckResult.complianceRate >= 70 ? 'warning.main' : 'error.main'
                        }}>
                          {volumeCheckResult.complianceRate.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          5-10m Range Limit
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                          {volumeCheckResult.regulation.restrictions.range5to10m}h max
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          10m+ Range Limit
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                          {volumeCheckResult.regulation.restrictions.rangeOver10m}h max
                        </Typography>
                      </Box>
                      {volumeCheckResult.maxViolationHours > 0 && (
                        <>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Max Violation Hours
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, color: 'error.main' }}>
                              {volumeCheckResult.maxViolationHours.toFixed(1)}h
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Violation Area
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, color: 'error.main' }}>
                              {volumeCheckResult.violationArea.toFixed(0)}m²
                            </Typography>
                          </Box>
                        </>
                      )}
                      
                      {/* 詳細計算結果の追加情報 */}
                      {volumeCheckResult.detailedResult && (
                        <>
                          <Box sx={{ gridColumn: 'span 2', mt: 1, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                              Advanced Analysis
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                              <Box>
                                <Typography variant="caption" color="text.disabled">Analysis Resolution</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>1m² Grid</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.disabled">Check Points</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                  {volumeCheckResult.detailedResult.checkPoints.length.toLocaleString()}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.disabled">Building Footprint</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                  {volumeCheckResult.detailedResult.geometryAnalysis.effectiveBuildingFootprint.toFixed(0)}m²
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.disabled">Shadow Volume</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                  {volumeCheckResult.detailedResult.geometryAnalysis.shadowCastingVolume.toFixed(0)}m³
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.disabled">Peak Violation</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                  {Math.floor(volumeCheckResult.detailedResult.timeSeriesAnalysis.peakViolationTime)}:
                                  {String(Math.round((volumeCheckResult.detailedResult.timeSeriesAnalysis.peakViolationTime % 1) * 60)).padStart(2, '0')}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.disabled">Critical Floors</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                  {volumeCheckResult.detailedResult.geometryAnalysis.criticalFloors.join(', ')}F
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>

                  {/* 修正提案 */}
                  {volumeCheckResult.recommendations.length > 0 && (
                    <Card variant="outlined" sx={{ mt: 3, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <InfoIcon sx={{ mr: 1.5, color: 'info.main' }} />
                          <Typography variant="h6" sx={{ fontWeight: 500, color: 'info.dark' }}>
                            Design Recommendations
                          </Typography>
                        </Box>
                        
                        {/* 詳細提案がある場合は詳細表示 */}
                        {volumeCheckResult.detailedResult?.recommendations ? (
                          volumeCheckResult.detailedResult.recommendations.map((recommendation, index) => (
                            <Box key={index} sx={{ 
                              mb: 2, 
                              p: 2.5, 
                              bgcolor: 'background.paper', 
                              borderRadius: 2, 
                              border: '1px solid', 
                              borderColor: 'divider',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                <Chip 
                                  label={recommendation.priority === 'critical' ? 'Critical' : 
                                        recommendation.priority === 'high' ? 'High' : 
                                        recommendation.priority === 'medium' ? 'Medium' : 'Low'} 
                                  size="small"
                                  color={recommendation.priority === 'critical' ? 'error' : 
                                         recommendation.priority === 'high' ? 'warning' : 
                                         recommendation.priority === 'medium' ? 'info' : 'default'}
                                  sx={{ mr: 1.5, fontWeight: 600, fontSize: '0.75rem' }}
                                />
                                <Chip 
                                  label={recommendation.type === 'height_reduction' ? 'Height Reduction' :
                                         recommendation.type === 'setback' ? 'Setback' :
                                         recommendation.type === 'floor_reduction' ? 'Floor Reduction' :
                                         recommendation.type === 'shape_modification' ? 'Shape Modification' : 'Balcony Adjustment'}
                                  size="small" 
                                  variant="outlined"
                                  sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                                />
                              </Box>
                              <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.5, color: 'text.primary' }}>
                                {recommendation.description}
                              </Typography>
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                                  <Typography variant="caption" color="success.dark" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Compliance Improvement
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                                    +{recommendation.expectedImprovement.complianceRateImprovement.toFixed(0)}%
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                                  <Typography variant="caption" color="info.dark" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Shadow Reduction
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                                    {recommendation.expectedImprovement.shadowReductionArea.toFixed(0)}m²
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                                  <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Implementation Cost
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                                    {recommendation.implementationCost === 'high' ? 'High' : 
                                     recommendation.implementationCost === 'medium' ? 'Medium' : 'Low'}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          ))
                        ) : (
                          // 従来の簡易提案表示
                          volumeCheckResult.recommendations.map((recommendation, index) => (
                            <Box key={index} sx={{ 
                              p: 2, 
                              mb: 1.5, 
                              bgcolor: 'background.paper', 
                              borderRadius: 2, 
                              border: '1px solid', 
                              borderColor: 'divider' 
                            }}>
                              <Typography variant="body2" sx={{ lineHeight: 1.5, color: 'text.primary' }}>
                                {recommendation}
                              </Typography>
                            </Box>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    No compliance analysis available
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Please run analysis to see results
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* 再チェック */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AnalysisIcon sx={{ mr: 1.5, color: 'primary.main', transform: 'rotate(180deg)' }} />
                <Typography variant="h6" sx={{ fontWeight: 500, color: 'primary.main' }}>
                  Analysis Control
                </Typography>
              </Box>
              
              <Button
                variant="contained" 
                fullWidth
                onClick={performVolumeCheck}
                disabled={isCheckingRegulation}
                sx={{ 
                  py: 1.5,
                  mb: 2,
                  textTransform: 'none', 
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  borderRadius: 2
                }}
              >
                {isCheckingRegulation ? 'Analyzing...' : 'Run Shadow Analysis'}
              </Button>
              
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', fontStyle: 'italic' }}>
                Re-run analysis after modifying building parameters
              </Typography>
            </Paper>

            {/* 建物情報 */}
            <Paper elevation={2} sx={{ p: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ArchitectureIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 500, color: 'primary.main' }}>
                  Building Information
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: 2,
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Usage Type
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {currentProject.buildingInfo.usage}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Structure
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {currentProject.buildingInfo.structure}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Floors
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {currentProject.buildingInfo.floors}F
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Max Height
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {(currentProject.buildingInfo.maxHeight / 1000).toFixed(1)}m
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: 'span 2' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Building Area
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {currentProject.buildingInfo.buildingArea ? currentProject.buildingInfo.buildingArea.toLocaleString() : '0'}m²
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
        )}
        
        {/* モバイル用サイドバー表示ボタン */}
        {isMobile && !showMobileSidebar && (
          <Box sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 999
          }}>
            <IconButton
              onClick={() => setShowMobileSidebar(true)}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
            >
              <AnalysisIcon />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  )
}

// 太陽高度計算（簡易版）
function calculateSunAltitude(date: Date, latitude: number): number {
  const hour = date.getHours() + date.getMinutes() / 60
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
  const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180)
  
  const hourAngle = (hour - 12) * 15
  const latRad = latitude * Math.PI / 180
  const decRad = declination * Math.PI / 180
  const hourRad = hourAngle * Math.PI / 180
  
  const altitude = Math.asin(
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourRad)
  )
  
  return altitude * 180 / Math.PI
}