import React, { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  WbSunny as SunIcon,
  Business as BusinessIcon,
  Straighten as RulerIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { Project } from '@/types/project'
import { shadowRegulationCheckService } from '@/services/shadowRegulationCheck.service'

interface ShadowRegulationCheckProps {
  project: Project
}

export const ShadowRegulationCheck: React.FC<ShadowRegulationCheckProps> = ({ project }) => {
  const theme = useTheme()
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkShadowRegulation = async () => {
      // 面積・規制情報ステップで必要な最小限の情報をチェック
      if (!project?.location?.latitude || !project?.location?.longitude || !project?.siteInfo?.siteArea) {
        setResult(null)
        return
      }

      // Web検索による規制情報が取得されているかチェック
      if (!project?.siteInfo?.zoningType && !project?.siteInfo?.shadowRegulation) {
        setResult({
          overallStatus: 'INFO',
          summary: '規制情報を検索中です。住所から都市計画情報を取得してください。',
          checkItems: [],
          recommendations: []
        })
        return
      }

      // 建蔽率等の都市計画データ変更をコンソールに出力
      console.log('🏗️ ShadowRegulationCheck: 建蔽率変更検知:', project?.siteInfo?.buildingCoverage)
      console.log('🏗️ ShadowRegulationCheck: プロジェクトデータ:', {
        buildingCoverage: project?.siteInfo?.buildingCoverage,
        floorAreaRatio: project?.siteInfo?.floorAreaRatio,
        siteArea: project?.siteInfo?.siteArea,
        zoningType: project?.siteInfo?.zoningType
      })

      setChecking(true)
      setError(null)

      try {
        // 日影規制チェックを実行（建物情報なしでも動作するように修正）
        const checkResult = await shadowRegulationCheckService.checkShadowRegulationForSite(project)
        setResult(checkResult)
      } catch (err) {
        console.error('日影規制チェックエラー:', err)
        setError('日影規制のチェック中にエラーが発生しました')
      } finally {
        setChecking(false)
      }
    }

    checkShadowRegulation()
  }, [
    project?.location, 
    project?.siteInfo?.zoningType, 
    project?.siteInfo?.shadowRegulation,
    project?.siteInfo?.siteArea,
    project?.siteInfo?.buildingCoverage,
    project?.siteInfo?.floorAreaRatio,
    project?.siteInfo?.roadWidth,
    project?.siteInfo?.heightDistrict
  ])

  if (checking) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography>日影規制をチェック中...</Typography>
        </Stack>
      </Paper>
    )
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Alert severity="error">
          <AlertTitle>エラー</AlertTitle>
          {error}
        </Alert>
      </Paper>
    )
  }

  if (!result) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Alert severity="info">
          <AlertTitle>日影規制チェック</AlertTitle>
          敷地の位置情報を設定すると、日影規制の判定が表示されます。
        </Alert>
      </Paper>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircleIcon color="success" />
      case 'NG':
        return <CancelIcon color="error" />
      case 'WARNING':
        return <WarningIcon color="warning" />
      default:
        return <InfoIcon color="info" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'success'
      case 'NG':
        return 'error'
      case 'WARNING':
        return 'warning'
      default:
        return 'info'
    }
  }

  return (
    <Paper sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <Stack spacing={3}>
        {/* タイトルと概要 */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <SunIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight="bold">
              日影規制チェック結果
            </Typography>
          </Stack>
          
          {/* 総合判定 */}
          <Alert 
            severity={getStatusColor(result.overallStatus)} 
            sx={{ mb: 2 }}
            icon={getStatusIcon(result.overallStatus)}
          >
            <AlertTitle>
              {result.overallStatus === 'OK' && '建築可能'}
              {result.overallStatus === 'NG' && '建築不可'}
              {result.overallStatus === 'WARNING' && '条件付き建築可能'}
            </AlertTitle>
            {result.summary}
          </Alert>
        </Box>

        <Divider />

        {/* 詳細情報 */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            規制詳細
          </Typography>
          
          <Stack spacing={2}>
            {/* 用途地域情報 */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                <BusinessIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="600">
                  用途地域: {project.siteInfo.zoningType || '未設定'}
                </Typography>
              </Stack>
              {result.zoningInfo && (
                <Typography variant="body2" color="text.secondary">
                  {result.zoningInfo.description}
                </Typography>
              )}
            </Paper>

            {/* 規制値 */}
            {result.regulations && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                  <RulerIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="600">
                    日影規制値
                  </Typography>
                </Stack>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="5-10m範囲"
                      secondary={`${result.regulations.fiveToTenMeters || '-'}時間以内`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="10m超範囲"
                      secondary={`${result.regulations.overTenMeters || '-'}時間以内`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="測定高さ"
                      secondary={`${result.regulations.measurementHeight || '-'}m`}
                    />
                  </ListItem>
                </List>
              </Paper>
            )}

            {/* チェック項目 */}
            {result.checkItems && result.checkItems.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
                  チェック項目
                </Typography>
                <List>
                  {result.checkItems.map((item: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {getStatusIcon(item.status)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.name}
                        secondary={item.description}
                      />
                      {item.value && (
                        <Chip 
                          label={item.value}
                          size="small"
                          color={getStatusColor(item.status)}
                          variant="outlined"
                        />
                      )}
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

          </Stack>
        </Box>
      </Stack>
    </Paper>
  )
}