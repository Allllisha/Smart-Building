import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  InputAdornment,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  RestartAlt as RestartIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'

// 単価設定の型定義
export interface UnitPrices {
  // 基本単価（円/㎡）
  foundation: number
  structure: number
  exterior: number
  interior: number
  electrical: number
  plumbing: number
  hvac: number
  other: number
  temporary: number
  design: number
  
  // 構造係数
  structureCoefficients: {
    '壁式鉄筋コンクリート造': number
    '木造軸組工法': number
    '鉄骨造': number
    'その他': number
  }
  
  // 運用コスト関連
  operationalCost: {
    annualEnergyCostPerSqm: number // 年間エネルギーコスト/㎡
    heatingCostRatio: number // 暖房費率
    coolingCostRatio: number // 冷房費率
    solarPowerGenerationPerSqm: number // 太陽光発電/㎡
    paybackPeriod: number // 回収期間（年）
  }
  
  // 環境性能
  environmental: {
    annualSunlightHours: number // 年間日照時間
    co2EmissionsPerSqm: number // CO2排出量/㎡
    disasterMeasuresCost: number // 災害対策費
  }
  
  // 詳細工事単価
  detailedPrices: {
    // 基礎工事関連
    pileWork: number // 杭工事
    soilImprovement: number // 地盤改良
    earthRetaining: number // 山留工事
    earthwork: number // 土工事
    rcWork: number // RC工事
    rustPrevention: number // 鉄筋防錆
    
    // 躯体工事関連
    steelFrameMain: number // 鉄骨本体
    steelFrameEquipment: number // 鉄骨設備
    insulation: number // 断熱防露
    fireproofCovering: number // 耐火被覆
    roofWaterproofing: number // 屋根防水
    metalWork: number // 金属工事
    
    // 電気設備関連
    powerReceiving: number // 受変電設備
    lightingFixtures: number // 照明器具
    outletsWiring: number // 電灯コンセント
    lanWork: number // LAN工事
    securityDisaster: number // 防犯・防災
    otherElectrical: number // その他電気
  }
  
  // 係数・比率
  coefficients: {
    floorCountFactor: number // 階数係数（杭工事用）
    highRiseFireproofing: number // 高層階耐火被覆係数
    structuralComplexity: number // 構造複雑性係数
  }
}

// デフォルト値
export const defaultUnitPrices: UnitPrices = {
  foundation: 50000,
  structure: 150000,
  exterior: 80000,
  interior: 100000,
  electrical: 40000,
  plumbing: 35000,
  hvac: 45000,
  other: 30000,
  temporary: 20000,
  design: 50000,
  
  structureCoefficients: {
    '壁式鉄筋コンクリート造': 1.2,
    '木造軸組工法': 0.8,
    '鉄骨造': 1.0,
    'その他': 1.0,
  },
  
  operationalCost: {
    annualEnergyCostPerSqm: 3000,
    heatingCostRatio: 0.4,
    coolingCostRatio: 0.3,
    solarPowerGenerationPerSqm: 500,
    paybackPeriod: 15,
  },
  
  environmental: {
    annualSunlightHours: 1800,
    co2EmissionsPerSqm: 50,
    disasterMeasuresCost: 5000000,
  },
  
  detailedPrices: {
    pileWork: 35000,
    soilImprovement: 30000,
    earthRetaining: 25000,
    earthwork: 20000,
    rcWork: 28000,
    rustPrevention: 15000,
    steelFrameMain: 120000,
    steelFrameEquipment: 8000,
    insulation: 12000,
    fireproofCovering: 10000,
    roofWaterproofing: 25000,
    metalWork: 15000,
    powerReceiving: 8000,
    lightingFixtures: 12000,
    outletsWiring: 10000,
    lanWork: 8000,
    securityDisaster: 6000,
    otherElectrical: 5000,
  },
  
  coefficients: {
    floorCountFactor: 0.3,
    highRiseFireproofing: 1.2,
    structuralComplexity: 1.0,
  },
}

interface UnitPriceEditorProps {
  open: boolean
  onClose: () => void
  unitPrices: UnitPrices
  onSave: (prices: UnitPrices) => void
}

export default function UnitPriceEditor({ open, onClose, unitPrices, onSave }: UnitPriceEditorProps) {
  const [editedPrices, setEditedPrices] = useState<UnitPrices>(unitPrices)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    setEditedPrices(unitPrices)
  }, [unitPrices])

  const handleSave = () => {
    onSave(editedPrices)
    onClose()
  }

  const handleReset = () => {
    setEditedPrices(defaultUnitPrices)
  }

  const updateValue = (path: string[], value: number) => {
    setEditedPrices(prev => {
      const newPrices = { ...prev }
      let current: any = newPrices
      
      for (let i = 0; i < path.length - 1; i++) {
        if (typeof current[path[i]] === 'object') {
          current[path[i]] = { ...current[path[i]] }
        }
        current = current[path[i]]
      }
      
      current[path[path.length - 1]] = value
      return newPrices
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <SettingsIcon />
            <Typography variant="h6">単価・係数設定</Typography>
          </Stack>
          <Tooltip title="デフォルト値に戻す">
            <IconButton onClick={handleReset} color="default">
              <RestartIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          計算に使用される全ての単価と係数を編集できます。変更後、「保存して再計算」をクリックすると新しい値で見積もりが更新されます。
        </Alert>
        
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable">
          <Tab label="基本単価" />
          <Tab label="詳細単価" />
          <Tab label="構造係数" />
          <Tab label="運用コスト" />
          <Tab label="環境性能" />
        </Tabs>
        
        <Box sx={{ mt: 3 }}>
          {activeTab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>基本工事単価（円/㎡）</Typography>
              </Grid>
              {Object.entries({
                foundation: '基礎工事',
                structure: '躯体工事',
                exterior: '外装工事',
                interior: '内装工事',
                electrical: '電気設備',
                plumbing: '給排水設備',
                hvac: '空調・換気設備',
                other: 'その他工事',
                temporary: '仮設工事',
                design: '設計・諸経費',
              }).map(([key, label]) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <TextField
                    fullWidth
                    label={label}
                    type="number"
                    value={editedPrices[key as keyof typeof editedPrices]}
                    onChange={(e) => updateValue([key], Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">円/㎡</InputAdornment>,
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          )}
          
          {activeTab === 1 && (
            <Stack spacing={3}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>基礎工事関連単価（円/㎡）</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {Object.entries({
                      pileWork: '杭工事',
                      soilImprovement: '地盤改良工事',
                      earthRetaining: '山留工事',
                      earthwork: '土工事',
                      rcWork: 'RC工事',
                      rustPrevention: '鉄筋防錆工事',
                    }).map(([key, label]) => (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <TextField
                          fullWidth
                          label={label}
                          type="number"
                          value={editedPrices.detailedPrices[key as keyof typeof editedPrices.detailedPrices]}
                          onChange={(e) => updateValue(['detailedPrices', key], Number(e.target.value))}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">円/㎡</InputAdornment>,
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>躯体工事関連単価（円/㎡）</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {Object.entries({
                      steelFrameMain: '鉄骨本体工事',
                      steelFrameEquipment: '鉄骨設備工事',
                      insulation: '断熱防露工事',
                      fireproofCovering: '耐火被覆工事',
                      roofWaterproofing: '屋根防水工事',
                      metalWork: '金属工事',
                    }).map(([key, label]) => (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <TextField
                          fullWidth
                          label={label}
                          type="number"
                          value={editedPrices.detailedPrices[key as keyof typeof editedPrices.detailedPrices]}
                          onChange={(e) => updateValue(['detailedPrices', key], Number(e.target.value))}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">円/㎡</InputAdornment>,
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>電気設備関連単価（円/㎡）</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {Object.entries({
                      powerReceiving: '受変電設備',
                      lightingFixtures: '照明器具設備',
                      outletsWiring: '電灯コンセント',
                      lanWork: 'LAN工事',
                      securityDisaster: '防犯・防災設備',
                      otherElectrical: 'その他電気設備',
                    }).map(([key, label]) => (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <TextField
                          fullWidth
                          label={label}
                          type="number"
                          value={editedPrices.detailedPrices[key as keyof typeof editedPrices.detailedPrices]}
                          onChange={(e) => updateValue(['detailedPrices', key], Number(e.target.value))}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">円/㎡</InputAdornment>,
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Stack>
          )}
          
          {activeTab === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>構造別係数</Typography>
              </Grid>
              {Object.entries(editedPrices.structureCoefficients).map(([key, value]) => (
                <Grid item xs={12} sm={6} md={3} key={key}>
                  <TextField
                    fullWidth
                    label={key}
                    type="number"
                    value={value}
                    onChange={(e) => updateValue(['structureCoefficients', key], Number(e.target.value))}
                    inputProps={{ step: 0.1 }}
                  />
                </Grid>
              ))}
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>その他係数</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="階数係数（杭工事用）"
                  type="number"
                  value={editedPrices.coefficients.floorCountFactor}
                  onChange={(e) => updateValue(['coefficients', 'floorCountFactor'], Number(e.target.value))}
                  inputProps={{ step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="高層階耐火被覆係数"
                  type="number"
                  value={editedPrices.coefficients.highRiseFireproofing}
                  onChange={(e) => updateValue(['coefficients', 'highRiseFireproofing'], Number(e.target.value))}
                  inputProps={{ step: 0.1 }}
                />
              </Grid>
            </Grid>
          )}
          
          {activeTab === 3 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="年間エネルギーコスト"
                  type="number"
                  value={editedPrices.operationalCost.annualEnergyCostPerSqm}
                  onChange={(e) => updateValue(['operationalCost', 'annualEnergyCostPerSqm'], Number(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">円/㎡/年</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="暖房費率"
                  type="number"
                  value={editedPrices.operationalCost.heatingCostRatio}
                  onChange={(e) => updateValue(['operationalCost', 'heatingCostRatio'], Number(e.target.value))}
                  inputProps={{ step: 0.1, min: 0, max: 1 }}
                  helperText="年間エネルギーコストに対する比率"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="冷房費率"
                  type="number"
                  value={editedPrices.operationalCost.coolingCostRatio}
                  onChange={(e) => updateValue(['operationalCost', 'coolingCostRatio'], Number(e.target.value))}
                  inputProps={{ step: 0.1, min: 0, max: 1 }}
                  helperText="年間エネルギーコストに対する比率"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="太陽光発電効果"
                  type="number"
                  value={editedPrices.operationalCost.solarPowerGenerationPerSqm}
                  onChange={(e) => updateValue(['operationalCost', 'solarPowerGenerationPerSqm'], Number(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">円/㎡/年</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="投資回収期間"
                  type="number"
                  value={editedPrices.operationalCost.paybackPeriod}
                  onChange={(e) => updateValue(['operationalCost', 'paybackPeriod'], Number(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">年</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          )}
          
          {activeTab === 4 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="年間日照時間"
                  type="number"
                  value={editedPrices.environmental.annualSunlightHours}
                  onChange={(e) => updateValue(['environmental', 'annualSunlightHours'], Number(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">時間</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="CO2排出量"
                  type="number"
                  value={editedPrices.environmental.co2EmissionsPerSqm}
                  onChange={(e) => updateValue(['environmental', 'co2EmissionsPerSqm'], Number(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">kg/㎡/年</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="災害対策費"
                  type="number"
                  value={editedPrices.environmental.disasterMeasuresCost}
                  onChange={(e) => updateValue(['environmental', 'disasterMeasuresCost'], Number(e.target.value))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">円</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} startIcon={<CancelIcon />}>
          キャンセル
        </Button>
        <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>
          保存して再計算
        </Button>
      </DialogActions>
    </Dialog>
  )
}