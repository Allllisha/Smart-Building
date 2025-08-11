import { Outlet, useNavigate } from 'react-router-dom'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box,
  Button,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import { 
  Architecture as ArchitectureIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { useState } from 'react'

export default function Layout() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const menuItems = [
    { text: 'ダッシュボード', icon: <DashboardIcon />, path: '/dashboard' },
    { text: '設定', icon: <SettingsIcon />, path: '/settings' },
  ]

  const drawer = (
    <Box sx={{ width: 280 }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ArchitectureIcon sx={{ color: 'primary.main', fontSize: 32 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            Smart Building
            <br />
            Planner
          </Typography>
        </Box>
      </Box>
      <List sx={{ px: 2, py: 3 }}>
        {menuItems.map((item) => (
          <ListItem
            key={item.text}
            onClick={() => {
              navigate(item.path)
              if (isMobile) setMobileOpen(false)
            }}
            sx={{
              borderRadius: 2,
              mb: 1,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'primary.50',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'primary.main', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text}
              primaryTypographyProps={{
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  )

  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static" elevation={0}>
          <Toolbar sx={{ px: 2 }}>
            <IconButton
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, color: 'primary.main' }}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <ArchitectureIcon sx={{ mr: 1.5, color: 'primary.main' }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700, 
                  color: 'primary.main',
                  fontSize: '1.1rem',
                  lineHeight: 1.2,
                }}
              >
                Smart Building<br />Planner
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>
        
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ 
            keepMounted: true,
            disableEnforceFocus: true,
            disableAutoFocus: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              borderRadius: '0 16px 16px 0',
            },
          }}
        >
          {drawer}
        </Drawer>
        
        <Box sx={{ flexGrow: 1, overflow: 'auto', backgroundColor: 'background.default' }}>
          <Outlet />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
            <ArchitectureIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                color: 'primary.main',
                letterSpacing: '-0.025em',
              }}
            >
              Smart Building Planner
            </Typography>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => navigate('/dashboard')}
              sx={{
                color: 'text.primary',
                fontWeight: 500,
                px: 3,
                py: 1,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: 'primary.50',
                },
              }}
            >
              ダッシュボード
            </Button>
            <Button
              onClick={() => navigate('/settings')}
              sx={{
                color: 'text.primary',
                fontWeight: 500,
                px: 3,
                py: 1,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: 'primary.50',
                },
              }}
            >
              設定
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto', backgroundColor: 'background.default' }}>
        <Outlet />
      </Box>
    </Box>
  )
}