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
  Tooltip,
  Card,
  CardContent,
  Grid,
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  WbSunny as SunIcon,
  Business as BusinessIcon,
  Straighten as RulerIcon,
  Info as InfoIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material'
import { Project } from '@/types/project'
import { shadowRegulationCheckService } from '@/services/shadowRegulationCheck.service'
import { getShadowRegulationReferenceFromAPI } from '@/services/shadowRegulationService'

interface ShadowRegulationCheckProps {
  project: Project
}

export const ShadowRegulationCheck: React.FC<ShadowRegulationCheckProps> = ({ project }) => {
  const theme = useTheme()
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [referenceValues, setReferenceValues] = useState<any>(null)
  const [zoningMismatch, setZoningMismatch] = useState(false)

  // 参考値を取得
  useEffect(() => {
    const fetchReferenceValues = async () => {
      if (project?.siteInfo?.zoningType && project?.siteInfo?.floorAreaRatio) {
        try {
          const reference = await getShadowRegulationReferenceFromAPI(
            project.siteInfo.zoningType,
            project.siteInfo.floorAreaRatio,
            project.location?.latitude,
            project.location?.longitude
          )
          setReferenceValues(reference)
        } catch (error) {
          console.error('参考値取得エラー:', error)
        }
      }
    }
    
    fetchReferenceValues()
  }, [project?.siteInfo?.zoningType, project?.siteInfo?.floorAreaRatio, project?.location])

  // 用途地域の不整合をチェック（独立したuseEffect）
  useEffect(() => {
    const currentZoning = project?.siteInfo?.zoningType?.trim()
    const targetZoning = project?.siteInfo?.shadowRegulation?.targetArea?.trim()
    
    console.log('用途地域チェック:', {
      currentZoning,
      targetZoning,
      isEqual: currentZoning === targetZoning,
      currentLength: currentZoning?.length,
      targetLength: targetZoning?.length,
      shadowRegulation: project?.siteInfo?.shadowRegulation
    })
    
    if (targetZoning && currentZoning && targetZoning !== currentZoning) {
      setZoningMismatch(true)
    } else {
      setZoningMismatch(false)
    }
  }, [
    project?.siteInfo?.zoningType, 
    project?.siteInfo?.shadowRegulation?.targetArea,
    project?.siteInfo?.shadowRegulation?.allowedShadowTime5to10m,
    project?.siteInfo?.shadowRegulation?.allowedShadowTimeOver10m
  ])

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
        console.log('🏗️ ShadowRegulationCheck: プロジェクトデータ確認:', {
          siteArea: project?.siteInfo?.siteArea,
          buildingCoverage: project?.siteInfo?.buildingCoverage,
          floorAreaRatio: project?.siteInfo?.floorAreaRatio,
          roadWidth: project?.siteInfo?.roadWidth
        })
        
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
    project?.siteInfo?.frontRoadWidth,
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
            severity={zoningMismatch ? 'warning' : getStatusColor(result.overallStatus)} 
            sx={{ mb: 2 }}
            icon={zoningMismatch ? <WarningIcon /> : getStatusIcon(result.overallStatus)}
          >
            <AlertTitle>
              {zoningMismatch ? '要確認' : (
                <>
                  {result.overallStatus === 'OK' && '建築可能'}
                  {result.overallStatus === 'NG' && '建築不可'}
                  {result.overallStatus === 'WARNING' && '条件付き建築可能'}
                </>
              )}
            </AlertTitle>
            {zoningMismatch ? (
              <>
                用途地域が変更されています。現在の用途地域「{project.siteInfo.zoningType}」に対する
                正しい日影規制値を適用してから再確認してください。
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  （現在は「{project.siteInfo.shadowRegulation?.targetArea}」の規制値で判定：{result.summary}）
                </Typography>
              </>
            ) : (
              result.summary
            )}
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
                  チェックに使用する用途地域: {project.siteInfo.shadowRegulation?.targetArea || project.siteInfo.zoningType || '未設定'}
                </Typography>
              </Stack>
              {project.siteInfo.zoningType && 
               project.siteInfo.shadowRegulation?.targetArea && 
               project.siteInfo.zoningType !== project.siteInfo.shadowRegulation.targetArea && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="caption">
                    現在の用途地域「{project.siteInfo.zoningType}」と異なります
                  </Typography>
                </Alert>
              )}
              {result.zoningInfo && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {result.zoningInfo.description}
                </Typography>
              )}
            </Paper>

            {/* 規制値（使用値と参考値の比較表示） */}
            {result.regulations && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                  <RulerIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="600">
                    日影規制値（チェックに使用される値）
                  </Typography>
                </Stack>
                
                {/* 整合性警告 */}
                {zoningMismatch && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <AlertTitle>用途地域が変更されています</AlertTitle>
                    現在の用途地域は「{project.siteInfo.zoningType}」ですが、
                    日影規制は「{project.siteInfo.shadowRegulation?.targetArea}」の設定値を使用しています。
                    「日影規制（参考値自動計算・編集可能）」で参考値を適用して更新することをお勧めします。
                  </Alert>
                )}
                
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">5-10m範囲</Typography>
                          {referenceValues && 
                           result.regulations.fiveToTenMeters !== referenceValues.allowedShadowTime5to10m && (
                            <Tooltip title="参考値と異なります">
                              <WarningIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.primary" fontWeight="600">
                            使用値: {result.regulations.fiveToTenMeters || '-'}時間以内
                          </Typography>
                          {referenceValues && (
                            <Typography variant="caption" color="text.secondary">
                              参考値: {referenceValues.allowedShadowTime5to10m}時間以内
                              {result.regulations.fiveToTenMeters !== referenceValues.allowedShadowTime5to10m && 
                                ' （差異あり）'}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">10m超範囲</Typography>
                          {referenceValues && 
                           result.regulations.overTenMeters !== referenceValues.allowedShadowTimeOver10m && (
                            <Tooltip title="参考値と異なります">
                              <WarningIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.primary" fontWeight="600">
                            使用値: {result.regulations.overTenMeters || '-'}時間以内
                          </Typography>
                          {referenceValues && (
                            <Typography variant="caption" color="text.secondary">
                              参考値: {referenceValues.allowedShadowTimeOver10m}時間以内
                              {result.regulations.overTenMeters !== referenceValues.allowedShadowTimeOver10m && 
                                ' （差異あり）'}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">測定高さ</Typography>
                          {referenceValues && 
                           result.regulations.measurementHeight !== referenceValues.measurementHeight && (
                            <Tooltip title="参考値と異なります">
                              <WarningIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.primary" fontWeight="600">
                            使用値: {result.regulations.measurementHeight || '-'}m
                          </Typography>
                          {referenceValues && (
                            <Typography variant="caption" color="text.secondary">
                              参考値: {referenceValues.measurementHeight}m
                              {result.regulations.measurementHeight !== referenceValues.measurementHeight && 
                                ' （差異あり）'}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </List>
                
                {/* 値の出所を明示 */}
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    使用値: 「日影規制（参考値自動計算・編集可能）」で設定された値
                    {referenceValues && (
                      <><br />参考値: 用途地域「{project.siteInfo.zoningType}」・容積率{project.siteInfo.floorAreaRatio}%から自動計算</>
                    )}
                  </Typography>
                </Box>
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
            
            {/* 参考値との比較カード */}
            {referenceValues && project.siteInfo.shadowRegulation && (
              <Card sx={{ bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <CompareIcon color="info" />
                    <Typography variant="subtitle2" fontWeight="600">
                      設定値と参考値の比較
                    </Typography>
                  </Stack>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">設定値（使用中）</Typography>
                      <Typography variant="body2">
                        対象地域: {project.siteInfo.shadowRegulation.targetArea || '-'}<br />
                        5-10m: {project.siteInfo.shadowRegulation.allowedShadowTime5to10m}時間<br />
                        10m超: {project.siteInfo.shadowRegulation.allowedShadowTimeOver10m}時間
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">参考値（推奨）</Typography>
                      <Typography variant="body2">
                        対象地域: {referenceValues.targetArea}<br />
                        5-10m: {referenceValues.allowedShadowTime5to10m}時間<br />
                        10m超: {referenceValues.allowedShadowTimeOver10m}時間
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {(project.siteInfo.shadowRegulation.allowedShadowTime5to10m !== referenceValues.allowedShadowTime5to10m ||
                    project.siteInfo.shadowRegulation.allowedShadowTimeOver10m !== referenceValues.allowedShadowTimeOver10m) && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="caption">
                        設定値と参考値に差異があります。「日影規制（参考値自動計算・編集可能）」で参考値を適用できます。
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

          </Stack>
        </Box>
      </Stack>
    </Paper>
  )
}