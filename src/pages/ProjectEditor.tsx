import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Grid,
  Paper,
  TextField,
  Typography,
  Button,
  Box,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  alpha,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import { Delete as DeleteIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import MapSelector from '@/components/MapSelector'
import { useProjectStore } from '@/store/projectStore'
import { Project, BuildingUsage, StructureType, FloorAreaDetail, UnitType } from '@/types/project'
import { projectApi } from '@/api/projectApi'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { fetchRegulationInfo, ShadowRegulation, ZoningInfo, AdministrativeGuidanceItem, checkRegulationCompliance } from '@/services/regulationService'
import { FloorAreaInput } from '@/components/FloorAreaInput'
import { searchComprehensiveInfo, RegulationInfo } from '@/api/webSearchApi'
import { Stack, Alert, Snackbar } from '@mui/material'
import { People as PeopleIcon } from '@mui/icons-material'
import { useRegulationSearch } from '@/hooks/useRegulationSearch'
import { RegulationInfoDisplay } from '@/components/RegulationInfoDisplay'
import { ZoningInfoDisplay } from '@/components/ZoningInfoDisplay'

const steps = ['敷地設定', '建物情報設定', '面積・規制情報', 'クライアント情報']

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { currentProject, updateProject, updateProjectAsync, projects, setCurrentProject, deleteProject, setError, setLoading } = useProjectStore()
  const [activeStep, setActiveStep] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [saveSnackbarOpen, setSaveSnackbarOpen] = useState(false)
  // 統合された規制情報検索フック
  const { state: regulationState, searchRegulations, debouncedSearch } = useRegulationSearch(
    currentProject,
    (updates) => debouncedUpdateProject(currentProject!.id, updates)
  )
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMapUpdateRef = useRef<boolean>(false)
  
  // バリデーション状態
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  
  // バリデーション関数
  const validateField = (fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'name':
        if (!value || value.trim().length === 0) return 'プロジェクト名は必須です'
        if (value.trim().length > 100) return 'プロジェクト名は100文字以内で入力してください'
        return ''
      
      case 'address':
        if (!value || value.trim().length === 0) return '住所は必須です'
        return ''
      
      case 'siteArea':
        if (!value) return '敷地面積は必須です'
        const siteAreaNum = Number(value)
        if (isNaN(siteAreaNum) || siteAreaNum <= 0) return '敷地面積は正の数値で入力してください'
        if (siteAreaNum > 10000) return '敷地面積が大きすぎます（10,000㎡以下）'
        return ''
      
      case 'buildingArea':
        if (!value) return '建築面積は必須です'
        const buildingAreaNum = Number(value)
        if (isNaN(buildingAreaNum) || buildingAreaNum <= 0) return '建築面積は正の数値で入力してください'
        if (currentProject?.siteInfo?.siteArea && buildingAreaNum > currentProject.siteInfo.siteArea) {
          return '建築面積は敷地面積を超えることはできません'
        }
        return ''
      
      case 'floors':
        if (!value) return '階数は必須です'
        const floorsNum = Number(value)
        if (isNaN(floorsNum) || floorsNum < 1) return '階数は1以上で入力してください'
        if (floorsNum > 50) return '階数は50階以下で入力してください'
        return ''
      
      case 'units':
        if (currentProject?.buildingInfo?.usage === '共同住宅' && value) {
          const unitsNum = Number(value)
          if (isNaN(unitsNum) || unitsNum < 1) return '戸数は1以上で入力してください'
          if (unitsNum > 1000) return '戸数は1000戸以下で入力してください'
        }
        return ''
      
      case 'maxHeight':
        if (value) {
          const heightNum = Number(value)
          if (isNaN(heightNum) || heightNum <= 0) return '高さは正の数値で入力してください'
        }
        return ''
      
      default:
        return ''
    }
  }
  
  // リアルタイムバリデーション
  const handleFieldChange = (fieldName: string, value: any, updatePath: string) => {
    const error = validateField(fieldName, value)
    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: error
    }))
    
    // プロジェクトの更新
    const updates = updatePath.split('.').reduceRight((acc, key) => ({ [key]: acc }), value)
    debouncedUpdateProject(currentProject!.id, updates)
  }

  // デバウンス付きの更新関数
  const debouncedUpdateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      // ローカル更新は即座に実行（UI応答性のため）
      updateProject(id, updates)
      
      // API更新はデバウンスして実行
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      
      autoSaveTimerRef.current = setTimeout(() => {
        updateProjectAsync(id, updates)
      }, 1000) // 1秒後にAPI更新
    },
    [updateProject, updateProjectAsync]
  )
  
  // コンポーネントアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const fetchProject = async () => {
      if (id && !currentProject) {
        try {
          // APIから詳細なプロジェクトデータを取得
          const project = await projectApi.getById(id)
          // console.log('Fetched project data:', project)
          // console.log('Parking plan:', project.parkingPlan)
          
          // location.addressがnullの場合、空文字列に修正
          if (project.location.address === null || project.location.address === undefined) {
            project.location.address = ''
          }
          
          setCurrentProject(project)
        } catch (error) {
          console.error('Failed to fetch project:', error)
          // フォールバック: ストアから取得
          const project = projects.find(p => p.id === id)
          if (project) {
            setCurrentProject(project)
          } else {
            navigate('/dashboard')
          }
        }
      }
    }
    
    fetchProject()
  }, [id]) // 依存配列を最小限に

  // 規制情報の自動検索は useRegulationSearch フック内で処理される

  // 住所変更時の規制情報自動検索
  useEffect(() => {
    if (currentProject?.location.address && currentProject.location.address.trim()) {
      // マップからの更新の場合はスキップ
      if (isMapUpdateRef.current) {
        isMapUpdateRef.current = false
        return
      }
      
      // デバウンス付き検索を実行
      debouncedSearch(currentProject.location.address)
    }
  }, [currentProject?.location.address, debouncedSearch])

  /* 削除予定の古い実装
        const cacheKey = currentProject.location.address.trim()
        
        // キャッシュチェック
        if (regulationDataCache.has(cacheKey)) {
          console.log('🗄️ キャッシュから規制情報を取得:', cacheKey)
          const cachedData = regulationDataCache.get(cacheKey)
          setShadowRegulation(cachedData.shadow)
          setZoningInfo(cachedData.zoning)
          setAdministrativeGuidanceItems(cachedData.administrativeGuidance)
          setWebSearchResults(cachedData.webSearchResults)
          return
        }
        
        // すでに行政指導情報が保存されているかチェック
        const hasExistingAdminGuidance = 
          (currentProject.siteInfo.administrativeGuidanceDetails && 
           currentProject.siteInfo.administrativeGuidanceDetails.length > 0) ||
          Object.keys(currentProject.siteInfo.administrativeGuidance || {}).some(
            key => currentProject.siteInfo.administrativeGuidance[key] === true
          );
        
        // すでに日影規制情報が保存されているかチェック
        const hasExistingShadowRegulation = 
          currentProject.siteInfo.shadowRegulation && 
          currentProject.siteInfo.shadowRegulation.targetArea && 
          currentProject.siteInfo.shadowRegulation.targetArea.trim() !== '';
        
        // 日影規制情報が保存されている場合は、それを使用
        if (hasExistingShadowRegulation) {
          console.log('📌 既存の日影規制情報が見つかりました。');
          setShadowRegulation({
            targetArea: currentProject.siteInfo.shadowRegulation.targetArea,
            targetBuildings: currentProject.siteInfo.shadowRegulation.targetBuilding,
            measurementHeight: String(currentProject.siteInfo.shadowRegulation.measurementHeight),
            measurementTime: currentProject.siteInfo.shadowRegulation.measurementTime,
            range5to10m: String(currentProject.siteInfo.shadowRegulation.allowedShadowTime5to10m),
            rangeOver10m: String(currentProject.siteInfo.shadowRegulation.allowedShadowTimeOver10m),
            isLoading: false
          });
        } else {
          // 初期値は設定せず、AI検索の結果を待つ
          setShadowRegulation({
            targetArea: '',
            targetBuildings: '',
            measurementHeight: '',
            measurementTime: '',
            range5to10m: '',
            rangeOver10m: '',
            isLoading: true
          });
        }
        
        // 初期値は設定せず、AI検索の結果を待つ
        setZoningInfo({
          zoningType: '',
          buildingCoverageRatio: 0,
          floorAreaRatio: 0,
          heightLimit: '',
          heightDistrict: ''
        });
        
        // すでに行政指導情報と日影規制情報が保存されている場合は、AI検索をスキップ
        if (hasExistingAdminGuidance && hasExistingShadowRegulation) {
          console.log('📌 既存の規制情報が見つかりました。AI検索をスキップします。');
          setIsWebSearchLoading(false);
          return;
        }
        
        // Initialize empty administrative guidance - let the API determine these
        setAdministrativeGuidanceItems([]);
        setIsWebSearchLoading(true);
        
        try {
          // Web検索を最優先で実行し、フォールバックとしてローカルデータを使用
          
          // 住所から都道府県と市区町村を抽出
          const addressParts = currentProject.location.address.split(/\s+/)
          let prefecture = ''
          let city = ''

          const prefecturePattern = /(.+[都道府県])/
          const prefectureMatch = currentProject.location.address.match(prefecturePattern)
          
          if (prefectureMatch) {
            prefecture = prefectureMatch[1]
            const cityPattern = new RegExp(`${prefecture}(.+?[市区町村])`)
            const cityMatch = currentProject.location.address.match(cityPattern)
            if (cityMatch) {
              city = cityMatch[1]
            }
          }

          if (!prefecture) prefecture = '東京都'
          if (!city) city = '世田谷区'

          // 複数のWeb検索を並列実行（非同期）
          const searchQueries = [
            { type: 'urban', query: `${prefecture} ${city} 都市計画 用途地域 建ぺい率 容積率 高度地区` },
            { type: 'sunlight', query: `${prefecture} ${city} 日影規制 条例 建築基準法` },
            { type: 'admin', query: `${prefecture} ${city} 建築指導要綱 行政指導` }
          ]
          
          // 各検索を並列実行し、結果を段階的に反映
          console.log('🔍 Web検索開始:', { prefecture, city, address: currentProject.location.address });
          
          const searchPromises = searchQueries.map(async ({ type, query }) => {
            console.log(`🔍 ${type}検索開始:`, query);
            try {
              const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/websearch/regulations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, prefecture, city })
              })
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
              }
              
              const result = await response.json()
              console.log(`✅ ${type}検索完了:`, result);
              return { type, result }
            } catch (error) {
              console.warn(`❌ ${type}検索エラー:`, error)
              return { type, result: { success: false, error: error instanceof Error ? error.message : String(error) } }
            }
          })
          
          // 並列検索を開始し、結果が得られ次第段階的に更新
          const parallelResults = await Promise.allSettled(searchPromises)
          console.log('🔍 並列検索結果:', parallelResults);
          
          let updatedShadow = {
              targetArea: '',
              targetBuildings: '',
              measurementHeight: '',
              measurementTime: '',
              range5to10m: '',
              rangeOver10m: '',
              isLoading: false
            }
            let updatedZoning = {
              zoningType: '',
              buildingCoverageRatio: 0,
              floorAreaRatio: 0,
              heightLimit: '',
              heightDistrict: ''
            }
            let updatedGuidance: AdministrativeGuidanceItem[] = []
            
            parallelResults.forEach(({ status, value }) => {
              if (status === 'fulfilled' && value.result.success && value.result.data) {
                const { type, result } = value
                
                switch (type) {
                  case 'urban':
                    if (result.data.urbanPlanning) {
                      console.log('🔍 Web検索結果 - 都市計画情報:', result.data.urbanPlanning)
                      updatedZoning = {
                        zoningType: result.data.urbanPlanning.useDistrict || updatedZoning.zoningType,
                        buildingCoverageRatio: parseFloat(result.data.urbanPlanning.buildingCoverageRatio?.match(/\d+/)?.[0] || String(updatedZoning.buildingCoverageRatio)),
                        floorAreaRatio: parseFloat(result.data.urbanPlanning.floorAreaRatio?.match(/\d+/)?.[0] || String(updatedZoning.floorAreaRatio)),
                        heightLimit: result.data.urbanPlanning.heightRestriction || updatedZoning.heightLimit,
                        heightDistrict: result.data.urbanPlanning.heightDistrict || updatedZoning.heightDistrict
                      }
                      setZoningInfo(updatedZoning)
                      console.log('✅ 都市計画情報を段階的更新:', updatedZoning)
                    }
                    break
                    
                  case 'sunlight':
                    if (result.data.sunlightRegulation) {
                      updatedShadow = {
                        ...updatedShadow,
                        targetArea: result.data.sunlightRegulation.targetArea || updatedShadow.targetArea,
                        targetBuildings: result.data.sunlightRegulation.targetBuildings || updatedShadow.targetBuildings,
                        measurementHeight: result.data.sunlightRegulation.measurementHeight || updatedShadow.measurementHeight,
                        measurementTime: result.data.sunlightRegulation.timeRange || updatedShadow.measurementTime,
                        range5to10m: result.data.sunlightRegulation.shadowTimeLimit || updatedShadow.range5to10m,
                        isLoading: false
                      }
                      setShadowRegulation(updatedShadow)
                      console.log('✅ 日影規制情報を段階的更新')
                    }
                    break
                    
                  case 'admin':
                    if (result.data.administrativeGuidance && Array.isArray(result.data.administrativeGuidance)) {
                      const newGuidanceItems = result.data.administrativeGuidance.map((guidance: string | any, index: number) => {
                        // guidanceが文字列の場合とオブジェクトの場合を処理
                        if (typeof guidance === 'string') {
                          return {
                            id: `guidance-${Date.now()}-${index}`,
                            name: guidance,
                            isRequired: false
                          }
                        } else if (typeof guidance === 'object' && guidance !== null) {
                          return {
                            id: `guidance-${Date.now()}-${index}`,
                            name: guidance.name || String(guidance),
                            description: guidance.description || guidance.details || '',
                            isRequired: false
                          }
                        }
                        return {
                          id: `guidance-${Date.now()}-${index}`,
                          name: String(guidance),
                          isRequired: false
                        }
                      })
                      updatedGuidance = [...updatedGuidance, ...newGuidanceItems]
                      setAdministrativeGuidanceItems(updatedGuidance)
                      console.log('✅ 行政指導情報を段階的更新')
                    }
                    break
                } 
              } else if (status === 'fulfilled' && !value.result.success) {
                // エラー時の処理
                const { type, result } = value
                if (result.data?.error) {
                  console.log(`⚠️ ${type}情報: ${result.data.error}`)
                  switch (type) {
                    case 'urban':
                      setZoningInfo(prev => ({ ...prev, error: result.data.error }))
                      break
                    case 'sunlight':
                      setShadowRegulation(prev => ({ ...prev, error: result.data.error }))
                      break
                    case 'admin':
                      // 行政指導のエラー処理
                      break
                  }
                }
              }
            })
            
            // 全体のWeb検索結果をまとめて保存
            const combinedResults = parallelResults.reduce((acc, { status, value }) => {
              if (status === 'fulfilled' && value.result.success) {
                Object.assign(acc, value.result.data)
              }
              return acc
            }, {})
            
            if (Object.keys(combinedResults).length > 0) {
              setWebSearchResults({
                urbanPlanning: combinedResults.urbanPlanning,
                sunlightRegulation: combinedResults.sunlightRegulation,
                administrativeGuidance: combinedResults.administrativeGuidance,
                searchedAt: new Date().toISOString()
              })
            }
          
          // 並列検索が成功した場合はそれを使用
          let hasSuccessfulResults = parallelResults.some(({ status, value }) => 
            status === 'fulfilled' && value.result.success && value.result.data
          );
          
          // 並列検索のフォールバック（従来の統合検索）
          const fallbackSearch = async () => {
            try {
              const webSearchResult = await searchComprehensiveInfo(currentProject.location.address, prefecture, city)
              return webSearchResult
            } catch (error) {
              console.warn('フォールバック検索エラー:', error)
              return { success: false, error: error.message }
            }
          }
          
          // 並列検索が成功した場合はそのデータを使用、失敗した場合のみフォールバック検索を実行
          let mainSearchResult = { success: false, data: null };
          let regulationData = {
            shadow: {
              targetArea: '',
              targetBuildings: '',
              measurementHeight: '',
              measurementTime: '',
              range5to10m: '',
              rangeOver10m: '',
              isLoading: false
            },
            zoning: {
              zoningType: '',
              buildingCoverageRatio: 0,
              floorAreaRatio: 0,
              heightLimit: '',
              heightDistrict: ''
            },
            administrativeGuidance: [] as AdministrativeGuidanceItem[]
          }
          
          // 並列検索が成功した場合はその結果を使用
          if (hasSuccessfulResults) {
            // 並列検索の結果はすでに各状態に設定済み
            regulationData = {
              shadow: updatedShadow,
              zoning: updatedZoning,
              administrativeGuidance: updatedGuidance
            }
            console.log('✅ 並列検索の結果を使用');
          } else {
            // 並列検索が失敗した場合のみフォールバック検索を実行
            console.log('⚠️ 並列検索が失敗したため、フォールバック検索を実行');
            mainSearchResult = await fallbackSearch();
          }
          
          if (!hasSuccessfulResults && mainSearchResult.success && mainSearchResult.data) {
            regulationData = {
              shadow: {
                targetArea: mainSearchResult.data.sunlightRegulation?.targetArea || '',
                targetBuildings: mainSearchResult.data.sunlightRegulation?.targetBuildings || '',
                measurementHeight: mainSearchResult.data.sunlightRegulation?.measurementHeight || '',
                measurementTime: mainSearchResult.data.sunlightRegulation?.timeRange || '',
                range5to10m: mainSearchResult.data.sunlightRegulation?.shadowTimeLimit || '',
                rangeOver10m: mainSearchResult.data.sunlightRegulation?.rangeOver10m || '',
                isLoading: false
              },
              zoning: {
                zoningType: mainSearchResult.data.urbanPlanning?.useDistrict || '',
                buildingCoverageRatio: parseFloat(mainSearchResult.data.urbanPlanning?.buildingCoverageRatio?.match(/\d+/)?.[0] || '0'),
                floorAreaRatio: parseFloat(mainSearchResult.data.urbanPlanning?.floorAreaRatio?.match(/\d+/)?.[0] || '0'),
                heightLimit: mainSearchResult.data.urbanPlanning?.heightRestriction || '',
                heightDistrict: mainSearchResult.data.urbanPlanning?.heightDistrict || ''
              },
              administrativeGuidance: (mainSearchResult.data.administrativeGuidance || []).map((item: string | any, index: number) => {
                if (typeof item === 'string') {
                  return {
                    id: `fallback-guidance-${Date.now()}-${index}`,
                    name: item,
                    isRequired: false
                  }
                } else if (typeof item === 'object' && item !== null) {
                  return {
                    id: `fallback-guidance-${Date.now()}-${index}`,
                    name: item.name || String(item),
                    description: item.description || item.details || '',
                    isRequired: false
                  }
                }
                return {
                  id: `fallback-guidance-${Date.now()}-${index}`,
                  name: String(item),
                  isRequired: false
                }
              })
            }
          }
          
          console.log('📊 最終的な規制データ:', regulationData);
          
          // 並列検索の結果を使用する場合はすでに状態が設定されているのでスキップ
          if (!hasSuccessfulResults) {
            setShadowRegulation(regulationData.shadow)
            setZoningInfo(regulationData.zoning)
            if (Array.isArray(regulationData.administrativeGuidance)) {
              setAdministrativeGuidanceItems(regulationData.administrativeGuidance)
            }
          }
          console.log('✅ 規制情報の設定完了');
          
          // 検索完了をマーク
          setIsWebSearchLoading(false);
          
          // Web検索結果の処理
          let webSearchResults = {}
          if (mainSearchResult.success && mainSearchResult.data) {
            webSearchResults = {
              urbanPlanning: mainSearchResult.data.urbanPlanning,
              sunlightRegulation: mainSearchResult.data.sunlightRegulation,
              administrativeGuidance: mainSearchResult.data.administrativeGuidance,
              searchedAt: mainSearchResult.data.searchedAt
            }
            setWebSearchResults(webSearchResults)
            console.log('✅ Web検索成功、規制情報を即座に反映')
          } else {
            setWebSearchError(mainSearchResult.error || 'Web検索に失敗しました')
            console.log('⚠️ Web検索失敗、ローカルデータにフォールバック')
          }
          
          // 取得した都市計画情報、日影規制情報、行政指導詳細を自動でプロジェクトに反映
          if (regulationData.zoning.zoningType || regulationData.administrativeGuidance.length > 0 || regulationData.shadow.targetArea) {
            const updateData: any = {
              siteInfo: { 
                ...currentProject.siteInfo, 
                zoningType: regulationData.zoning.zoningType || currentProject.siteInfo.zoningType,
                heightDistrict: regulationData.zoning.heightDistrict || '',
                buildingCoverage: regulationData.zoning.buildingCoverageRatio || 0,
                floorAreaRatio: regulationData.zoning.floorAreaRatio || 0,
                heightLimit: regulationData.zoning.heightLimit || '',
                // 行政指導の詳細情報を保存（有効なデータがある場合のみ）
                administrativeGuidanceDetails: Array.isArray(regulationData.administrativeGuidance) && regulationData.administrativeGuidance.length > 0
                  ? regulationData.administrativeGuidance 
                  : currentProject.siteInfo.administrativeGuidanceDetails || []
              }
            };
            
            // 日影規制情報が有効な場合のみ保存
            if (regulationData.shadow.targetArea && regulationData.shadow.targetArea.trim() !== '') {
              updateData.siteInfo.shadowRegulation = {
                targetArea: regulationData.shadow.targetArea,
                targetBuilding: regulationData.shadow.targetBuildings,
                measurementHeight: parseFloat(regulationData.shadow.measurementHeight) || 0,
                measurementTime: regulationData.shadow.measurementTime,
                allowedShadowTime5to10m: parseFloat(regulationData.shadow.range5to10m) || 0,
                allowedShadowTimeOver10m: parseFloat(regulationData.shadow.rangeOver10m) || 0
              };
            }
            
            debouncedUpdateProject(currentProject.id, updateData);
          }
          
          // データをキャッシュに保存
          const cacheData = {
            shadow: regulationData.shadow,
            zoning: regulationData.zoning,
            administrativeGuidance: regulationData.administrativeGuidance,
            webSearchResults
          }
          setRegulationDataCache(prev => new Map(prev).set(cacheKey, cacheData))
          
          console.log('✅ 規制情報とWeb検索を完了しキャッシュに保存:', cacheKey)
        } catch (error) {
          console.error('規制情報の取得に失敗しました:', error)
          setShadowRegulation(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: error instanceof Error ? error.message : '規制情報の取得に失敗しました'
          }))
          setWebSearchError(error instanceof Error ? error.message : 'Web検索でエラーが発生しました')
        } finally {
          setIsWebSearchLoading(false)
        }
      }
      
        fetchRegulations()
      }, 3000) // 3秒のデバウンス
    }
    
    // クリーンアップ関数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [currentProject?.id, currentProject?.location.address])
  */

  /* Web検索を実行する関数 - 古い実装
  const performWebSearch = async (address: string) => {
    try {
      setIsWebSearchLoading(true)
      setWebSearchError(null)

      // 住所から都道府県と市区町村を抽出（簡易的な実装）
      const addressParts = address.split(/\s+/)
      let prefecture = ''
      let city = ''

      // 都道府県の判定
      const prefectures = ['東京都', '大阪府', '京都府', '北海道']
      const prefecturePattern = /(.+[都道府県])/
      const prefectureMatch = address.match(prefecturePattern)
      
      if (prefectureMatch) {
        prefecture = prefectureMatch[1]
        
        // 市区町村の判定
        const cityPattern = new RegExp(`${prefecture}(.+?[市区町村])`)
        const cityMatch = address.match(cityPattern)
        if (cityMatch) {
          city = cityMatch[1]
        }
      }

      // デフォルト値の設定
      if (!prefecture) {
        prefecture = '東京都' // デフォルト
      }
      if (!city) {
        city = '世田谷区' // デフォルト
      }

      console.log(`🔍 Web search for: ${prefecture} ${city} ${address}`)

      const result = await searchComprehensiveInfo(address, prefecture, city)
      
      if (result.success && result.data) {
        setWebSearchResults({
          urbanPlanning: result.data.urbanPlanning,
          sunlightRegulation: result.data.sunlightRegulation,
          administrativeGuidance: result.data.administrativeGuidance,
          searchedAt: result.data.searchedAt
        })
        
        console.log('🎉 Web search results:', result.data)
      } else {
        setWebSearchError(result.error || 'Web検索に失敗しました')
      }
    } catch (error) {
      console.error('Web search error:', error)
      setWebSearchError(error instanceof Error ? error.message : 'Web検索でエラーが発生しました')
    } finally {
      setIsWebSearchLoading(false)
    }
  }
  */

  // 建物情報が変更されたときに規制適合性をチェック
  useEffect(() => {
    if (currentProject && regulationState.shadowRegulation.data && !regulationState.shadowRegulation.isLoading) {
      // 新しい検索フックのデータ構造に対応
      const shadowRegulationOld = {
        targetArea: regulationState.shadowRegulation.data.targetArea,
        targetBuildings: regulationState.shadowRegulation.data.targetBuildings,
        measurementHeight: regulationState.shadowRegulation.data.measurementHeight,
        measurementTime: regulationState.shadowRegulation.data.measurementTime,
        range5to10m: regulationState.shadowRegulation.data.range5to10m,
        rangeOver10m: regulationState.shadowRegulation.data.rangeOver10m,
        isLoading: false
      }
      const compliance = checkRegulationCompliance(currentProject.buildingInfo, shadowRegulationOld)
      // 適合性結果をコンソールに出力（実際の実装では状態管理や通知で表示）
      if (compliance.warnings.length > 0) {
        console.log('日影規制警告:', compliance.warnings)
      }
      if (compliance.violations.length > 0) {
        console.error('日影規制違反:', compliance.violations)
      }
    }
  }, [currentProject?.buildingInfo, regulationState.shadowRegulation])

  // Auto-save functionality
  useEffect(() => {
    if (currentProject) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      
      // Set new timer for auto-save after 2 seconds of no changes
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          await projectApi.update(currentProject.id, currentProject)
          // console.log('自動保存しました')
        } catch (error) {
          console.error('自動保存エラー:', error)
        }
      }, 2000)
    }
    
    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [currentProject])

  if (!currentProject) {
    return null
  }

  const handleNext = async () => {
    // 保存中の更新があればすぐに実行
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      await updateProjectAsync(currentProject.id, { updatedAt: new Date() })
    }
    
    // 次のステップへ進む
    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = async () => {
    // 保存中の更新があればすぐに実行
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      await updateProjectAsync(currentProject.id, { updatedAt: new Date() })
    }
    
    // 前のステップへ戻る
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleSave = async () => {
    if (!currentProject) return
    
    try {
      // Update the timestamp
      debouncedUpdateProject(currentProject.id, { updatedAt: new Date() })
      
      // Save to backend
      await projectApi.update(currentProject.id, currentProject)
      
      // Show success message
      console.log('プロジェクトを保存しました')
      setSaveSnackbarOpen(true)
      
      // ダッシュボードに戻らず、現在の画面に留まる
      // navigate('/dashboard')
    } catch (error) {
      console.error('保存エラー:', error)
      setError('プロジェクトの保存に失敗しました')
    }
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!currentProject) return

    setIsDeleting(true)
    try {
      await projectApi.delete(currentProject.id)
      deleteProject(currentProject.id)
      navigate('/dashboard')
    } catch (error) {
      console.error('プロジェクトの削除に失敗しました:', error)
      // TODO: エラー通知を表示
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Paper sx={{ 
            p: { xs: 3, md: 4 }, 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
          }}>
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                mb: 3, 
                fontWeight: 700,
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                color: 'primary.main',
              }}
            >
              敷地設定
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: { xs: 3, md: 4 } }}>
              {/* 地図セクション */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    mb: 3, 
                    fontWeight: 600,
                    color: 'primary.main',
                  }}
                >
                  敷地の位置
                </Typography>
                <Box sx={{ 
                  overflow: 'hidden', 
                  borderRadius: 3,
                  height: isMobile ? '300px' : '600px',
                  border: `1px solid ${theme.palette.grey[200]}`,
                }}>
                  <Box sx={{ 
                    height: '100%',
                    position: 'relative',
                    '& .mapboxgl-canvas': {
                      borderRadius: '12px'
                    },
                    '& .mapboxgl-ctrl-group': {
                      borderRadius: '8px !important',
                      overflow: 'hidden',
                    }
                  }}>
                    <MapSelector
                      location={currentProject.location}
                      onLocationChange={(location) => {
                        console.log('ProjectEditor: Received location change from map:', location)
                        // マップからの更新フラグを設定
                        isMapUpdateRef.current = true
                        debouncedUpdateProject(currentProject.id, { location })
                      }}
                      enablePolygon
                    />
                  </Box>
                </Box>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ mt: 2, textAlign: 'center' }}
                >
                  地図上をクリックまたは検索ボックスで場所を指定してください
                </Typography>
              </Box>

              {/* 敷地情報フォーム */}
              <Box sx={{ flex: '0 0 auto', width: { xs: '100%', lg: '320px' } }}>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    mb: 3, 
                    fontWeight: 600,
                    color: 'primary.main',
                  }}
                >
                  敷地情報
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    fullWidth
                    label="住所"
                    value={currentProject?.location?.address || ''}
                    onChange={(e) => {
                      handleFieldChange('address', e.target.value, 'location.address')
                    }}
                    placeholder="例：東京都世田谷区太子堂1-1-1"
                    helperText={validationErrors.address || "地図上でクリックすると自動入力されます"}
                    error={!!validationErrors.address}
                    variant="outlined"
                  />
                  
                  <TextField
                    fullWidth
                    label="地目"
                    value={currentProject.siteInfo.landType ?? ''}
                    onChange={(e) => {
                      // console.log('Updating landType to:', e.target.value)
                      debouncedUpdateProject(currentProject.id, {
                        siteInfo: { ...currentProject.siteInfo, landType: e.target.value },
                      })
                    }}
                    placeholder="例：宅地、雑種地、田、畑など"
                    helperText="土地の種類を入力してください"
                    variant="outlined"
                  />
                  
                  <TextField
                    fullWidth
                    label="敷地面積 (㎡)"
                    type="number"
                    value={currentProject.siteInfo.siteArea ? currentProject.siteInfo.siteArea.toString() : ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : Number(e.target.value)
                      handleFieldChange('siteArea', value, 'siteInfo.siteArea')
                    }}
                    placeholder="150"
                    helperText={validationErrors.siteArea || "敷地全体の面積"}
                    error={!!validationErrors.siteArea}
                    variant="outlined"
                  />
                  
                  <TextField
                    fullWidth
                    label="有効敷地面積 (㎡)"
                    type="number"
                    value={currentProject.siteInfo.effectiveSiteArea ? currentProject.siteInfo.effectiveSiteArea.toString() : ''}
                    onChange={(e) => {
                      // console.log('Updating effectiveSiteArea to:', e.target.value)
                      const value = e.target.value === '' ? null : Number(e.target.value)
                      debouncedUpdateProject(currentProject.id, {
                        siteInfo: { ...currentProject.siteInfo, effectiveSiteArea: value },
                      })
                    }}
                    placeholder="140"
                    helperText="建物が建築可能な面積"
                    variant="outlined"
                  />
                </Box>
                
                {/* プロジェクトスケジュール */}
                <Box sx={{ mt: 4 }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{ 
                      mb: 3, 
                      fontWeight: 600,
                      color: 'primary.main',
                    }}
                  >
                    プロジェクトスケジュール
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      fullWidth
                      label="着工予定日"
                      type="date"
                      value={currentProject.schedule?.startDate 
                        ? new Date(currentProject.schedule.startDate).toISOString().split('T')[0] 
                        : ''}
                      onChange={(e) => {
                        const newDate = e.target.value ? new Date(e.target.value) : undefined
                        debouncedUpdateProject(currentProject.id, {
                          schedule: { 
                            ...currentProject.schedule, 
                            startDate: newDate 
                          },
                        })
                        // 工期を自動計算
                        if (newDate && currentProject.schedule?.completionDate) {
                          const monthsDiff = Math.round(
                            (new Date(currentProject.schedule.completionDate).getTime() - newDate.getTime()) 
                            / (1000 * 60 * 60 * 24 * 30)
                          )
                          debouncedUpdateProject(currentProject.id, {
                            schedule: { 
                              ...currentProject.schedule,
                              startDate: newDate,
                              duration: monthsDiff
                            },
                          })
                        }
                      }}
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                    />
                    
                    <TextField
                      fullWidth
                      label="竣工予定日"
                      type="date"
                      value={currentProject.schedule?.completionDate 
                        ? new Date(currentProject.schedule.completionDate).toISOString().split('T')[0] 
                        : ''}
                      onChange={(e) => {
                        const newDate = e.target.value ? new Date(e.target.value) : undefined
                        debouncedUpdateProject(currentProject.id, {
                          schedule: { 
                            ...currentProject.schedule, 
                            completionDate: newDate 
                          },
                        })
                        // 工期を自動計算
                        if (currentProject.schedule?.startDate && newDate) {
                          const monthsDiff = Math.round(
                            (newDate.getTime() - new Date(currentProject.schedule.startDate).getTime()) 
                            / (1000 * 60 * 60 * 24 * 30)
                          )
                          debouncedUpdateProject(currentProject.id, {
                            schedule: { 
                              ...currentProject.schedule,
                              completionDate: newDate,
                              duration: monthsDiff
                            },
                          })
                        }
                      }}
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                    />
                    
                    <TextField
                      fullWidth
                      label="工期"
                      value={currentProject.schedule?.duration 
                        ? `${currentProject.schedule.duration}ヶ月` 
                        : ''}
                      disabled
                      helperText="着工日と竣工日から自動計算されます"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
            
            {/* ナビゲーションボタン */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 2 : 0,
              mt: 4,
              pt: 3,
              borderTop: `1px solid ${theme.palette.grey[200]}`,
            }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                  order: isMobile ? 2 : 1,
                }}
              >
                戻る
              </Button>
              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                flexDirection: isMobile ? 'column' : 'row',
                order: isMobile ? 1 : 2,
              }}>
                <Button 
                  onClick={handleSave} 
                  variant="outlined"
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 3,
                  }}
                >
                  保存
                </Button>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/project/${currentProject.id}/simulation`)}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
                    }}
                  >
                    シミュレーションへ
                  </Button>
                ) : (
                  <Button 
                    variant="contained" 
                    onClick={handleNext}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
                    }}
                  >
                    次へ
                  </Button>
                )}
              </Box>
            </Box>
            
          </Paper>
        )

      case 1:
        return (
          <Paper sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              建物情報設定
            </Typography>
            
            {/* 建物基本情報アコーディオン */}
            <Accordion defaultExpanded sx={{ mb: 2 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  bgcolor: 'grey.50',
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  建物基本情報
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, color: 'primary.main', fontWeight: 500 }}>
                      建物概要
                    </Typography>
                <FormControl fullWidth margin="normal">
                  <InputLabel>建築用途</InputLabel>
                  <Select
                    value={currentProject.buildingInfo.usage ?? ''}
                    label="建築用途"
                    onChange={(e) =>
                      debouncedUpdateProject(currentProject.id, {
                        buildingInfo: { 
                          ...currentProject.buildingInfo, 
                          usage: e.target.value as BuildingUsage 
                        },
                      })
                    }
                  >
                    <MenuItem value="共同住宅">共同住宅</MenuItem>
                    <MenuItem value="専用住宅">専用住宅</MenuItem>
                    <MenuItem value="商業施設">商業施設</MenuItem>
                    <MenuItem value="オフィス">オフィス</MenuItem>
                    <MenuItem value="その他">その他</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <InputLabel>構造</InputLabel>
                  <Select
                    value={currentProject.buildingInfo.structure ?? ''}
                    label="構造"
                    onChange={(e) =>
                      debouncedUpdateProject(currentProject.id, {
                        buildingInfo: { 
                          ...currentProject.buildingInfo, 
                          structure: e.target.value as StructureType 
                        },
                      })
                    }
                  >
                    <MenuItem value="壁式鉄筋コンクリート造">壁式鉄筋コンクリート造</MenuItem>
                    <MenuItem value="木造軸組工法">木造軸組工法</MenuItem>
                    <MenuItem value="鉄骨造">鉄骨造</MenuItem>
                    <MenuItem value="その他">その他</MenuItem>
                  </Select>
                </FormControl>
                {currentProject.buildingInfo.structure === 'その他' && (
                  <TextField
                    fullWidth
                    label="構造（その他）の詳細"
                    placeholder="構造の詳細を入力してください（例：プレキャストコンクリート造、CLT構造等）"
                    multiline
                    rows={2}
                    margin="normal"
                    value={currentProject.buildingInfo.structureDetail ?? ''}
                    onChange={(e) =>
                      debouncedUpdateProject(currentProject.id, {
                        buildingInfo: { 
                          ...currentProject.buildingInfo, 
                          structureDetail: e.target.value 
                        },
                      })
                    }
                  />
                )}
                <TextField
                  fullWidth
                  label="階数"
                  type="number"
                  value={currentProject.buildingInfo.floors?.toString() ?? ''}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 0
                    handleFieldChange('floors', value, 'buildingInfo.floors')
                  }}
                  onFocus={(e) => e.target.select()}
                  error={!!validationErrors.floors}
                  helperText={validationErrors.floors || "建物の階数を入力してください"}
                  margin="normal"
                />
                {currentProject.buildingInfo.usage === '共同住宅' && (
                  <TextField
                    fullWidth
                    label="戸数"
                    type="number"
                    value={currentProject.buildingInfo.units?.toString() ?? ''}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0
                      handleFieldChange('units', value, 'buildingInfo.units')
                    }}
                    onFocus={(e) => e.target.select()}
                    error={!!validationErrors.units}
                    helperText={validationErrors.units || "共同住宅の戸数を入力してください"}
                    margin="normal"
                  />
                )}
                <TextField
                  fullWidth
                  label="最高高さ (mm)"
                  type="number"
                  value={currentProject.buildingInfo.maxHeight?.toString() ?? ''}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 0
                    handleFieldChange('maxHeight', value, 'buildingInfo.maxHeight')
                  }}
                  onFocus={(e) => e.target.select()}
                  error={!!validationErrors.maxHeight}
                  helperText={validationErrors.maxHeight || "建物の最高高さ（任意）"}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="基礎高さ (mm)"
                  type="number"
                  value={currentProject.buildingInfo.foundationHeight?.toString() ?? ''}
                  onChange={(e) =>
                    debouncedUpdateProject(currentProject.id, {
                      buildingInfo: { 
                        ...currentProject.buildingInfo, 
                        foundationHeight: Number(e.target.value) || 0
                      },
                    })
                  }
                  onFocus={(e) => e.target.select()}
                  margin="normal"
                />
              </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, color: 'primary.main', fontWeight: 500 }}>
                      面積情報
                    </Typography>
                <TextField
                  fullWidth
                  label="建築面積 (㎡)"
                  type="number"
                  value={currentProject.buildingInfo.buildingArea !== null ? currentProject.buildingInfo.buildingArea.toString() : ''}
                  onChange={(e) => {
                    const newValue = e.target.value === '' ? null : Number(e.target.value)
                    handleFieldChange('buildingArea', newValue, 'buildingInfo.buildingArea')
                  }}
                  onFocus={(e) => e.target.select()}
                  error={!!validationErrors.buildingArea}
                  helperText={validationErrors.buildingArea || "建物が占める敷地面積"}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="延床面積 (㎡)"
                  type="number"
                  value={currentProject.buildingInfo.totalFloorArea?.toString() ?? ''}
                  onChange={(e) =>
                    debouncedUpdateProject(currentProject.id, {
                      buildingInfo: { 
                        ...currentProject.buildingInfo, 
                        totalFloorArea: Number(e.target.value) || 0
                      },
                    })
                  }
                  onFocus={(e) => e.target.select()}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="容積対象面積 (㎡)"
                  type="number"
                  value={currentProject.buildingInfo.effectiveArea !== null ? currentProject.buildingInfo.effectiveArea.toString() : ''}
                  onChange={(e) =>
                    debouncedUpdateProject(currentProject.id, {
                      buildingInfo: { 
                        ...currentProject.buildingInfo, 
                        effectiveArea: e.target.value === '' ? null : Number(e.target.value)
                      },
                    })
                  }
                  onFocus={(e) => e.target.select()}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="施工面積 (㎡)"
                  type="number"
                  value={currentProject.buildingInfo.constructionArea !== null ? currentProject.buildingInfo.constructionArea.toString() : ''}
                  onChange={(e) =>
                    debouncedUpdateProject(currentProject.id, {
                      buildingInfo: { 
                        ...currentProject.buildingInfo, 
                        constructionArea: e.target.value === '' ? null : Number(e.target.value)
                      },
                    })
                  }
                  onFocus={(e) => e.target.select()}
                  margin="normal"
                />
                  </Grid>
                </Grid>
                
                {/* 特記事項 */}
                <TextField
                  fullWidth
                  label="特記事項"
                  multiline
                  rows={4}
                  value={currentProject.specialNotes ?? ''}
                  onChange={(e) =>
                    debouncedUpdateProject(currentProject.id, {
                      specialNotes: e.target.value,
                    })
                  }
                  margin="normal"
                  placeholder="例：敷地の面積・形状・方位については実測の必要があります、関係官庁との打合せは未了です"
                  helperText="建築計画に関する注意事項や補足説明を記入"
                  sx={{ mt: 3 }}
                />
              </AccordionDetails>
            </Accordion>
            
            {/* 詳細面積・住戸情報アコーディオン */}
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  bgcolor: 'grey.50',
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  詳細面積・住戸情報
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FloorAreaInput
                  buildingInfo={currentProject.buildingInfo}
                  onFloorDetailsChange={(floorDetails: FloorAreaDetail[]) => {
                    debouncedUpdateProject(currentProject.id, {
                      buildingInfo: {
                        ...currentProject.buildingInfo,
                        floorDetails
                      }
                    })
                  }}
                  onUnitTypesChange={(unitTypes: UnitType[]) => {
                    debouncedUpdateProject(currentProject.id, {
                      buildingInfo: {
                        ...currentProject.buildingInfo,
                        unitTypes
                      }
                    })
                  }}
                />
              </AccordionDetails>
            </Accordion>
            
            {/* 駐車場・駐輪場・緑地計画アコーディオン */}
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  bgcolor: 'grey.50',
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  駐車場・駐輪場・緑地計画
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      label="駐車場台数"
                      type="number"
                      value={currentProject.parkingPlan?.parkingSpaces?.toString() ?? ''}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        const newValue = inputValue === '' ? 0 : Number(inputValue)
                        debouncedUpdateProject(currentProject.id, {
                          parkingPlan: {
                            parkingSpaces: newValue,
                            bicycleSpaces: currentProject.parkingPlan?.bicycleSpaces || 0,
                            motorcycleSpaces: currentProject.parkingPlan?.motorcycleSpaces || 0,
                            greenArea: currentProject.parkingPlan?.greenArea || 0,
                          },
                        })
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="6"
                      helperText="戸数の30%程度が目安"
                      margin="normal"
                      inputProps={{ min: 0, step: 1 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      label="駐輪場台数"
                      type="number"
                      value={currentProject.parkingPlan?.bicycleSpaces?.toString() ?? ''}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        const newValue = inputValue === '' ? 0 : Number(inputValue)
                        debouncedUpdateProject(currentProject.id, {
                          parkingPlan: {
                            parkingSpaces: currentProject.parkingPlan?.parkingSpaces || 0,
                            bicycleSpaces: newValue,
                            motorcycleSpaces: currentProject.parkingPlan?.motorcycleSpaces || 0,
                            greenArea: currentProject.parkingPlan?.greenArea || 0,
                          },
                        })
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="18"
                      helperText="戸数の100%以上（条例による）"
                      margin="normal"
                      inputProps={{ min: 0, step: 1 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      label="バイク置場台数"
                      type="number"
                      value={currentProject.parkingPlan?.motorcycleSpaces?.toString() ?? ''}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        const newValue = inputValue === '' ? 0 : Number(inputValue)
                        debouncedUpdateProject(currentProject.id, {
                          parkingPlan: {
                            parkingSpaces: currentProject.parkingPlan?.parkingSpaces || 0,
                            bicycleSpaces: currentProject.parkingPlan?.bicycleSpaces || 0,
                            motorcycleSpaces: newValue,
                            greenArea: currentProject.parkingPlan?.greenArea || 0,
                          },
                        })
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="6"
                      helperText="戸数の30%程度"
                      margin="normal"
                      inputProps={{ min: 0, step: 1 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      label="緑地面積 (㎡)"
                      type="number"
                      value={currentProject.parkingPlan?.greenArea?.toString() ?? ''}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        const newValue = inputValue === '' ? 0 : Number(inputValue)
                        debouncedUpdateProject(currentProject.id, {
                          parkingPlan: {
                            parkingSpaces: currentProject.parkingPlan?.parkingSpaces || 0,
                            bicycleSpaces: currentProject.parkingPlan?.bicycleSpaces || 0,
                            motorcycleSpaces: currentProject.parkingPlan?.motorcycleSpaces || 0,
                            greenArea: newValue,
                          },
                        })
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="120"
                      helperText="敷地面積の20%以上（みどりの条例）"
                      margin="normal"
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* ナビゲーションボタン */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 2 : 0,
              mt: 4,
              pt: 3,
              borderTop: `1px solid ${theme.palette.grey[200]}`,
            }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                  order: isMobile ? 2 : 1,
                }}
              >
                戻る
              </Button>
              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                flexDirection: isMobile ? 'column' : 'row',
                order: isMobile ? 1 : 2,
              }}>
                <Button 
                  onClick={handleSave} 
                  variant="outlined"
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 3,
                  }}
                >
                  保存
                </Button>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/project/${currentProject.id}/simulation`)}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
                    }}
                  >
                    シミュレーションへ
                  </Button>
                ) : (
                  <Button 
                    variant="contained" 
                    onClick={handleNext}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
                    }}
                  >
                    次へ
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        )

      case 2:
        return (
          <Paper sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              面積・規制情報
            </Typography>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12 }}>
                <ZoningInfoDisplay
                  zoningState={regulationState.zoningInfo}
                  siteInfo={currentProject.siteInfo}
                  onRefresh={() => searchRegulations(currentProject.location.address, { forceRefresh: true, searchTypes: ['zoning'] })}
                  onSiteInfoChange={(updates) => {
                    debouncedUpdateProject(currentProject.id, {
                      siteInfo: { ...currentProject.siteInfo, ...updates }
                    })
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 3 }} />
                <RegulationInfoDisplay
                  searchState={regulationState}
                  administrativeGuidance={currentProject.siteInfo.administrativeGuidance}
                  onRefreshShadow={() => searchRegulations(currentProject.location.address, { forceRefresh: true, searchTypes: ['shadow'] })}
                  onRefreshAdminGuidance={() => searchRegulations(currentProject.location.address, { forceRefresh: true, searchTypes: ['administrative'] })}
                  onAdminGuidanceChange={(itemId, checked) => {
                    const updatedGuidance = {
                      ...currentProject.siteInfo.administrativeGuidance,
                      [itemId]: checked,
                    };
                    debouncedUpdateProject(currentProject.id, {
                      siteInfo: {
                        ...currentProject.siteInfo,
                        administrativeGuidance: updatedGuidance,
                        administrativeGuidanceDetails: regulationState.administrativeGuidance.data || currentProject.siteInfo.administrativeGuidanceDetails || [],
                      },
                    });
                  }}
                />
              </Grid>
            </Grid>

            
            {/* ナビゲーションボタン */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 2 : 0,
              mt: 4,
              pt: 3,
              borderTop: `1px solid ${theme.palette.grey[200]}`,
            }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                  order: isMobile ? 2 : 1,
                }}
              >
                戻る
              </Button>
              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                flexDirection: isMobile ? 'column' : 'row',
                order: isMobile ? 1 : 2,
              }}>
                <Button 
                  onClick={handleSave} 
                  variant="outlined"
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 3,
                  }}
                >
                  保存
                </Button>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/project/${currentProject.id}/simulation`)}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
                    }}
                  >
                    シミュレーションへ
                  </Button>
                ) : (
                  <Button 
                    variant="contained" 
                    onClick={handleNext}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
                    }}
                  >
                    次へ
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        )

      case 3:
        
        if (!currentProject) {
          return (
            <Paper sx={{ p: 4, borderRadius: 2 }}>
              <Typography>プロジェクトを読み込み中...</Typography>
            </Paper>
          )
        }
        
        return (
          <Paper sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              クライアント情報
            </Typography>
            
            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
              <PeopleIcon sx={{ color: 'primary.main', fontSize: 28 }} />
              <Typography variant="body1" fontWeight="bold">
                見積書の宛先情報
              </Typography>
            </Stack>

            <Typography variant="body2" color="text.secondary" mb={3}>
              見積書に表示される発注元の情報を入力してください。
            </Typography>

            <Box sx={{ maxWidth: 600, mx: 'auto' }}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="会社名/氏名"
                  value={currentProject.clientInfo?.companyName ?? ''}
                  onChange={(e) =>
                    debouncedUpdateProject(currentProject.id, {
                      clientInfo: {
                        ...currentProject.clientInfo,
                        companyName: e.target.value,
                      },
                    })
                  }
                  variant="outlined"
                  placeholder="例: 株式会社〇〇建設"
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.paper',
                    }
                  }}
                />
                
                <TextField
                  fullWidth
                  label="ご担当者名"
                  value={currentProject.clientInfo?.contactPerson ?? ''}
                  onChange={(e) =>
                    debouncedUpdateProject(currentProject.id, {
                      clientInfo: {
                        ...currentProject.clientInfo,
                        contactPerson: e.target.value,
                      },
                    })
                  }
                  variant="outlined"
                  placeholder="例: 山田 太郎"
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.paper',
                    }
                  }}
                />
                
                <TextField
                  fullWidth
                  label="部署名"
                  value={currentProject.clientInfo?.department ?? ''}
                  onChange={(e) =>
                    debouncedUpdateProject(currentProject.id, {
                      clientInfo: {
                        ...currentProject.clientInfo,
                        department: e.target.value,
                      },
                    })
                  }
                  variant="outlined"
                  placeholder="例: 建築部"
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.paper',
                    }
                  }}
                />
                
                <Divider />
                
                <TextField
                  fullWidth
                  label="住所"
                  value={currentProject.clientInfo?.address ?? ''}
                  onChange={(e) =>
                    debouncedUpdateProject(currentProject.id, {
                      clientInfo: {
                        ...currentProject.clientInfo,
                        address: e.target.value,
                      },
                    })
                  }
                  variant="outlined"
                  placeholder="例: 東京都千代田区〇〇 1-2-3 〇〇ビル5F"
                  InputLabelProps={{ shrink: true }}
                  multiline
                  rows={2}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.paper',
                    }
                  }}
                />
                
                <TextField
                  fullWidth
                  label="電話番号"
                  value={currentProject.clientInfo?.phone ?? ''}
                  onChange={(e) =>
                    debouncedUpdateProject(currentProject.id, {
                      clientInfo: {
                        ...currentProject.clientInfo,
                        phone: e.target.value,
                      },
                    })
                  }
                  variant="outlined"
                  placeholder="例: 03-1234-5678"
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.paper',
                    }
                  }}
                />
                
                <TextField
                  fullWidth
                  label="メールアドレス"
                  value={currentProject.clientInfo?.email ?? ''}
                  onChange={(e) =>
                    debouncedUpdateProject(currentProject.id, {
                      clientInfo: {
                        ...currentProject.clientInfo,
                        email: e.target.value,
                      },
                    })
                  }
                  variant="outlined"
                  placeholder="例: info@example.com"
                  InputLabelProps={{ shrink: true }}
                  type="email"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.paper',
                    }
                  }}
                />
              </Stack>
            </Box>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                ※ この情報は見積書の宛先として使用されます。入力された情報は「〇〇様」（個人）または「〇〇御中」（会社）の形式で表示されます。
              </Typography>
            </Box>
                
            {/* ナビゲーションボタン */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 2 : 0,
              mt: 4,
              pt: 3,
              borderTop: `1px solid ${theme.palette.grey[200]}`,
            }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                  order: isMobile ? 2 : 1,
                }}
              >
                戻る
              </Button>
              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                flexDirection: isMobile ? 'column' : 'row',
                order: isMobile ? 1 : 2,
              }}>
                <Button 
                  onClick={handleSave} 
                  variant="outlined"
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 3,
                  }}
                >
                  保存
                </Button>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/project/${currentProject.id}/simulation`)}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
                    }}
                  >
                    シミュレーションへ
                  </Button>
                ) : (
                  <Button 
                    variant="contained" 
                    onClick={handleNext}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
                    }}
                  >
                    次へ
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        )

      default:
        return null
    }
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
    }}>
      <Container 
        maxWidth={isMobile ? 'sm' : 'xl'} 
        sx={{ 
          py: { xs: 2, md: 3 },
          px: { xs: 2, md: 3 }
        }}
      >
        {/* ヘッダー */}
        <Paper sx={{ 
          p: { xs: 3, md: 4 }, 
          mb: { xs: 2, md: 3 }, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 2 : 0,
            mb: 3 
          }}>
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              sx={{ 
                fontWeight: 800,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2,
              }}
            >
              {currentProject.name}
            </Typography>
            <Tooltip title="プロジェクトを削除">
              <IconButton 
                onClick={handleDeleteClick}
                color="error"
                sx={{ 
                  p: 1.5,
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          {/* ステッパー */}
          <Stepper 
            activeStep={activeStep} 
            orientation={isMobile ? 'vertical' : 'horizontal'}
            sx={{ 
              '& .MuiStepLabel-label': { 
                fontSize: { xs: '0.875rem', md: '1rem' },
                fontWeight: 600,
              },
              '& .MuiStepConnector-line': {
                borderColor: alpha(theme.palette.primary.main, 0.3),
              },
              '& .MuiStepIcon-root': {
                '&.Mui-active': {
                  color: theme.palette.primary.main,
                },
                '&.Mui-completed': {
                  color: theme.palette.primary.main,
                },
              }
            }}
          >
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel 
                  optional={
                    isMobile && index === activeStep ? (
                      <Typography variant="caption" color="text.secondary">
                        現在のステップ
                      </Typography>
                    ) : null
                  }
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* メインコンテンツ */}
        {renderStepContent(activeStep)}

        {/* 削除確認ダイアログ */}
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          title="プロジェクトを削除"
          itemName={currentProject.name}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          loading={isDeleting}
        />
        
        {/* 保存成功のSnackbar */}
        <Snackbar
          open={saveSnackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSaveSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSaveSnackbarOpen(false)}
            severity="success"
            sx={{ width: '100%' }}
          >
            プロジェクトを保存しました
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  )
}