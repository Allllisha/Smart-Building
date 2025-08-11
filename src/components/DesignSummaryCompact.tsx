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
  TextField,
  useTheme,
} from '@mui/material'
import { Project } from '@/types/project'

interface DesignSummaryCompactProps {
  project: Project
  onProjectUpdate: (updates: Partial<Project>) => void
  editable?: boolean
}

export const DesignSummaryCompact: React.FC<DesignSummaryCompactProps> = ({ 
  project, 
  onProjectUpdate,
  editable = true 
}) => {
  const theme = useTheme()

  // 住戸タイプの集計
  console.log('unitTypes:', project.buildingInfo.unitTypes)
  const unitTypeSummary = project.buildingInfo.unitTypes?.map((unitType, index) => {
    console.log('unitType:', unitType)
    return {
      type: (unitType?.typeName && unitType.typeName.trim()) || (unitType?.name && unitType.name.trim()) || `${String.fromCharCode(65 + index)}type`,
      area: typeof unitType?.exclusiveArea === 'number' ? unitType.exclusiveArea : (typeof unitType?.area === 'number' ? unitType.area : 0),
      count: typeof unitType?.units === 'number' ? unitType.units : (typeof unitType?.count === 'number' ? unitType.count : 0),
      totalArea: 0 // 後で計算
    }
  }) || []
  
  // totalAreaを計算
  unitTypeSummary.forEach(unit => {
    unit.totalArea = unit.area * unit.count
  })
  
  console.log('unitTypeSummary:', unitTypeSummary)

  // 各階面積の実際の入力値を使用（自動算出しない）
  const floorAreas = project.buildingInfo.floorDetails?.map((floor) => ({
    floor: `${floor.floor}`,
    residentialArea: floor.residentialArea || 0,
    capacityArea: floor.capacityArea || 0,
    nonCapacityArea: floor.nonCapacityArea || 0,
    totalArea: (floor.residentialArea || 0) + (floor.capacityArea || 0) + (floor.nonCapacityArea || 0)
  })) || []

  // 総延床面積の計算（階別詳細から算出、または手動入力値を使用）
  const calculatedTotalFromFloors = floorAreas.reduce((sum, floor) => sum + floor.totalArea, 0)
  const totalFloorArea = project.buildingInfo.totalFloorArea || calculatedTotalFromFloors

  // 編集可能なセル
  const EditableValue: React.FC<{
    value: string | number
    onUpdate?: (value: string | number) => void
    type?: 'text' | 'number'
    suffix?: string
    width?: string
    align?: 'left' | 'right' | 'center'
  }> = ({ value, onUpdate, type = 'text', suffix = '', width, align = 'left' }) => {
    if (!editable || !onUpdate) {
      return (
        <span>
          {value || '-'}{suffix && ` ${suffix}`}
        </span>
      )
    }

    return (
      <TextField
        value={value || ''}
        onChange={(e) => onUpdate(type === 'number' ? Number(e.target.value) || 0 : e.target.value)}
        type={type}
        size="small"
        variant="standard"
        fullWidth
        sx={{
          '& .MuiInput-root': {
            fontSize: '0.65rem',
            '&:before': { borderBottom: 'none' },
            '&:hover:before': { borderBottom: '1px solid #ccc' },
            '&:after': { borderBottom: `2px solid ${theme.palette.primary.main}` },
          },
          '& .MuiInputBase-input': {
            padding: '1px 2px',
            textAlign: align,
          },
          width: width || '100%',
        }}
        InputProps={{
          endAdornment: suffix ? (
            <Typography variant="caption" component="span" sx={{ ml: 0.3, whiteSpace: 'nowrap', fontSize: '0.6rem' }}>
              {suffix}
            </Typography>
          ) : null,
        }}
      />
    )
  }

  const cellStyle = {
    padding: '3px 6px',
    fontSize: '0.65rem',
    borderRight: '1px solid #ddd',
    borderBottom: '1px solid #ddd',
    lineHeight: 1.1,
  }

  const headerCellStyle = {
    ...cellStyle,
    backgroundColor: '#f5f5f5',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }

  const sectionHeaderStyle = {
    ...cellStyle,
    backgroundColor: '#e8e8e8',
    fontWeight: 700,
    textAlign: 'center' as const,
    fontSize: '0.7rem',
  }

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'auto',
      p: 1,
      gap: 2
    }}>
      {/* 設計概要セクション */}
      <Box sx={{ border: '1px solid #ddd', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ 
          backgroundColor: '#e8e8e8', 
          fontWeight: 700, 
          textAlign: 'center',
          fontSize: '0.8rem',
          p: 1,
          m: 0
        }}>
          設計概要
        </Typography>
        <Table size="small" sx={{ '& .MuiTableCell-root': { fontSize: '0.75rem', padding: '4px 8px' } }}>
          <TableBody>
            <TableRow>
              <TableCell sx={{ ...headerCellStyle, width: '30%' }}>敷地詳細</TableCell>
              <TableCell sx={cellStyle}>
                <EditableValue
                  value={project.location.address || ''}
                  onUpdate={(value) => onProjectUpdate({
                    location: { ...project.location, address: String(value) }
                  })}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={headerCellStyle}>敷地面積</TableCell>
              <TableCell sx={cellStyle}>
                <EditableValue
                  value={project.siteInfo.siteArea || 0}
                  onUpdate={(value) => onProjectUpdate({
                    siteInfo: { ...project.siteInfo, siteArea: Number(value) }
                  })}
                  type="number"
                  suffix="㎡"
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={headerCellStyle}>用途地域</TableCell>
              <TableCell sx={cellStyle}>
                <EditableValue
                  value={project.siteInfo.zoningType || ''}
                  onUpdate={(value) => onProjectUpdate({
                    siteInfo: { ...project.siteInfo, zoningType: String(value) }
                  })}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={headerCellStyle}>建築面積</TableCell>
              <TableCell sx={cellStyle}>
                <EditableValue
                  value={project.buildingInfo.buildingArea || 0}
                  onUpdate={(value) => onProjectUpdate({
                    buildingInfo: { ...project.buildingInfo, buildingArea: Number(value) }
                  })}
                  type="number"
                  suffix="㎡"
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={headerCellStyle}>延床面積</TableCell>
              <TableCell sx={cellStyle}>
                <EditableValue
                  value={totalFloorArea || 0}
                  onUpdate={(value) => onProjectUpdate({
                    buildingInfo: { ...project.buildingInfo, totalFloorArea: Number(value) }
                  })}
                  type="number"
                  suffix="㎡"
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={headerCellStyle}>建蔽率</TableCell>
              <TableCell sx={cellStyle}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem' }}>
                  <span>
                    {project.siteInfo.siteArea && project.buildingInfo.buildingArea
                      ? `${((project.buildingInfo.buildingArea / project.siteInfo.siteArea) * 100).toFixed(1)}%`
                      : '-%'}
                  </span>
                  <span>≦</span>
                  <span>{project.siteInfo.buildingCoverage ? `${project.siteInfo.buildingCoverage}%` : '-%'}</span>
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={headerCellStyle}>容積率</TableCell>
              <TableCell sx={cellStyle}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem' }}>
                  <span>
                    {project.siteInfo.siteArea && totalFloorArea
                      ? `${((totalFloorArea / project.siteInfo.siteArea) * 100).toFixed(1)}%`
                      : '-%'}
                  </span>
                  <span>≦</span>
                  <span>{project.siteInfo.floorAreaRatio ? `${project.siteInfo.floorAreaRatio}%` : '-%'}</span>
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      {/* 建物概要セクション */}
      <Box sx={{ border: '1px solid #ddd', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ 
          backgroundColor: '#e8e8e8', 
          fontWeight: 700, 
          textAlign: 'center',
          fontSize: '0.8rem',
          p: 1,
          m: 0
        }}>
          建物概要
        </Typography>
        <Table size="small" sx={{ '& .MuiTableCell-root': { fontSize: '0.75rem', padding: '4px 8px' } }}>
          <TableBody>
            <TableRow>
              <TableCell sx={{ ...headerCellStyle, width: '30%' }}>建築用途</TableCell>
              <TableCell sx={cellStyle}>{project.buildingInfo.usage || '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={headerCellStyle}>構造</TableCell>
              <TableCell sx={cellStyle}>
                {project.buildingInfo.structure || '-'}
                {project.buildingInfo.structureDetail && ` (${project.buildingInfo.structureDetail})`}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={headerCellStyle}>規模</TableCell>
              <TableCell sx={cellStyle}>地上{project.buildingInfo.floors || 0}階</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={headerCellStyle}>最高高さ</TableCell>
              <TableCell sx={cellStyle}>
                <EditableValue
                  value={project.buildingInfo.maxHeight ? (project.buildingInfo.maxHeight / 1000).toFixed(2) : ''}
                  onUpdate={(value) => onProjectUpdate({
                    buildingInfo: { ...project.buildingInfo, maxHeight: Number(value) * 1000 }
                  })}
                  type="number"
                  suffix="m"
                />
              </TableCell>
            </TableRow>
            {project.buildingInfo.usage === '共同住宅' && (
              <TableRow>
                <TableCell sx={headerCellStyle}>戸数</TableCell>
                <TableCell sx={cellStyle}>
                  <EditableValue
                    value={project.buildingInfo.units || 0}
                    onUpdate={(value) => onProjectUpdate({
                      buildingInfo: { ...project.buildingInfo, units: Number(value) }
                    })}
                    type="number"
                    suffix="戸"
                  />
                </TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell sx={headerCellStyle}>駐車場</TableCell>
              <TableCell sx={cellStyle}>
                <EditableValue
                  value={project.parkingPlan?.parkingSpaces || 0}
                  onUpdate={(value) => onProjectUpdate({
                    parkingPlan: { ...project.parkingPlan, parkingSpaces: Number(value) }
                  })}
                  type="number"
                  suffix="台"
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>


      {/* 面積表セクション */}
      {(floorAreas.length > 0 || (project.buildingInfo.usage === '共同住宅' && unitTypeSummary && unitTypeSummary.length > 0)) && (
        <Box sx={{ border: '1px solid #ddd', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ 
            backgroundColor: '#e8e8e8', 
            fontWeight: 700, 
            textAlign: 'center',
            fontSize: '0.8rem',
            p: 1,
            m: 0
          }}>
            面積表
          </Typography>
          <Table size="small" sx={{ '& .MuiTableCell-root': { fontSize: '0.7rem', padding: '3px 6px' } }}>
            <TableBody>
              {/* 住戸タイプ別情報セクション */}
              {project.buildingInfo.usage === '共同住宅' && unitTypeSummary && unitTypeSummary.length > 0 && (
                <>
                  <TableRow>
                    <TableCell sx={sectionHeaderStyle} colSpan={6}>住戸タイプ別情報</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={headerCellStyle}>タイプ名</TableCell>
                    <TableCell sx={headerCellStyle}>専有面積 (㎡)</TableCell>
                    <TableCell sx={headerCellStyle}>MB他 (㎡)</TableCell>
                    <TableCell sx={headerCellStyle}>バルコニー (㎡)</TableCell>
                    <TableCell sx={headerCellStyle}>戸数</TableCell>
                    <TableCell sx={headerCellStyle}>間取り</TableCell>
                  </TableRow>
                  {unitTypeSummary.map((unit, index) => {
                    const unitType = project.buildingInfo.unitTypes?.[index];
                    return (
                      <TableRow key={`unit-${index}`}>
                        <TableCell sx={cellStyle}>{unit.type}</TableCell>
                        <TableCell sx={cellStyle}>
                          {(unit.area && typeof unit.area === 'number') ? unit.area.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell sx={cellStyle}>
                          {(unitType?.mbArea && typeof unitType.mbArea === 'number') ? unitType.mbArea.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell sx={cellStyle}>
                          {(unitType?.balconyArea && typeof unitType.balconyArea === 'number') ? unitType.balconyArea.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell sx={cellStyle}>{unit.count || 0}</TableCell>
                        <TableCell sx={cellStyle}>{unitType?.layoutType || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell sx={headerCellStyle}>合計</TableCell>
                    <TableCell sx={headerCellStyle}>
                      {unitTypeSummary.reduce((sum, unit) => sum + (unit.totalArea || 0), 0).toFixed(0)}㎡
                    </TableCell>
                    <TableCell sx={headerCellStyle}>-</TableCell>
                    <TableCell sx={headerCellStyle}>-</TableCell>
                    <TableCell sx={headerCellStyle}>
                      {unitTypeSummary.reduce((sum, unit) => sum + unit.count, 0)}
                    </TableCell>
                    <TableCell sx={headerCellStyle}>-</TableCell>
                  </TableRow>
                </>
              )}

              {/* 階別面積詳細セクション */}
              {floorAreas.length > 0 && (
                <>
                  <TableRow>
                    <TableCell sx={sectionHeaderStyle} colSpan={5}>階別面積詳細</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={headerCellStyle}>階</TableCell>
                    <TableCell sx={headerCellStyle}>住戸部分 (㎡)</TableCell>
                    <TableCell sx={headerCellStyle}>容積対象 (㎡)</TableCell>
                    <TableCell sx={headerCellStyle}>非容積対象 (㎡)</TableCell>
                    <TableCell sx={headerCellStyle}>階合計 (㎡)</TableCell>
                  </TableRow>
                  {floorAreas.map((floor, index) => (
                    <TableRow key={`floor-${index}`}>
                      <TableCell sx={cellStyle}>{floor.floor}F</TableCell>
                      <TableCell sx={cellStyle}>
                        {floor.residentialArea > 0 ? floor.residentialArea.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell sx={cellStyle}>
                        {floor.capacityArea > 0 ? floor.capacityArea.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell sx={cellStyle}>
                        {floor.nonCapacityArea > 0 ? floor.nonCapacityArea.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell sx={cellStyle}>
                        {floor.totalArea > 0 ? floor.totalArea.toFixed(1) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={headerCellStyle}>計</TableCell>
                    <TableCell sx={headerCellStyle}>
                      {floorAreas.reduce((sum, floor) => sum + floor.residentialArea, 0).toFixed(1)}
                    </TableCell>
                    <TableCell sx={headerCellStyle}>
                      {floorAreas.reduce((sum, floor) => sum + floor.capacityArea, 0).toFixed(1)}
                    </TableCell>
                    <TableCell sx={headerCellStyle}>
                      {floorAreas.reduce((sum, floor) => sum + floor.nonCapacityArea, 0).toFixed(1)}
                    </TableCell>
                    <TableCell sx={headerCellStyle}>
                      {floorAreas.reduce((sum, floor) => sum + floor.totalArea, 0).toFixed(1)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  )
}