import { useState } from 'react'
import { Box, Card, CardContent, Typography, Switch, FormControlLabel, Slider, Button } from '@mui/material'
import Scene3DWithTerrain from './Scene3DWithTerrain'
import Scene3D from './Scene3D'
import { Project } from '@/types/project'
import { PreciseSolarAnalysis } from '@/services/advancedSolarAnalysis.service'

interface Scene3DExampleProps {
  project: Project
  ifcUrl?: string
}

export default function Scene3DExample({ project, ifcUrl }: Scene3DExampleProps) {
  const [useTerrainView, setUseTerrainView] = useState(false)
  const [showShadows, setShowShadows] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [solarAnalysis, setSolarAnalysis] = useState<PreciseSolarAnalysis | null>(null)

  // Time slider value (0-24 hours)
  const [timeSliderValue, setTimeSliderValue] = useState(12)

  const handleTimeChange = (value: number) => {
    setTimeSliderValue(value)
    const newDate = new Date(currentTime)
    newDate.setHours(Math.floor(value))
    newDate.setMinutes((value % 1) * 60)
    setCurrentTime(newDate)
  }

  const handleAnalysisUpdate = (analysis: PreciseSolarAnalysis | null) => {
    setSolarAnalysis(analysis)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Control Panel */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            3D建物シミュレーション設定
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={useTerrainView}
                  onChange={(e) => setUseTerrainView(e.target.checked)}
                />
              }
              label="3D地形表示"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showShadows}
                  onChange={(e) => setShowShadows(e.target.checked)}
                />
              }
              label="影表示"
            />
          </Box>

          {/* Time Control */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              時刻設定: {Math.floor(timeSliderValue)}:{String(Math.floor((timeSliderValue % 1) * 60)).padStart(2, '0')}
            </Typography>
            <Slider
              value={timeSliderValue}
              onChange={(_, value) => handleTimeChange(value as number)}
              min={0}
              max={24}
              step={0.25}
              marks={[
                { value: 6, label: '6:00' },
                { value: 12, label: '12:00' },
                { value: 18, label: '18:00' }
              ]}
              sx={{ width: 300 }}
            />
          </Box>

          {/* Quick Time Buttons */}
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            {[
              { label: '朝 (8:00)', value: 8 },
              { label: '昼 (12:00)', value: 12 },
              { label: '夕 (16:00)', value: 16 },
              { label: '冬至', value: 12, isWinterSolstice: true },
              { label: '夏至', value: 12, isSummerSolstice: true }
            ].map((preset) => (
              <Button
                key={preset.label}
                size="small"
                variant="outlined"
                onClick={() => {
                  if (preset.isWinterSolstice) {
                    const winterSolstice = new Date(new Date().getFullYear(), 11, 21, 12, 0)
                    setCurrentTime(winterSolstice)
                    setTimeSliderValue(12)
                  } else if (preset.isSummerSolstice) {
                    const summerSolstice = new Date(new Date().getFullYear(), 5, 21, 12, 0)
                    setCurrentTime(summerSolstice)
                    setTimeSliderValue(12)
                  } else {
                    handleTimeChange(preset.value)
                  }
                }}
              >
                {preset.label}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* 3D View */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        {useTerrainView ? (
          <Scene3DWithTerrain
            project={project}
            showShadows={showShadows}
            dateTime={currentTime}
          />
        ) : (
          <Scene3D
            project={project}
            ifcUrl={ifcUrl}
            showShadows={showShadows}
            dateTime={currentTime}
            onAnalysisUpdate={handleAnalysisUpdate}
          />
        )}
      </Box>

      {/* Solar Analysis Display */}
      {solarAnalysis && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              太陽光分析結果
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2">日射量</Typography>
                <Typography variant="body1">
                  {solarAnalysis.radiation.global.toFixed(0)} W/m²
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2">雲量</Typography>
                <Typography variant="body1">
                  {solarAnalysis.weather.cloudCover}%
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2">影の濃さ</Typography>
                <Typography variant="body1">
                  {(solarAnalysis.shadowData.shadowIntensity * 100).toFixed(0)}%
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2">光の質</Typography>
                <Typography variant="body1">
                  {solarAnalysis.shadowData.lightQuality}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2">時間帯係数</Typography>
                <Typography variant="body1">
                  {(solarAnalysis.timeOfDayFactor * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}