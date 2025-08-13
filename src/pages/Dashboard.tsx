import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  useMediaQuery,
  Chip,
  Stack,
  alpha,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  MoreVert as MoreVertIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Architecture as ArchitectureIcon,
  GridView as GridIcon,
  Home as HomeIcon,
  Apartment as ApartmentIcon,
  Domain as DomainIcon,
  ViewInAr as View3DIcon
} from '@mui/icons-material'
import { useProjectStore } from '@/store/projectStore'
import { Project } from '@/types/project'
import { projectApi } from '@/api/projectApi'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import AIAnalysisPreview from '@/components/AIAnalysisPreview'

export default function Dashboard() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { projects, deleteProject, setProjects, setLoading, setError } = useProjectStore()
  const [openDialog, setOpenDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null)
  // プロジェクト一覧を取得
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await projectApi.getAll()
        setProjects(response.data)
      } catch (error) {
        console.error('Failed to fetch projects:', error)
        setError('プロジェクトの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [setProjects, setLoading, setError])

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      setLoading(true)
      setError(null)
      try {
        const newProjectData = {
          name: newProjectName,
          location: {
            address: '',
            latitude: 35.6329, // 東京都世田谷区のデフォルト座標
            longitude: 139.6490,
          },
          buildingInfo: {
            usage: '共同住宅' as const,
            structure: '鉄筋コンクリート造' as const,
            floors: 1,
            maxHeight: null,
            buildingArea: null,
            effectiveArea: null,
            constructionArea: null,
          },
          siteInfo: {
            siteArea: null,
            frontRoadWidth: null,
            zoningType: '',
            heightDistrict: '',
            administrativeGuidance: {
              urbanPlanningAct: false,
              administrativeGuidance: false,
              greenOrdinance: false,
              landscapePlan: false,
              welfareEnvironment: false,
              midHighRiseOrdinance: false,
              embankmentRegulation: false,
            },
            // 日影規制のデフォルト値を設定（住所入力後に自動計算される）
            shadowRegulation: {
              targetArea: '',
              targetBuilding: '',
              measurementHeight: 0,
              measurementTime: '',
              allowedShadowTime5to10m: 0,
              allowedShadowTimeOver10m: 0
            },
          },
        }

        const response = await projectApi.create(newProjectData)
        const createdProject = response.data
        
        // プロジェクト一覧を再取得
        const updatedProjects = await projectApi.getAll()
        setProjects(updatedProjects.data)
        
        setNewProjectName('')
        setOpenDialog(false)
        navigate(`/project/${createdProject.id}`)
      } catch (error) {
        console.error('Failed to create project:', error)
        setError('プロジェクトの作成に失敗しました')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setSelectedProject(project)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedProject(null)
  }

  const handleDeleteClick = () => {
    if (selectedProject) {
      setProjectToDelete(selectedProject)
      setDeleteDialogOpen(true)
      handleMenuClose()
    }
  }

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return

    setIsDeleting(true)
    try {
      await projectApi.delete(projectToDelete.id)
      deleteProject(projectToDelete.id)
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    } catch (error) {
      console.error('プロジェクトの削除に失敗しました:', error)
      // TODO: エラー通知を表示
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setProjectToDelete(null)
  }

  const handleAnalysisToggle = (projectId: string) => {
    setExpandedAnalysis(expandedAnalysis === projectId ? null : projectId)
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: theme.palette.background.default,
    }}>
      <Container 
        maxWidth={isMobile ? 'lg' : false} 
        sx={{ 
          py: { xs: 4, md: 8 },
          px: { xs: 3, md: 6, lg: 8 }
        }}
      >
        {/* ヘッダーセクション */}
        <Box sx={{ 
          mb: { xs: 6, md: 10 },
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            mb: 2,
          }}>
            <Box>
              <Typography 
                variant={isMobile ? "h2" : "h1"} 
                sx={{ 
                  fontWeight: 300,
                  color: theme.palette.text.primary,
                  mb: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                Projects
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary" 
                sx={{ 
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                }}
              >
                建築プロジェクトの設計と見積もり管理
              </Typography>
            </Box>
            
            {/* 統計情報 */}
            <Box sx={{ 
              display: 'flex', 
              gap: 3, 
              mt: { xs: 3, md: 0 },
            }}>
              <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                <Typography variant="h2" sx={{ fontWeight: 300, color: theme.palette.text.primary }}>
                  {projects.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400, letterSpacing: '0.05em' }}>
                  Active Projects
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                <Typography variant="h2" sx={{ fontWeight: 300, color: theme.palette.text.primary }}>
                  {projects.filter(p => p.buildingInfo.usage === '共同住宅').length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400, letterSpacing: '0.05em' }}>
                  Residential
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* プロジェクトグリッド */}
        {projects.length === 0 ? (
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
          }}>
            <Paper sx={{
              position: 'relative',
              textAlign: 'center',
              p: { xs: 6, md: 12 },
              maxWidth: 600,
              width: '100%',
              borderRadius: 0,
              backgroundColor: 'transparent',
              boxShadow: 'none',
              border: `2px dashed ${theme.palette.grey[300]}`,
            }}>
              {/* アイコンセクション */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                mb: 4,
              }}>
                <GridIcon sx={{ 
                  fontSize: { xs: 64, md: 80 }, 
                  color: theme.palette.grey[300],
                }} />
              </Box>

              {/* メインメッセージ */}
              <Box sx={{ mb: 4 }}>
                <Typography 
                  variant={isMobile ? "h3" : "h2"} 
                  sx={{ 
                    fontWeight: 300,
                    color: theme.palette.text.primary,
                    mb: 2,
                    letterSpacing: '-0.02em',
                  }}
                >
                  まだプロジェクトがありません
                </Typography>
                
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: 'text.secondary',
                    fontWeight: 400,
                    maxWidth: 450,
                    mx: 'auto',
                    lineHeight: 1.7,
                    letterSpacing: '0.01em',
                  }}
                >
                  新しいプロジェクトを作成して、建築設計と見積もりを始めましょう
                </Typography>
              </Box>


              {/* CTAボタン */}
              <Button
                variant="outlined"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
                sx={{ 
                  px: 6,
                  py: 2,
                  borderRadius: 0,
                  borderColor: theme.palette.text.primary,
                  color: theme.palette.text.primary,
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  '&:hover': {
                    borderColor: theme.palette.text.primary,
                    backgroundColor: theme.palette.text.primary,
                    color: theme.palette.background.paper,
                  },
                }}
              >
                CREATE NEW PROJECT
              </Button>
            </Paper>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 3, md: 4 }}>
            {projects.map((project) => (
              <Grid size={{ xs: 12, md: 6 }} key={project.id}>
                <Card sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 0,
                  boxShadow: 'none',
                  border: `1px solid ${theme.palette.grey[200]}`,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.08)',
                    '& .project-image': {
                      transform: 'scale(1.05)',
                    },
                    '& .project-overlay': {
                      opacity: 1,
                    }
                  }
                }}>
                  {/* プロジェクトイメージエリア */}
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '65%',
                      backgroundColor: theme.palette.grey[100],
                      overflow: 'hidden',
                    }}
                    onClick={() => navigate(`/project/${project.id}/simulation`)}
                  >
                    <Box
                      className="project-image"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      {/* 3Dビュープレビューまたはプロジェクトタイプに基づくアイコン表示 */}
                      {project.previewImage ? (
                        <Box
                          component="img"
                          src={project.previewImage}
                          alt={`${project.name} 3D Preview`}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 1,
                          }}
                        />
                      ) : (
                        <>
                          {project.buildingInfo.usage === '共同住宅' && <ApartmentIcon sx={{ fontSize: 64, color: theme.palette.grey[400] }} />}
                          {project.buildingInfo.usage === '専用住宅' && <HomeIcon sx={{ fontSize: 64, color: theme.palette.grey[400] }} />}
                          {(project.buildingInfo.usage === '商業施設' || project.buildingInfo.usage === 'オフィス') && 
                            <DomainIcon sx={{ fontSize: 64, color: theme.palette.grey[400] }} />}
                          {project.buildingInfo.usage && !['共同住宅', '専用住宅', '商業施設', 'オフィス'].includes(project.buildingInfo.usage) && 
                            <ArchitectureIcon sx={{ fontSize: 64, color: theme.palette.grey[400] }} />}
                        </>
                      )}
                    </Box>
                    
                    {/* ホバーオーバーレイ */}
                    <Box
                      className="project-overlay"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                      }}
                    >
                      <View3DIcon sx={{ fontSize: 48, color: 'white' }} />
                    </Box>
                  </Box>

                  <CardContent sx={{ 
                    flexGrow: 1, 
                    p: 3,
                  }}>
                    {/* プロジェクトヘッダー */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      mb: 2 
                    }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            fontWeight: 500,
                            mb: 0.5,
                            color: theme.palette.text.primary,
                          }}
                        >
                          {project.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: theme.palette.text.secondary,
                              fontWeight: 400,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              fontSize: '0.75rem',
                            }}
                          >
                            {project.buildingInfo.usage} • {project.buildingInfo.floors}F
                          </Typography>
                          {project.estimations && (
                            <Chip
                              label="見積済"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                backgroundColor: theme.palette.success.light,
                                color: theme.palette.success.contrastText,
                                '& .MuiChip-label': {
                                  px: 1,
                                },
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, project)}
                        sx={{ 
                          ml: 1,
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* プロジェクト詳細 */}
                    <Stack spacing={1.5} sx={{ mb: 3 }}>                      
                      {project.location.address && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {project.location.address}
                          </Typography>
                        </Box>
                      )}
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Updated: {new Date(project.updatedAt).toLocaleDateString('en-US', { 
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* アクションボタン */}
                    <Stack 
                      direction="row" 
                      spacing={2} 
                      sx={{ 
                        width: '100%',
                        alignItems: 'stretch'
                      }}
                    >
                      <Button 
                        size="small" 
                        variant="text"
                        onClick={() => navigate(`/project/${project.id}`)}
                        sx={{ 
                          flex: 1,
                          height: 36,
                          color: theme.palette.text.secondary,
                          fontWeight: 400,
                          letterSpacing: '0.05em',
                          '&:hover': {
                            backgroundColor: 'transparent',
                            color: theme.palette.text.primary,
                          },
                        }}
                      >
                        EDIT
                      </Button>
                      <Button 
                        size="small" 
                        variant="text"
                        onClick={() => navigate(`/project/${project.id}/simulation`)}
                        sx={{ 
                          flex: 1,
                          height: 36,
                          color: theme.palette.secondary.main,
                          fontWeight: 400,
                          letterSpacing: '0.05em',
                          '&:hover': {
                            backgroundColor: 'transparent',
                            color: theme.palette.secondary.dark,
                          },
                        }}
                      >
                        VIEW 3D
                      </Button>
                      <Button 
                        size="small" 
                        variant="text"
                        onClick={() => navigate(`/project/${project.id}/estimation`)}
                        sx={{ 
                          flex: 1,
                          height: 36,
                          color: theme.palette.primary.main,
                          fontWeight: 400,
                          letterSpacing: '0.05em',
                          '&:hover': {
                            backgroundColor: 'transparent',
                            color: theme.palette.primary.dark,
                          },
                        }}
                      >
                        見積書
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
                
                {/* AI分析プレビュー（独立セクション） */}
                {project.estimations && (
                  <Box sx={{ mt: 2 }}>
                    <AIAnalysisPreview
                      estimation={project.estimations}
                      projectName={project.name}
                      expanded={expandedAnalysis === project.id}
                      onToggle={() => handleAnalysisToggle(project.id)}
                    />
                  </Box>
                )}
              </Grid>
            ))}
          </Grid>
        )}

        {/* フローティングアクションボタン */}
        {projects.length > 0 && (
          <Fab
            aria-label="add"
            sx={{ 
              position: 'fixed', 
              bottom: { xs: 24, md: 40 }, 
              right: { xs: 24, md: 40 },
              width: 64,
              height: 64,
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.background.paper,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                transform: 'scale(1.05)',
                boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
            onClick={() => setOpenDialog(true)}
          >
            <AddIcon sx={{ fontSize: 28 }} />
          </Fab>
        )}

        {/* プロジェクト作成ダイアログ */}
        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 0,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }
          }}
        >
          <DialogTitle sx={{ 
            p: 4,
            pb: 2,
            fontSize: '1.5rem',
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}>
            Create New Project
          </DialogTitle>
          <DialogContent sx={{ px: 4, pb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              プロジェクト名を入力してください
            </Typography>
            <TextField
              autoFocus
              label="Project Name"
              fullWidth
              variant="outlined"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject()
                }
              }}
              placeholder="例: 世田谷レジデンス"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 0,
                  '&:hover fieldset': {
                    borderColor: theme.palette.text.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.text.primary,
                    borderWidth: 1,
                  },
                },
                '& .MuiInputLabel-root': {
                  '&.Mui-focused': {
                    color: theme.palette.text.primary,
                  },
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 4, pt: 2 }}>
            <Button 
              onClick={() => setOpenDialog(false)}
              sx={{ 
                borderRadius: 0,
                color: theme.palette.text.secondary,
                fontWeight: 400,
                letterSpacing: '0.05em',
                px: 3,
                '&:hover': {
                  backgroundColor: 'transparent',
                  color: theme.palette.text.primary,
                },
              }}
            >
              CANCEL
            </Button>
            <Button 
              onClick={handleCreateProject} 
              variant="contained"
              disabled={!newProjectName.trim()}
              sx={{ 
                borderRadius: 0,
                backgroundColor: theme.palette.text.primary,
                color: theme.palette.background.paper,
                fontWeight: 400,
                letterSpacing: '0.05em',
                px: 4,
                '&:hover': {
                  backgroundColor: theme.palette.text.primary,
                  opacity: 0.9,
                },
              }}
            >
              CREATE
            </Button>
          </DialogActions>
        </Dialog>

        {/* プロジェクトメニュー */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              borderRadius: 0,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              minWidth: 150,
            }
          }}
        >
          <MenuItem 
            onClick={handleDeleteClick} 
            sx={{ 
              py: 1.5,
              px: 3,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              color: theme.palette.error.main,
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.08),
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>DELETE</ListItemText>
          </MenuItem>
        </Menu>

        {/* 削除確認ダイアログ */}
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          title="プロジェクトを削除"
          itemName={projectToDelete?.name || ''}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          loading={isDeleting}
        />
      </Container>
    </Box>
  )
}