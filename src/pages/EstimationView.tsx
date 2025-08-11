import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  useTheme,
  alpha,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Architecture as ArchitectureIcon,
  Foundation as FoundationIcon,
  Home as HomeIcon,
  Palette as PaletteIcon,
  Bolt as BoltIcon,
  Water as WaterIcon,
  Air as AirIcon,
  Construction as ConstructionIcon,
  Engineering as EngineeringIcon,
  AttachMoney as MoneyIcon,
  AutoGraph as AutoGraphIcon,
  CloudDownload as DownloadIcon,
  Refresh as RefreshIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  DataUsage as DataUsageIcon,
  Calculate as CalculateIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { useProjectStore } from '@/store/projectStore'
import { EstimationResult, CostBreakdown, Project } from '@/types/project'
import UnitPriceEditor, { UnitPrices, defaultUnitPrices } from '@/components/UnitPriceEditor'
import { generateAIAnalysis } from '@/utils/aiAnalysisHelper'
import ReactMarkdown from 'react-markdown'
import { generateEstimationPDF } from '@/services/pdfExport.service'

export default function EstimationView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, projects, setCurrentProject, updateProject } = useProjectStore()
  const [isCalculating, setIsCalculating] = useState(false)
  const [estimation, setEstimation] = useState<EstimationResult | null>(null)
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({})
  // const [showCalculationDetails, setShowCalculationDetails] = useState(false)
  const [unitPrices, setUnitPrices] = useState<UnitPrices>(defaultUnitPrices)
  const [showUnitPriceEditor, setShowUnitPriceEditor] = useState(false)

  useEffect(() => {
    if (id && !currentProject) {
      const project = projects.find(p => p.id === id)
      if (project) {
        setCurrentProject(project)
      } else {
        navigate('/dashboard')
      }
    }
  }, [id, currentProject, projects, setCurrentProject, navigate])

  useEffect(() => {
    if (currentProject?.estimations) {
      setEstimation(currentProject.estimations)
    }
  }, [currentProject])

  if (!currentProject) {
    return null
  }

  // 見積もり実行に必要な項目をチェック
  const validateProjectData = () => {
    const missingFields: string[] = []
    
    // 基本的な建物情報のチェック
    if (!currentProject.buildingInfo.usage) missingFields.push('建物用途')
    if (!currentProject.buildingInfo.structure) missingFields.push('構造')
    if (!currentProject.buildingInfo.floors || currentProject.buildingInfo.floors < 1) missingFields.push('階数')
    if (!currentProject.buildingInfo.buildingArea || currentProject.buildingInfo.buildingArea <= 0) missingFields.push('建築面積')
    
    // 敷地情報のチェック
    if (!currentProject.siteInfo.siteArea || currentProject.siteInfo.siteArea <= 0) missingFields.push('敷地面積')
    if (!currentProject.siteInfo.zoningType) missingFields.push('用途地域')
    
    // 所在地のチェック
    if (!currentProject.location.address) missingFields.push('所在地')
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    }
  }

  const validationResult = validateProjectData()

  const calculateEstimation = async (prices: UnitPrices = unitPrices) => {
    setIsCalculating(true)
    
    try {
      // Call the AI-powered estimation API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001'
      console.log('API URL:', apiUrl)
      console.log('Token:', localStorage.getItem('token'))
      
      const response = await fetch(`${apiUrl}/api/estimation/${id}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        throw new Error('見積もり計算に失敗しました')
      }

      const { data, warning } = await response.json()
      
      setEstimation(data)
      updateProject(currentProject.id, { estimations: data })
      
      // Dashboard の状態更新のために、プロジェクトストアの estimations も更新
      const updatedProject = { ...currentProject, estimations: data }
      setCurrentProject(updatedProject)
      
      // Show warning if fallback estimation was used
      if (warning) {
        console.warn('Estimation warning:', warning)
      }
      
      setIsCalculating(false)
      
    } catch (error) {
      console.error('Estimation calculation error:', error)
      
      // Fallback to client-side calculation if API fails
      const { buildingInfo } = currentProject
      const totalFloorArea = buildingInfo.totalFloorArea || ((buildingInfo.buildingArea || 0) * (buildingInfo.floors || 0))
      
      // 構造による補正係数
      const structureCoefficient = prices.structureCoefficients[buildingInfo.structure as keyof typeof prices.structureCoefficients] || 1.0

      // コスト内訳計算
      const breakdown: CostBreakdown = {
        foundation: Math.round((buildingInfo.buildingArea || 0) * prices.foundation * structureCoefficient),
        structure: Math.round(totalFloorArea * prices.structure * structureCoefficient),
        exterior: Math.round(totalFloorArea * prices.exterior),
        interior: Math.round(totalFloorArea * prices.interior),
        electrical: Math.round(totalFloorArea * prices.electrical),
        plumbing: Math.round(totalFloorArea * prices.plumbing),
        hvac: Math.round(totalFloorArea * prices.hvac),
        other: Math.round(totalFloorArea * prices.other),
        temporary: Math.round(totalFloorArea * prices.temporary),
        design: Math.round(totalFloorArea * prices.design),
      }

      const totalCost = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0)

      // 環境性能による運用コスト計算
      // const annualEnergyCost = Math.round(totalFloorArea * prices.operationalCost.annualEnergyCostPerSqm)
      // const heatingCost = Math.round(annualEnergyCost * prices.operationalCost.heatingCostRatio)
      // const coolingCost = Math.round(annualEnergyCost * prices.operationalCost.coolingCostRatio)

      const result: EstimationResult = {
        totalCost,
        breakdown,
        aiAnalysis: await generateAIAnalysisAsync(currentProject, breakdown, totalCost, prices),
      }

      setEstimation(result)
      updateProject(currentProject.id, { estimations: result })
      setIsCalculating(false)
    }
  }

  // 真のAI分析生成関数（非同期）
  const generateAIAnalysisAsync = async (project: Project, breakdown: CostBreakdown, totalCost: number, prices: UnitPrices) => {
    try {
      return await generateAIAnalysis(project, breakdown, totalCost, prices)
    } catch (error) {
      console.error('AI analysis generation failed:', error)
      // フォールバック時もきちんとした分析を提供
      return 'AI分析の生成中にエラーが発生しました。計算データに基づく基本分析をご確認ください。'
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString()
  }

  const getCostItemIcon = (key: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      foundation: <FoundationIcon />,
      structure: <HomeIcon />,
      exterior: <PaletteIcon />,
      interior: <HomeIcon />,
      electrical: <BoltIcon />,
      plumbing: <WaterIcon />,
      hvac: <AirIcon />,
      other: <ConstructionIcon />,
      temporary: <EngineeringIcon />,
      design: <ArchitectureIcon />,
    }
    return icons[key] || <MoneyIcon />
  }

  const getCostItemName = (key: string) => {
    const names: { [key: string]: string } = {
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
    }
    return names[key] || key
  }

  const theme = useTheme()

  const toggleItemExpansion = (itemKey: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }))
  }

  const getCalculationDetails = (itemKey: string, value: number) => {
    const totalFloorArea = currentProject.buildingInfo.totalFloorArea || 
                          ((currentProject.buildingInfo.buildingArea || 0) * (currentProject.buildingInfo.floors || 0))
    const buildingArea = currentProject.buildingInfo.buildingArea || 0
    const floors = currentProject.buildingInfo.floors || 0
    const structure = currentProject.buildingInfo.structure
    const structureCoefficient = unitPrices.structureCoefficients[structure as keyof typeof unitPrices.structureCoefficients] || 1.0

    // AI計算式に基づく詳細情報を返す
    const details: { [key: string]: any } = {
      foundation: {
        formula: '基礎工事関連の総計',
        components: [
          { name: '杭工事', formula: `建築面積 × ${unitPrices.detailedPrices.pileWork.toLocaleString()}円 × 階数係数`, value: Math.round(buildingArea * unitPrices.detailedPrices.pileWork * floors * unitPrices.coefficients.floorCountFactor) },
          { name: '地盤改良工事', formula: `建築面積 × ${unitPrices.detailedPrices.soilImprovement.toLocaleString()}円`, value: Math.round(buildingArea * unitPrices.detailedPrices.soilImprovement) },
          { name: '山留工事', formula: `建築面積 × ${unitPrices.detailedPrices.earthRetaining.toLocaleString()}円 × min(階数, 3)`, value: Math.round(buildingArea * unitPrices.detailedPrices.earthRetaining * Math.min(floors, 3)) },
          { name: '土工事', formula: `建築面積 × ${unitPrices.detailedPrices.earthwork.toLocaleString()}円`, value: Math.round(buildingArea * unitPrices.detailedPrices.earthwork) },
          { name: 'RC工事', formula: `建築面積 × ${unitPrices.detailedPrices.rcWork.toLocaleString()}円`, value: Math.round(buildingArea * unitPrices.detailedPrices.rcWork) },
          { name: '鉄筋防錆工事', formula: `建築面積 × ${unitPrices.detailedPrices.rustPrevention.toLocaleString()}円`, value: Math.round(buildingArea * unitPrices.detailedPrices.rustPrevention) }
        ],
        inputData: {
          '建築面積': `${buildingArea}㎡`,
          '階数': `${floors}階`,
          '構造': structure
        }
      },
      structure: {
        formula: '躯体工事関連の総計',
        components: [
          { name: '鉄骨本体工事', formula: `延床面積 × ${unitPrices.detailedPrices.steelFrameMain.toLocaleString()}円 × 構造係数`, 
            value: Math.round(totalFloorArea * unitPrices.detailedPrices.steelFrameMain * structureCoefficient) 
          },
          { name: '鉄骨設備工事', formula: `延床面積 × ${unitPrices.detailedPrices.steelFrameEquipment.toLocaleString()}円`, value: Math.round(totalFloorArea * unitPrices.detailedPrices.steelFrameEquipment) },
          { name: '断熱防露工事', formula: `延床面積 × ${unitPrices.detailedPrices.insulation.toLocaleString()}円`, value: Math.round(totalFloorArea * unitPrices.detailedPrices.insulation) },
          { name: '耐火被覆工事', formula: `延床面積 × ${unitPrices.detailedPrices.fireproofCovering.toLocaleString()}円 × (階数>3 ? ${unitPrices.coefficients.highRiseFireproofing} : 1.0)`, value: Math.round(totalFloorArea * unitPrices.detailedPrices.fireproofCovering * (floors > 3 ? unitPrices.coefficients.highRiseFireproofing : 1.0)) },
          { name: '屋根防水工事', formula: `建築面積 × ${unitPrices.detailedPrices.roofWaterproofing.toLocaleString()}円`, value: Math.round(buildingArea * unitPrices.detailedPrices.roofWaterproofing) },
          { name: '金属工事', formula: `延床面積 × ${unitPrices.detailedPrices.metalWork.toLocaleString()}円`, value: Math.round(totalFloorArea * unitPrices.detailedPrices.metalWork) }
        ],
        inputData: {
          '延床面積': `${totalFloorArea}㎡`,
          '建築面積': `${buildingArea}㎡`,
          '構造': structure,
          '構造係数': structureCoefficient.toFixed(1)
        }
      },
      electrical: {
        formula: '電気設備関連の総計',
        components: [
          { name: '受変電設備', formula: `延床面積 × ${unitPrices.detailedPrices.powerReceiving.toLocaleString()}円`, value: Math.round(totalFloorArea * unitPrices.detailedPrices.powerReceiving) },
          { name: '照明器具設備', formula: `延床面積 × ${unitPrices.detailedPrices.lightingFixtures.toLocaleString()}円`, value: Math.round(totalFloorArea * unitPrices.detailedPrices.lightingFixtures) },
          { name: '電灯コンセント', formula: `延床面積 × ${unitPrices.detailedPrices.outletsWiring.toLocaleString()}円`, value: Math.round(totalFloorArea * unitPrices.detailedPrices.outletsWiring) },
          { name: 'LAN工事', formula: `延床面積 × ${unitPrices.detailedPrices.lanWork.toLocaleString()}円`, value: Math.round(totalFloorArea * unitPrices.detailedPrices.lanWork) },
          { name: '防犯・防災設備', formula: `延床面積 × ${unitPrices.detailedPrices.securityDisaster.toLocaleString()}円`, value: Math.round(totalFloorArea * unitPrices.detailedPrices.securityDisaster) },
          { name: 'その他電気設備', formula: `延床面積 × ${unitPrices.detailedPrices.otherElectrical.toLocaleString()}円`, value: Math.round(totalFloorArea * unitPrices.detailedPrices.otherElectrical) }
        ],
        inputData: {
          '延床面積': `${totalFloorArea}㎡`,
          '用途': currentProject.buildingInfo.usage,
          '戸数': currentProject.buildingInfo.units ? `${currentProject.buildingInfo.units}戸` : 'N/A'
        }
      }
    }

    // 詳細が定義されていない項目の場合、単価を表示
    const itemDetails: { [key: string]: any } = {
      exterior: {
        formula: '外装工事の計算',
        components: [{ 
          name: '外装工事一式', 
          formula: `延床面積 × ${unitPrices.exterior.toLocaleString()}円/㎡`, 
          value 
        }],
        inputData: {
          '延床面積': `${totalFloorArea}㎡`,
          '単価': `${unitPrices.exterior.toLocaleString()}円/㎡`,
          '構造': structure
        }
      },
      interior: {
        formula: '内装工事の計算',
        components: [{ 
          name: '内装工事一式', 
          formula: `延床面積 × ${unitPrices.interior.toLocaleString()}円/㎡`, 
          value 
        }],
        inputData: {
          '延床面積': `${totalFloorArea}㎡`,
          '単価': `${unitPrices.interior.toLocaleString()}円/㎡`,
          '用途': currentProject.buildingInfo.usage
        }
      },
      plumbing: {
        formula: '給排水・衛生設備の計算',
        components: [{ 
          name: '給排水・衛生設備一式', 
          formula: `延床面積 × ${unitPrices.plumbing.toLocaleString()}円/㎡`, 
          value 
        }],
        inputData: {
          '延床面積': `${totalFloorArea}㎡`,
          '単価': `${unitPrices.plumbing.toLocaleString()}円/㎡`,
          '戸数': currentProject.buildingInfo.units ? `${currentProject.buildingInfo.units}戸` : 'N/A'
        }
      },
      hvac: {
        formula: '空調・換気設備の計算',
        components: [{ 
          name: '空調・換気設備一式', 
          formula: `延床面積 × ${unitPrices.hvac.toLocaleString()}円/㎡`, 
          value 
        }],
        inputData: {
          '延床面積': `${totalFloorArea}㎡`,
          '単価': `${unitPrices.hvac.toLocaleString()}円/㎡`,
          '用途': currentProject.buildingInfo.usage
        }
      },
      other: {
        formula: 'その他工事の計算',
        components: [{ 
          name: 'その他工事一式', 
          formula: `延床面積 × ${unitPrices.other.toLocaleString()}円/㎡`, 
          value 
        }],
        inputData: {
          '延床面積': `${totalFloorArea}㎡`,
          '単価': `${unitPrices.other.toLocaleString()}円/㎡`
        }
      },
      temporary: {
        formula: '仮設工事の計算',
        components: [{ 
          name: '仮設工事一式', 
          formula: `延床面積 × ${unitPrices.temporary.toLocaleString()}円/㎡`, 
          value 
        }],
        inputData: {
          '延床面積': `${totalFloorArea}㎡`,
          '単価': `${unitPrices.temporary.toLocaleString()}円/㎡`,
          '工期': '未定'
        }
      },
      design: {
        formula: '設計・諸経費の計算',
        components: [{ 
          name: '設計・諸経費一式', 
          formula: `延床面積 × ${unitPrices.design.toLocaleString()}円/㎡`, 
          value 
        }],
        inputData: {
          '延床面積': `${totalFloorArea}㎡`,
          '単価': `${unitPrices.design.toLocaleString()}円/㎡`,
          '構造': structure
        }
      }
    }

    return details[itemKey] || itemDetails[itemKey] || {
      formula: `${getCostItemName(itemKey)}の計算`,
      components: [{ name: getCostItemName(itemKey), formula: `延床面積 × 単価`, value }],
      inputData: { '延床面積': `${totalFloorArea}㎡` }
    }
  }

  if (isCalculating) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, backgroundColor: 'background.default', minHeight: '100vh' }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            見積もりを計算中...
          </Typography>
          <LinearProgress sx={{ mt: 2 }} />
        </Paper>
      </Container>
    )
  }

  if (!estimation) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, backgroundColor: 'background.default', minHeight: '100vh' }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            見積もりが未実行です
          </Typography>
          
          {validationResult.isValid ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                プロジェクト情報が準備できました。見積もりを実行してください。
              </Typography>
              <Button
                variant="contained"
                onClick={() => calculateEstimation()}
                disabled={isCalculating}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                }}
              >
                {isCalculating ? '計算中...' : '見積もりを実行'}
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                見積もりを実行するには、以下の項目を入力してください：
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                {validationResult.missingFields.map((field, index) => (
                  <Chip
                    key={index}
                    label={field}
                    color="error"
                    variant="outlined"
                    size="small"
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
              
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/project/${id}`)}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 4,
                  }}
                >
                  プロジェクト編集画面へ
                </Button>
                <Button
                  variant="contained"
                  onClick={() => calculateEstimation()}
                  disabled={true}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 4,
                  }}
                >
                  見積もりを実行
                </Button>
              </Stack>
            </>
          )}
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, backgroundColor: 'background.default', minHeight: '100vh' }}>
      {/* ヘッダーセクション */}
      <Box sx={{ 
        position: 'relative',
        background: `linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)`,
        color: 'white',
        p: 6,
        mb: 6,
        borderRadius: 3,
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M36 30c0-3.3-2.7-6-6-6s-6 2.7-6 6 2.7 6 6 6 6-2.7 6-6zm24 0c0-3.3-2.7-6-6-6s-6 2.7-6 6 2.7 6 6 6 6-2.7 6-6zm-12-12c0-3.3-2.7-6-6-6s-6 2.7-6 6 2.7 6 6 6 6-2.7 6-6zm-12 24c0-3.3-2.7-6-6-6s-6 2.7-6 6 2.7 6 6 6 6-2.7 6-6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }
      }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={4}>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  mb: 1,
                  fontSize: { xs: '2rem', md: '3rem' },
                  color: 'white'
                }}
              >
                Cost Estimation
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 500,
                  mb: 3,
                  color: 'rgba(255,255,255,0.9)'
                }}
              >
                {currentProject.name}
              </Typography>
              <Stack direction="row" spacing={3} sx={{ opacity: 1 }}>
                <Box>
                  <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.7)' }}>構造</Typography>
                  <Typography variant="body2" fontWeight="500" sx={{ color: 'white' }}>
                    {currentProject.buildingInfo.structure}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.7)' }}>規模</Typography>
                  <Typography variant="body2" fontWeight="500" sx={{ color: 'white' }}>
                    {currentProject.buildingInfo.floors}階建 / {currentProject.buildingInfo.units || 0}戸
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.7)' }}>所在地</Typography>
                  <Typography variant="body2" fontWeight="500" sx={{ color: 'white' }}>
                    {currentProject.location.address}
                  </Typography>  
                </Box>
                {currentProject.schedule?.startDate && (
                  <Box>
                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.7)' }}>着工予定</Typography>
                    <Typography variant="body2" fontWeight="500" sx={{ color: 'white' }}>
                      {new Date(currentProject.schedule.startDate).toLocaleDateString('ja-JP')}
                    </Typography>
                  </Box>
                )}
                {currentProject.schedule?.completionDate && (
                  <Box>
                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.7)' }}>竣工予定</Typography>
                    <Typography variant="body2" fontWeight="500" sx={{ color: 'white' }}>
                      {new Date(currentProject.schedule.completionDate).toLocaleDateString('ja-JP')}
                    </Typography>
                  </Box>
                )}
                {currentProject.schedule?.duration && (
                  <Box>
                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.7)' }}>工期</Typography>
                    <Typography variant="body2" fontWeight="500" sx={{ color: 'white' }}>
                      {currentProject.schedule.duration}ヶ月
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
            
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => setShowUnitPriceEditor(true)}
                startIcon={<SettingsIcon />}
                aria-label="単価設定"
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.8)',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                単価設定
              </Button>
              <Button
                variant="outlined"
                onClick={() => calculateEstimation()}
                startIcon={<RefreshIcon />}
                aria-label="見積もりを再計算する"
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.8)',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                再計算
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(`/project/${currentProject.id}/simulation`)}
                aria-label="3Dシミュレーションページへ移動"
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.8)',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                シミュレーション
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => generateEstimationPDF(currentProject, estimation, unitPrices)}
                sx={{ 
                  background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
                  color: 'white',
                  fontWeight: 600,
                  px: 3,
                  '&:hover': {
                    background: 'linear-gradient(45deg, #f7931e, #ff6b35)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 8px 25px rgba(255,107,53,0.3)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                PDF Export
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* 総額表示 - 建築デザイン事務所風 */}
        <Grid size={{ xs: 12 }}>
          <Paper 
            elevation={0}
            sx={{ 
              background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              border: '1px solid #e9ecef',
              borderRadius: 4,
              overflow: 'hidden',
              mb: 4
            }}
          >
            <Box sx={{ 
              background: 'linear-gradient(90deg, #2c3e50 0%, #34495e 100%)',
              p: 4,
              color: 'white'
            }}>
              <Stack spacing={4}>
                {/* Total Cost Section */}
                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      opacity: 1,
                      fontWeight: 400,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      fontSize: '0.875rem',
                      mb: 1,
                      color: 'rgba(255,255,255,0.95)'
                    }}
                  >
                    Total Construction Cost
                  </Typography>
                  <Typography 
                    variant="h2" 
                    sx={{ 
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      fontSize: { xs: '2rem', md: '3.5rem' },
                      color: 'white'
                    }}
                  >
                    ¥{(estimation.totalCost / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 0 })}
                    <Typography component="span" variant="h5" sx={{ opacity: 0.9, ml: 1, color: 'white' }}>
                      万円
                    </Typography>
                  </Typography>
                </Box>
                
                {/* Unit Prices Section */}
                <Box sx={{ 
                  borderTop: '1px solid rgba(255,255,255,0.1)', 
                  pt: 3 
                }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.05)', 
                        borderRadius: 2, 
                        padding: '20px 24px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <Typography variant="caption" sx={{ 
                          opacity: 0.8, 
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          mb: 1,
                          display: 'block'
                        }}>
                          延床面積あたり単価
                        </Typography>
                        <Typography variant="h4" sx={{ 
                          fontWeight: 500, 
                          color: 'white',
                          letterSpacing: '-0.01em',
                          fontSize: '1.75rem'
                        }}>
                          ¥{formatCurrency(Math.round(estimation.totalCost / (currentProject.buildingInfo.totalFloorArea || (currentProject.buildingInfo.buildingArea || 0) * (currentProject.buildingInfo.floors || 1))))}/㎡
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.05)', 
                        borderRadius: 2, 
                        padding: '20px 24px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <Typography variant="caption" sx={{ 
                          opacity: 0.8, 
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          mb: 1,
                          display: 'block'
                        }}>
                          坪単価
                        </Typography>
                        <Typography variant="h4" sx={{ 
                          fontWeight: 500, 
                          color: 'white',
                          fontSize: '1.75rem'
                        }}>
                          ¥{formatCurrency(Math.round(estimation.totalCost / ((currentProject.buildingInfo.totalFloorArea || (currentProject.buildingInfo.buildingArea || 0) * (currentProject.buildingInfo.floors || 1)) * 0.3025)))}/坪
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Schedule Information Section */}
                {(estimation.schedule?.startDate || estimation.schedule?.completionDate || estimation.schedule?.duration) && (
                  <Box sx={{ 
                    borderTop: '1px solid rgba(255,255,255,0.1)', 
                    pt: 3 
                  }}>
                    <Typography variant="caption" sx={{ 
                      opacity: 0.8, 
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      mb: 2,
                      display: 'block'
                    }}>
                      Project Schedule
                    </Typography>
                    <Grid container spacing={3}>
                      {estimation.schedule?.startDate && (
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Box sx={{ 
                            backgroundColor: 'rgba(255,255,255,0.05)', 
                            borderRadius: 2, 
                            padding: '20px 24px',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <Typography variant="caption" sx={{ 
                              opacity: 0.8, 
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              mb: 1,
                              display: 'block'
                            }}>
                              着工予定日
                            </Typography>
                            <Typography variant="h5" sx={{ 
                              fontWeight: 500, 
                              color: 'white',
                              letterSpacing: '-0.01em',
                              fontSize: '1.25rem'
                            }}>
                              {new Date(estimation.schedule.startDate).toLocaleDateString('ja-JP')}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      {estimation.schedule?.completionDate && (
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Box sx={{ 
                            backgroundColor: 'rgba(255,255,255,0.05)', 
                            borderRadius: 2, 
                            padding: '20px 24px',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <Typography variant="caption" sx={{ 
                              opacity: 0.8, 
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              mb: 1,
                              display: 'block'
                            }}>
                              竣工予定日
                            </Typography>
                            <Typography variant="h5" sx={{ 
                              fontWeight: 500, 
                              color: 'white',
                              letterSpacing: '-0.01em',
                              fontSize: '1.25rem'
                            }}>
                              {new Date(estimation.schedule.completionDate).toLocaleDateString('ja-JP')}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      {estimation.schedule?.duration && (
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Box sx={{ 
                            backgroundColor: 'rgba(255,255,255,0.05)', 
                            borderRadius: 2, 
                            padding: '20px 24px',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <Typography variant="caption" sx={{ 
                              opacity: 0.8, 
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              mb: 1,
                              display: 'block'
                            }}>
                              工期
                            </Typography>
                            <Typography variant="h5" sx={{ 
                              fontWeight: 500, 
                              color: 'white',
                              letterSpacing: '-0.01em',
                              fontSize: '1.25rem'
                            }}>
                              {estimation.schedule.duration}ヶ月
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}
              </Stack>
            </Box>
            
          </Paper>
        </Grid>


        {/* 工事内訳 - 洗練されたデザイン */}
        <Grid size={{ xs: 12 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              border: '1px solid #e9ecef',
              borderRadius: 4,
              overflow: 'hidden',
              mb: 4
            }}
          >
            {/* ヘッダー */}
            <Box sx={{ 
              background: 'linear-gradient(90deg, #f8f9fa 0%, #ffffff 100%)',
              p: 4,
              borderBottom: '1px solid #e9ecef'
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 300,
                      color: '#2c3e50',
                      letterSpacing: '-0.01em',
                      mb: 0.5
                    }}
                  >
                    Construction Cost Breakdown
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    入力データに基づくAI解析と計算根拠
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DataUsageIcon />}
                  sx={{ 
                    borderColor: '#dee2e6',
                    color: '#6c757d',
                    '&:hover': {
                      borderColor: '#adb5bd',
                      backgroundColor: 'rgba(108,117,125,0.04)'
                    }
                  }}
                >
                  詳細解析
                </Button>
              </Stack>
            </Box>
            
            {/* コスト内訳グリッド */}
            <Box sx={{ p: 4 }}>
              <Grid container spacing={3}>
                {Object.entries(estimation.breakdown).map(([key, value]) => {
                  const percentage = (value / estimation.totalCost) * 100
                  const isHighCost = percentage > 15
                  
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
                      <Box 
                        sx={{ 
                          p: 3,
                          height: '100%',
                          border: `1px solid ${isHighCost ? '#3498db' : '#e9ecef'}`,
                          borderRadius: 3,
                          backgroundColor: isHighCost ? 'rgba(52,152,219,0.02)' : '#ffffff',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                            borderColor: '#3498db'
                          }
                        }}
                      >
                        <Stack spacing={2}>
                          {/* アイコンとタイトル */}
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Box 
                              sx={{ 
                                color: isHighCost ? '#3498db' : '#6c757d',
                                '& svg': { fontSize: '1.2rem' }
                              }}
                            >
                              {getCostItemIcon(key)}
                            </Box>
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                color: '#495057',
                                fontWeight: 500,
                                letterSpacing: '0.01em'
                              }}
                            >
                              {getCostItemName(key)}
                            </Typography>
                          </Stack>
                          
                          {/* 金額 */}
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 600,
                              color: '#2c3e50',
                              fontSize: '1.1rem'
                            }}
                          >
                            ¥{(value / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万
                          </Typography>
                          
                          {/* 進行状況バーとパーセント */}
                          <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ fontWeight: 500 }}
                              >
                                構成比
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontWeight: 600,
                                  color: isHighCost ? '#3498db' : '#6c757d'
                                }}
                              >
                                {percentage.toFixed(1)}%
                              </Typography>
                            </Stack>
                            <LinearProgress 
                              variant="determinate" 
                              value={percentage} 
                              sx={{ 
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: '#f8f9fa',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 2,
                                  background: isHighCost ? 
                                    'linear-gradient(90deg, #3498db 0%, #2980b9 100%)' :
                                    'linear-gradient(90deg, #95a5a6 0%, #7f8c8d 100%)'
                                }
                              }}
                            />
                          </Box>
                          
                          {/* 計算根拠ボタン */}
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => toggleItemExpansion(key)}
                            endIcon={
                              <KeyboardArrowDownIcon 
                                sx={{ 
                                  transform: expandedItems[key] ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.3s ease'
                                }}
                              />
                            }
                            sx={{ 
                              color: '#6c757d',
                              fontWeight: 400,
                              fontSize: '0.75rem',
                              justifyContent: 'flex-start',
                              p: 0.5,
                              '&:hover': {
                                backgroundColor: 'rgba(108,117,125,0.04)'
                              }
                            }}
                          >
                            計算根拠を表示
                          </Button>
                          
                          {/* 詳細情報の展開 */}
                          {expandedItems[key] && (
                            <Box sx={{ 
                              mt: 2, 
                              p: 2, 
                              backgroundColor: '#f8f9fa',
                              borderRadius: 2,
                              border: '1px solid #e9ecef'
                            }}>
                              {(() => {
                                const details = getCalculationDetails(key, value)
                                return (
                                  <Stack spacing={2}>
                                    {/* 入力データ */}
                                    <Box>
                                      <Typography variant="caption" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                                        <DataUsageIcon sx={{ fontSize: '0.875rem', mr: 0.5 }} />
                                        使用した入力データ
                                      </Typography>
                                      <Grid container spacing={1}>
                                        {Object.entries(details.inputData).map(([dataKey, dataValue]) => (
                                          <Grid size={{ xs: 6 }} key={dataKey}>
                                            <Box sx={{ 
                                              p: 1, 
                                              backgroundColor: 'white',
                                              borderRadius: 1,
                                              border: '1px solid #dee2e6'
                                            }}>
                                              <Typography variant="caption" color="text.secondary">
                                                {dataKey}
                                              </Typography>
                                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {String(dataValue)}
                                              </Typography>
                                            </Box>
                                          </Grid>
                                        ))}
                                      </Grid>
                                    </Box>
                                    
                                    {/* 計算詳細 */}
                                    <Box>
                                      <Typography variant="caption" color="success.main" fontWeight={600} sx={{ mb: 1 }}>
                                        <CalculateIcon sx={{ fontSize: '0.875rem', mr: 0.5 }} />
                                        計算内訳
                                      </Typography>
                                      <Stack spacing={1}>
                                        {details.components.map((component: any, index: number) => (
                                          <Box 
                                            key={index}
                                            sx={{ 
                                              p: 1.5, 
                                              backgroundColor: 'white',
                                              borderRadius: 1,
                                              border: '1px solid #dee2e6'
                                            }}
                                          >
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                              <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" fontWeight="500">
                                                  {component.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                  {component.formula}
                                                </Typography>
                                              </Box>
                                              <Typography variant="body2" fontWeight={600} color="success.main">
                                                ¥{component.value.toLocaleString()}
                                              </Typography>
                                            </Stack>
                                          </Box>
                                        ))}
                                      </Stack>
                                    </Box>
                                    
                                    {/* 合計確認 */}
                                    <Box sx={{ 
                                      p: 1.5, 
                                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                      borderRadius: 1,
                                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                                    }}>
                                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2" fontWeight={600} color="primary">
                                          {getCostItemName(key)} 合計
                                        </Typography>
                                        <Typography variant="h6" fontWeight={600} color="primary">
                                          ¥{value.toLocaleString()}
                                        </Typography>
                                      </Stack>
                                    </Box>
                                  </Stack>
                                )
                              })()}
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    </Grid>
                  )
                })}
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* AI分析 */}
        <Grid size={{ xs: 12 }}>
          <Accordion defaultExpanded>
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <AutoGraphIcon color="primary" />
                <Box>
                  <Typography variant="h6">
                    AIによるコスト要因分析と最適化提案
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    詳細な分析レポートを表示
                  </Typography>
                </Box>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3,
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  maxHeight: '60vh',
                  overflow: 'auto',
                  '& h1, & h2, & h3': { 
                    color: 'primary.main', 
                    fontWeight: 500,
                    mb: 1.5,
                    fontSize: { h1: '1.25rem', h2: '1.1rem', h3: '1rem' }
                  },
                  '& p': { 
                    mb: 1.5, 
                    lineHeight: 1.6,
                    fontSize: '0.9rem'
                  },
                  '& ul, & ol': { 
                    mb: 1.5, 
                    pl: 2,
                    fontSize: '0.9rem'
                  },
                  '& hr': { 
                    my: 2, 
                    borderColor: 'divider' 
                  }
                }}
              >
                <ReactMarkdown>{estimation.aiAnalysis}</ReactMarkdown>
              </Paper>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">
                ※ この分析は、建物の設計情報、敷地の環境データ、法規制情報を総合的に解析して生成されています。
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Grid>

      </Grid>
      
      {/* 単価編集ダイアログ */}
      <UnitPriceEditor
        open={showUnitPriceEditor}
        onClose={() => setShowUnitPriceEditor(false)}
        unitPrices={unitPrices}
        onSave={(newPrices) => {
          setUnitPrices(newPrices)
          setShowUnitPriceEditor(false)
          // 新しい単価で再計算
          calculateEstimation(newPrices)
        }}
      />
    </Container>
  )
}