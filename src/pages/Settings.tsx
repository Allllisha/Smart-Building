import { useState } from 'react'
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  Snackbar,
  Stack
} from '@mui/material'
import {
  Business as BusinessIcon,
  Save as SaveIcon,
  Phone as PhoneIcon
} from '@mui/icons-material'
import { useSettingsStore } from '@/store/settingsStore'

export default function Settings() {
  const { companyInfo, updateCompanyInfo } = useSettingsStore()
  const [formData, setFormData] = useState(companyInfo)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    })
  }

  const handleSave = () => {
    updateCompanyInfo(formData)
    setShowSuccessMessage(true)
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <BusinessIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              会社情報設定
            </Typography>
            <Typography variant="body2" color="text.secondary">
              見積書に表示される発行元の会社情報を設定します
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* 基本情報セクション */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={3}>
          <BusinessIcon sx={{ color: 'primary.main', fontSize: 24 }} />
          <Typography variant="h6" fontWeight="600" sx={{ color: 'text.primary' }}>
            基本情報
          </Typography>
        </Stack>
        <Grid container spacing={3}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="会社名 *"
              value={formData.name}
              onChange={handleChange('name')}
              required
              variant="outlined"
              placeholder="例: スマート・ビルディング・プランナー株式会社"
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="代表者名"
              value={formData.representative || ''}
              onChange={handleChange('representative')}
              variant="outlined"
              placeholder="例: 代表取締役 山田太郎"
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="建設業許可"
              value={formData.license || ''}
              onChange={handleChange('license')}
              placeholder="例: 東京都知事許可（般-00）第00000号"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* 連絡先情報セクション */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={3}>
          <PhoneIcon sx={{ color: 'primary.main', fontSize: 24 }} />
          <Typography variant="h6" fontWeight="600" sx={{ color: 'text.primary' }}>
            連絡先情報
          </Typography>
        </Stack>
        <Grid container spacing={3}>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="郵便番号"
              value={formData.postalCode}
              onChange={handleChange('postalCode')}
              placeholder="000-0000"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>

          <Grid size={12}>
            <TextField
              fullWidth
              label="住所 *"
              value={formData.address}
              onChange={handleChange('address')}
              required
              variant="outlined"
              placeholder="例: 東京都世田谷区○○ 1-2-3 ○○ビル5F"
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="電話番号 *"
              value={formData.phone}
              onChange={handleChange('phone')}
              required
              variant="outlined"
              placeholder="例: 03-0000-0000"
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="FAX番号"
              value={formData.fax || ''}
              onChange={handleChange('fax')}
              variant="outlined"
              placeholder="例: 03-0000-0001"
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>

          <Grid size={12}>
            <TextField
              fullWidth
              label="メールアドレス"
              value={formData.email || ''}
              onChange={handleChange('email')}
              type="email"
              variant="outlined"
              placeholder="例: info@smart-building.jp"
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* 保存ボタン */}
      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          sx={{ 
            px: 6, 
            py: 1.5,
            borderRadius: 2,
            fontSize: '1rem',
            fontWeight: 600,
            boxShadow: 2,
            '&:hover': {
              boxShadow: 4
            }
          }}
        >
          保存
        </Button>
        <Typography variant="caption" color="text.secondary">
          ※ 保存した情報は見積書の発行元として自動的に使用されます
        </Typography>
      </Box>

      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSuccessMessage(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          会社情報を保存しました
        </Alert>
      </Snackbar>
    </Container>
  )
}