import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Alert,
  Divider,
  Chip,
  Tooltip,
  useTheme
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
  ContentCopy as ContentCopyIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material'
import { FloorAreaDetail, UnitType, BuildingInfo } from '../types/project'

interface FloorAreaInputProps {
  buildingInfo: BuildingInfo
  onFloorDetailsChange: (floorDetails: FloorAreaDetail[]) => void
  onUnitTypesChange: (unitTypes: UnitType[]) => void
}

export const FloorAreaInput: React.FC<FloorAreaInputProps> = ({
  buildingInfo,
  onFloorDetailsChange,
  onUnitTypesChange
}) => {
  const theme = useTheme()
  // const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  
  const [floorDetails, setFloorDetails] = useState<FloorAreaDetail[]>([])
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([])
  const [expandedSections, setExpandedSections] = useState({
    floorDetails: true,
    unitTypes: true
  })
  const [selectedFloors, setSelectedFloors] = useState<Set<number>>(new Set())

  // 既存のデータから初期化
  useEffect(() => {
    if (buildingInfo.floorDetails && buildingInfo.floorDetails.length > 0) {
      setFloorDetails(buildingInfo.floorDetails)
    }
  }, [buildingInfo.floorDetails])

  useEffect(() => {
    if (buildingInfo.unitTypes && buildingInfo.unitTypes.length > 0) {
      setUnitTypes(buildingInfo.unitTypes)
    }
  }, [buildingInfo.unitTypes])

  // 階数が変更されたら階別面積詳細を初期化
  useEffect(() => {
    // 既存データがある場合はスキップ
    if (buildingInfo.floorDetails && buildingInfo.floorDetails.length > 0) {
      return
    }
    
    const newFloorDetails: FloorAreaDetail[] = []
    for (let i = 1; i <= (buildingInfo.floors || 1); i++) {
      const existing = floorDetails.find(fd => fd.floor === i)
      newFloorDetails.push(existing || {
        floor: i,
        residentialArea: 0,
        capacityArea: 0,
        nonCapacityArea: 0
      })
    }
    setFloorDetails(newFloorDetails)
  }, [buildingInfo.floors, buildingInfo.floorDetails])

  // 住戸タイプの初期化
  useEffect(() => {
    // 既存データがある場合はスキップ
    if (buildingInfo.unitTypes && buildingInfo.unitTypes.length > 0) {
      return
    }
    
    if (buildingInfo.usage === '共同住宅' && unitTypes.length === 0) {
      setUnitTypes([{
        typeName: 'タイプA',
        exclusiveArea: 0,
        mbArea: 0,
        balconyArea: 0,
        units: 1,
        layoutType: ''
      }])
    }
  }, [buildingInfo.usage, buildingInfo.units, buildingInfo.unitTypes])

  const handleFloorDetailChange = (floor: number, field: keyof FloorAreaDetail, value: number) => {
    const updated = floorDetails.map(fd => {
      if (fd.floor === floor) {
        return { ...fd, [field]: value }
      }
      return fd
    })
    setFloorDetails(updated)
    onFloorDetailsChange(updated)
  }

  const handleUnitTypeChange = (index: number, field: keyof UnitType, value: string | number) => {
    const updated = [...unitTypes]
    updated[index] = { ...updated[index], [field]: value }
    setUnitTypes(updated)
    onUnitTypesChange(updated)
  }

  const addUnitType = () => {
    const newType: UnitType = {
      typeName: `タイプ${String.fromCharCode(65 + unitTypes.length)}`,
      exclusiveArea: 0,
      mbArea: 0,
      balconyArea: 0,
      units: 1,
      layoutType: ''
    }
    const updated = [...unitTypes, newType]
    setUnitTypes(updated)
    onUnitTypesChange(updated)
  }

  const removeUnitType = (index: number) => {
    const updated = unitTypes.filter((_, i) => i !== index)
    setUnitTypes(updated)
    onUnitTypesChange(updated)
  }

  const calculateTotalArea = (floorDetail: FloorAreaDetail): number => {
    return (floorDetail.residentialArea || 0) + 
           (floorDetail.capacityArea || 0) + 
           (floorDetail.nonCapacityArea || 0)
  }

  const calculateTotalUnits = (): number => {
    return unitTypes.reduce((sum, type) => sum + (type.units || 0), 0)
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // 標準階の一括適用
  const applyStandardFloor = (sourceFloor: number, targetFloors: number[]) => {
    const sourceDetail = floorDetails.find(fd => fd.floor === sourceFloor)
    if (!sourceDetail) return

    const updated = floorDetails.map(fd => {
      if (targetFloors.includes(fd.floor)) {
        return {
          ...fd,
          residentialArea: sourceDetail.residentialArea,
          capacityArea: sourceDetail.capacityArea,
          nonCapacityArea: sourceDetail.nonCapacityArea
        }
      }
      return fd
    })
    setFloorDetails(updated)
    onFloorDetailsChange(updated)
  }

  return (
    <Box>
      {/* 階別面積詳細 */}
      <Box sx={{ mb: 4 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 2,
            cursor: 'pointer',
            '&:hover': { opacity: 0.8 }
          }}
          onClick={() => toggleSection('floorDetails')}
        >
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon /> 階別面積詳細
          </Typography>
          <IconButton size="small">
            {expandedSections.floorDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expandedSections.floorDetails}>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (selectedFloors.size === floorDetails.length) {
                          setSelectedFloors(new Set())
                        } else {
                          setSelectedFloors(new Set(floorDetails.map(fd => fd.floor)))
                        }
                      }}
                    >
                      {selectedFloors.size === floorDetails.length ? 
                        <CheckBoxIcon fontSize="small" /> : 
                        <CheckBoxOutlineBlankIcon fontSize="small" />
                      }
                    </IconButton>
                    階
                  </TableCell>
                  <TableCell align="right">住戸部分 (㎡)</TableCell>
                  <TableCell align="right">容積対象 (㎡)</TableCell>
                  <TableCell align="right">非容積対象 (㎡)</TableCell>
                  <TableCell align="right">階合計 (㎡)</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {floorDetails.map((detail) => (
                  <TableRow key={detail.floor}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newSelected = new Set(selectedFloors)
                            if (newSelected.has(detail.floor)) {
                              newSelected.delete(detail.floor)
                            } else {
                              newSelected.add(detail.floor)
                            }
                            setSelectedFloors(newSelected)
                          }}
                        >
                          {selectedFloors.has(detail.floor) ? 
                            <CheckBoxIcon fontSize="small" /> : 
                            <CheckBoxOutlineBlankIcon fontSize="small" />
                          }
                        </IconButton>
                        <Chip 
                          label={`${detail.floor}F`}
                          size="small"
                          color={detail.floor === 1 ? 'primary' : 'default'}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        value={detail.residentialArea === 0 ? '' : detail.residentialArea || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : Number(e.target.value)
                          handleFloorDetailChange(detail.floor, 'residentialArea', value)
                        }}
                        size="small"
                        sx={{ width: 100 }}
                        inputProps={{ min: 0, step: 0.1 }}
                        placeholder="0"
                        disabled={detail.floor === 1 && buildingInfo.usage === '共同住宅'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        value={detail.capacityArea === 0 ? '' : detail.capacityArea || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : Number(e.target.value)
                          handleFloorDetailChange(detail.floor, 'capacityArea', value)
                        }}
                        size="small"
                        sx={{ width: 100 }}
                        inputProps={{ min: 0, step: 0.1 }}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        value={detail.nonCapacityArea === 0 ? '' : detail.nonCapacityArea || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : Number(e.target.value)
                          handleFloorDetailChange(detail.floor, 'nonCapacityArea', value)
                        }}
                        size="small"
                        sx={{ width: 100 }}
                        inputProps={{ min: 0, step: 0.1 }}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {calculateTotalArea(detail).toFixed(1)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="選択した階にこの階の値をコピー">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (selectedFloors.size > 0) {
                              applyStandardFloor(detail.floor, Array.from(selectedFloors))
                              setSelectedFloors(new Set())
                            }
                          }}
                          disabled={selectedFloors.size === 0}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" fontWeight="bold">
                      建物合計
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {floorDetails.reduce((sum, fd) => sum + calculateTotalArea(fd), 0).toFixed(1)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* 一括適用パネル */}
          {selectedFloors.size > 0 && (
            <Paper 
              sx={{ 
                p: 2, 
                mb: 2, 
                backgroundColor: theme.palette.primary.light + '10',
                border: `1px solid ${theme.palette.primary.main}` 
              }}
            >
              <Typography variant="body2" sx={{ mb: 1 }}>
                {selectedFloors.size}階が選択されています
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => {
                    // 選択した階の最小階の値を他の選択階にコピー
                    const minFloor = Math.min(...Array.from(selectedFloors))
                    applyStandardFloor(minFloor, Array.from(selectedFloors).filter(f => f !== minFloor))
                    setSelectedFloors(new Set())
                  }}
                >
                  選択した最下階の値を他の階にコピー
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setSelectedFloors(new Set())}
                >
                  選択解除
                </Button>
                <Typography variant="caption" color="text.secondary">
                  ヒント: 各階の「コピー」ボタンで、その階の値を選択した階に適用できます
                </Typography>
              </Box>
            </Paper>
          )}

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="caption">
              • 住戸部分：専有面積、MB等の合計<br />
              • 容積対象：階段、廊下、ELV等の共用部分<br />
              • 非容積対象：駐車場、開放廊下、開放階段等
            </Typography>
          </Alert>
        </Collapse>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* 住戸タイプ別情報（共同住宅の場合のみ） */}
      {buildingInfo.usage === '共同住宅' && (
        <Box>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 2,
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 }
            }}
            onClick={() => toggleSection('unitTypes')}
          >
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HomeIcon /> 住戸タイプ別情報
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={`計 ${calculateTotalUnits()} 戸`}
                color={calculateTotalUnits() === buildingInfo.units ? 'success' : 'warning'}
                size="small"
              />
              <IconButton size="small">
                {expandedSections.unitTypes ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

          <Collapse in={expandedSections.unitTypes}>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>タイプ名</TableCell>
                    <TableCell align="right">専有面積 (㎡)</TableCell>
                    <TableCell align="right">MB他 (㎡)</TableCell>
                    <TableCell align="right">バルコニー (㎡)</TableCell>
                    <TableCell align="center">戸数</TableCell>
                    <TableCell align="center">間取り</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {unitTypes.map((type, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          value={type.typeName}
                          onChange={(e) => handleUnitTypeChange(index, 'typeName', e.target.value)}
                          size="small"
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={type.exclusiveArea === 0 ? '' : type.exclusiveArea}
                          onChange={(e) => handleUnitTypeChange(index, 'exclusiveArea', e.target.value === '' ? 0 : Number(e.target.value))}
                          size="small"
                          sx={{ width: 80 }}
                          inputProps={{ min: 0, step: 0.1 }}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={type.mbArea === 0 ? '' : type.mbArea}
                          onChange={(e) => handleUnitTypeChange(index, 'mbArea', e.target.value === '' ? 0 : Number(e.target.value))}
                          size="small"
                          sx={{ width: 80 }}
                          inputProps={{ min: 0, step: 0.1 }}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={type.balconyArea === 0 ? '' : type.balconyArea}
                          onChange={(e) => handleUnitTypeChange(index, 'balconyArea', e.target.value === '' ? 0 : Number(e.target.value))}
                          size="small"
                          sx={{ width: 80 }}
                          inputProps={{ min: 0, step: 0.1 }}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          value={type.units}
                          onChange={(e) => handleUnitTypeChange(index, 'units', Number(e.target.value))}
                          size="small"
                          sx={{ width: 60 }}
                          inputProps={{ min: 0 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          value={type.layoutType}
                          onChange={(e) => handleUnitTypeChange(index, 'layoutType', e.target.value)}
                          size="small"
                          sx={{ width: 80 }}
                          placeholder="例: 2LDK"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          onClick={() => removeUnitType(index)}
                          disabled={unitTypes.length === 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                startIcon={<AddIcon />}
                onClick={addUnitType}
                size="small"
                variant="outlined"
              >
                住戸タイプを追加
              </Button>
              
              {calculateTotalUnits() !== buildingInfo.units && (
                <Alert severity="warning" sx={{ flex: 1, ml: 2 }}>
                  合計戸数が建物情報の戸数（{buildingInfo.units}戸）と一致しません
                </Alert>
              )}
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  )
}