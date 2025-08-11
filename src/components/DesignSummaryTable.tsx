import React from 'react'
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Grid,
  Divider,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  alpha,
  Card,
  CardContent,
  Stack,
} from '@mui/material'
import { ExpandMore as ExpandMoreIcon, 
         Business as BusinessIcon,
         Home as HomeIcon,
         Assessment as AssessmentIcon,
         Description as DescriptionIcon,
         Gavel as GavelIcon } from '@mui/icons-material'
import { Project } from '@/types/project'

interface DesignSummaryTableProps {
  project: Project
  onProjectUpdate: (updates: Partial<Project>) => void
}

export const DesignSummaryTable: React.FC<DesignSummaryTableProps> = ({ 
  project, 
  onProjectUpdate 
}) => {
  const theme = useTheme()

  // 住戸タイプの集計
  const unitTypeSummary = project.buildingInfo.unitTypes?.map(unitType => ({
    type: unitType.name,
    area: unitType.area,
    count: unitType.count,
    totalArea: unitType.area * unitType.count
  })) || []

  // 各階面積の計算
  const floorAreas = project.buildingInfo.floorDetails?.map((floor, index) => ({
    floor: `${index + 1}F`,
    area: floor.area,
    usage: floor.usage || '共同住宅'
  })) || []

  // 総延床面積の計算
  const totalFloorArea = floorAreas.reduce((sum, floor) => sum + floor.area, 0)

  // 編集可能なテーブルセル
  const EditableCell: React.FC<{
    value: string | number
    onUpdate: (value: string | number) => void
    type?: 'text' | 'number'
    suffix?: string
    width?: string
  }> = ({ value, onUpdate, type = 'text', suffix = '', width = '100%' }) => (
    <TableCell sx={{ p: 1 }}>
      <TextField
        value={value || ''}
        onChange={(e) => onUpdate(type === 'number' ? Number(e.target.value) || 0 : e.target.value)}
        type={type}
        size="small"
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
            '& fieldset': { border: 'none' },
            '&:hover fieldset': { border: `1px solid ${theme.palette.primary.main}` },
            '&.Mui-focused fieldset': { border: `2px solid ${theme.palette.primary.main}` },
          },
          '& .MuiInputBase-input': {
            fontSize: '0.75rem',
            py: 0.3,
            px: 0.5,
          },
          width: width,
        }}
        InputProps={{
          endAdornment: suffix ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {suffix}
            </Typography>
          ) : null,
        }}
      />
    </TableCell>
  )

  return (
    <Box sx={{ p: 0 }}>
      {/* 設計概要アコーディオン */}
      <Accordion defaultExpanded sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ 
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            minHeight: 56,
            '&.Mui-expanded': { minHeight: 56 },
            '& .MuiAccordionSummary-content': { alignItems: 'center' }
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <BusinessIcon sx={{ color: 'primary.main', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
              設計概要
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 2 }}>
          <TableContainer component={Paper} sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
            <Table size="small" sx={{ 
              '& .MuiTableCell-root': { 
                fontSize: '0.75rem', 
                padding: '6px 8px',
                lineHeight: 1.2
              } 
            }}>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', width: '35%' }}>建築主</TableCell>
                  <EditableCell
                    value={project.clientInfo?.companyName || ''}
                    onUpdate={(value) => onProjectUpdate({
                      clientInfo: { ...project.clientInfo, companyName: String(value) }
                    })}
                  />
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>物件名称</TableCell>
                  <EditableCell
                    value={project.name}
                    onUpdate={(value) => onProjectUpdate({ name: String(value) })}
                  />
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>建築地所在地</TableCell>
                  <EditableCell
                    value={project.location.address || ''}
                    onUpdate={(value) => onProjectUpdate({
                      location: { ...project.location, address: String(value) }
                    })}
                  />
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>敷地面積</TableCell>
                  <EditableCell
                    value={project.siteInfo.siteArea || 0}
                    onUpdate={(value) => onProjectUpdate({
                      siteInfo: { ...project.siteInfo, siteArea: Number(value) }
                    })}
                    type="number"
                    suffix="㎡"
                  />
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>建築面積</TableCell>
                  <EditableCell
                    value={project.buildingInfo.buildingArea || 0}
                    onUpdate={(value) => onProjectUpdate({
                      buildingInfo: { ...project.buildingInfo, buildingArea: Number(value) }
                    })}
                    type="number"
                    suffix="㎡"
                  />
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>延床面積</TableCell>
                  <EditableCell
                    value={project.buildingInfo.totalFloorArea || totalFloorArea || 0}
                    onUpdate={(value) => onProjectUpdate({
                      buildingInfo: { ...project.buildingInfo, totalFloorArea: Number(value) }
                    })}
                    type="number"
                    suffix="㎡"
                  />
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>建蔽率</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {project.siteInfo.siteArea && project.buildingInfo.buildingArea
                          ? `${((project.buildingInfo.buildingArea / project.siteInfo.siteArea) * 100).toFixed(1)}%`
                          : '計算不可'}
                      </Typography>
                      {project.siteInfo.buildingCoverage && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          (許容{project.siteInfo.buildingCoverage}%)
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>容積率</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {project.siteInfo.siteArea && (project.buildingInfo.totalFloorArea || totalFloorArea)
                          ? `${(((project.buildingInfo.totalFloorArea || totalFloorArea) / project.siteInfo.siteArea) * 100).toFixed(1)}%`
                          : '計算不可'}
                      </Typography>
                      {project.siteInfo.floorAreaRatio && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          (許容{project.siteInfo.floorAreaRatio}%)
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      <Grid container spacing={3}>
        {/* 建物概要 */}
        <Grid item xs={12} md={6}>
          <Accordion defaultExpanded sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                bgcolor: alpha(theme.palette.secondary.main, 0.08),
                minHeight: 56,
                '&.Mui-expanded': { minHeight: 56 },
                '& .MuiAccordionSummary-content': { alignItems: 'center' }
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <HomeIcon sx={{ color: 'secondary.main', fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                  建物概要
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2 }}>
              <TableContainer component={Paper} sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                <Table size="small" sx={{ 
                  '& .MuiTableCell-root': { 
                    fontSize: '0.7rem', 
                    padding: '4px 6px',
                    lineHeight: 1.1
                  } 
                }}>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', width: '40%' }}>用途</TableCell>
                      <TableCell>{project.buildingInfo.usage || '未設定'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>構造</TableCell>
                      <TableCell>
                        {project.buildingInfo.structure || '未設定'}
                        {project.buildingInfo.structureDetail && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            ({project.buildingInfo.structureDetail})
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>規模</TableCell>
                      <TableCell>地上{project.buildingInfo.floors || 0}階</TableCell>
                    </TableRow>
                    {project.buildingInfo.usage === '共同住宅' && (
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>戸数</TableCell>
                        <EditableCell
                          value={project.buildingInfo.units || 0}
                          onUpdate={(value) => onProjectUpdate({
                            buildingInfo: { ...project.buildingInfo, units: Number(value) }
                          })}
                          type="number"
                          suffix="戸"
                          width="60px"
                        />
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>最高高さ</TableCell>
                      <EditableCell
                        value={project.buildingInfo.maxHeight ? (project.buildingInfo.maxHeight / 1000).toFixed(2) : ''}
                        onUpdate={(value) => onProjectUpdate({
                          buildingInfo: { ...project.buildingInfo, maxHeight: Number(value) * 1000 }
                        })}
                        type="number"
                        suffix="m"
                        width="80px"
                      />
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>駐車場</TableCell>
                      <EditableCell
                        value={project.parkingPlan?.parkingSpaces || 0}
                        onUpdate={(value) => onProjectUpdate({
                          parkingPlan: { ...project.parkingPlan, parkingSpaces: Number(value) }
                        })}
                        type="number"
                        suffix="台"
                        width="80px"
                      />
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>駐輪場</TableCell>
                      <EditableCell
                        value={project.parkingPlan?.bicycleSpaces || 0}
                        onUpdate={(value) => onProjectUpdate({
                          parkingPlan: { ...project.parkingPlan, bicycleSpaces: Number(value) }
                        })}
                        type="number"
                        suffix="台"
                        width="80px"
                      />
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>緑地</TableCell>
                      <EditableCell
                        value={project.parkingPlan?.greenArea || 0}
                        onUpdate={(value) => onProjectUpdate({
                          parkingPlan: { ...project.parkingPlan, greenArea: Number(value) }
                        })}
                        type="number"
                        suffix="㎡"
                        width="80px"
                      />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* 住戸面積 */}
        {project.buildingInfo.usage === '共同住宅' && unitTypeSummary.length > 0 && (
          <Grid item xs={12} md={6}>
            <Accordion defaultExpanded sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  bgcolor: alpha(theme.palette.info.main, 0.08),
                  minHeight: 56,
                  '&.Mui-expanded': { minHeight: 56 },
                  '& .MuiAccordionSummary-content': { alignItems: 'center' }
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <AssessmentIcon sx={{ color: 'info.main', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
                    住戸面積
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2 }}>
                <TableContainer component={Paper} sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                  <Table size="small" sx={{ 
                    '& .MuiTableCell-root': { 
                      fontSize: '0.7rem', 
                      padding: '4px 6px',
                      lineHeight: 1.1
                    } 
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>住戸タイプ</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>面積 (㎡)</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>戸数</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>合計面積</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {unitTypeSummary.map((unit, index) => (
                        <TableRow key={index}>
                          <TableCell>{unit.type}</TableCell>
                          <TableCell>{unit.area ? unit.area.toFixed(2) : '0.00'}</TableCell>
                          <TableCell>{unit.count}</TableCell>
                          <TableCell>{unit.totalArea ? unit.totalArea.toFixed(2) : '0.00'}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>合計</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>-</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                          {unitTypeSummary.reduce((sum, unit) => sum + unit.count, 0)}戸
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                          {unitTypeSummary.reduce((sum, unit) => sum + (unit.totalArea || 0), 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* 面積表 */}
        {floorAreas.length > 0 && (
          <Grid item xs={12} md={6}>
            <Accordion defaultExpanded sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  bgcolor: alpha(theme.palette.success.main, 0.08),
                  minHeight: 56,
                  '&.Mui-expanded': { minHeight: 56 },
                  '& .MuiAccordionSummary-content': { alignItems: 'center' }
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <DescriptionIcon sx={{ color: 'success.main', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                    面積表
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2 }}>
                <TableContainer component={Paper} sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                  <Table size="small" sx={{ 
                    '& .MuiTableCell-root': { 
                      fontSize: '0.7rem', 
                      padding: '4px 6px',
                      lineHeight: 1.1
                    } 
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>階</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>用途</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>面積 (㎡)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {floorAreas.map((floor, index) => (
                        <TableRow key={index}>
                          <TableCell>{floor.floor}</TableCell>
                          <TableCell>{floor.usage}</TableCell>
                          <TableCell>{floor.area ? floor.area.toFixed(2) : '0.00'}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>合計</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>-</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                          {totalFloorArea ? totalFloorArea.toFixed(2) : '0.00'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* 法規制情報 */}
        <Grid item xs={12}>
          <Accordion defaultExpanded sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                bgcolor: alpha(theme.palette.warning.main, 0.08),
                minHeight: 56,
                '&.Mui-expanded': { minHeight: 56 },
                '& .MuiAccordionSummary-content': { alignItems: 'center' }
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <GavelIcon sx={{ color: 'warning.main', fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  法規制情報
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%', border: `1px solid ${theme.palette.divider}` }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.75rem' }}>用途地域</Typography>
                      <TextField
                        value={project.siteInfo.zoningType || ''}
                        onChange={(e) => onProjectUpdate({
                          siteInfo: { ...project.siteInfo, zoningType: e.target.value }
                        })}
                        size="small"
                        fullWidth
                        placeholder="第一種住居地域"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'background.paper',
                          },
                          '& .MuiInputBase-input': {
                            fontSize: '0.75rem',
                            py: 0.5,
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%', border: `1px solid ${theme.palette.divider}` }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.75rem' }}>高度地区</Typography>
                      <TextField
                        value={project.siteInfo.heightDistrict || ''}
                        onChange={(e) => onProjectUpdate({
                          siteInfo: { ...project.siteInfo, heightDistrict: e.target.value }
                        })}
                        size="small"
                        fullWidth
                        placeholder="第二種高度地区"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'background.paper',
                          },
                          '& .MuiInputBase-input': {
                            fontSize: '0.75rem',
                            py: 0.5,
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%', border: `1px solid ${theme.palette.divider}` }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.75rem' }}>前面道路幅</Typography>
                      <TextField
                        value={project.siteInfo.frontRoadWidth || ''}
                        onChange={(e) => onProjectUpdate({
                          siteInfo: { ...project.siteInfo, frontRoadWidth: Number(e.target.value) }
                        })}
                        type="number"
                        size="small"
                        fullWidth
                        placeholder="4.0"
                        InputProps={{
                          endAdornment: <Typography variant="caption">m</Typography>
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'background.paper',
                          },
                          '& .MuiInputBase-input': {
                            fontSize: '0.75rem',
                            py: 0.5,
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              {project.specialNotes && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>特記事項</Typography>
                  <TextField
                    value={project.specialNotes}
                    onChange={(e) => onProjectUpdate({ specialNotes: e.target.value })}
                    multiline
                    rows={3}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'background.paper',
                      }
                    }}
                  />
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  )
}