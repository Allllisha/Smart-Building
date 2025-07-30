import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material'
import { Warning } from '@mui/icons-material'

interface DeleteConfirmDialogProps {
  open: boolean
  title: string
  itemName: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function DeleteConfirmDialog({
  open,
  title,
  itemName,
  onConfirm,
  onCancel,
  loading = false
}: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          この操作は取り消すことができません
        </Alert>
        
        <Typography variant="body1" gutterBottom>
          以下のプロジェクトを削除してもよろしいですか？
        </Typography>
        
        <Box sx={{ 
          p: 2, 
          bgcolor: 'grey.100', 
          borderRadius: 1, 
          mt: 2,
          border: '1px solid',
          borderColor: 'grey.300'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            「{itemName}」
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          プロジェクトに関連するすべてのデータ（見積もり、シミュレーション結果、BIMファイルなど）も同時に削除されます。
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={onCancel}
          disabled={loading}
          sx={{ mr: 1 }}
        >
          キャンセル
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          sx={{ fontWeight: 600 }}
        >
          {loading ? '削除中...' : '削除する'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}