import { Container, Typography, Box, Paper } from '@mui/material'
import Scene3DSimple from '@/components/Scene3DSimple'

export default function TestSimulation() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        3D Controls テスト
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          基本的な3D操作テスト
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          以下の3Dビューで以下の操作ができるはずです：
        </Typography>
        <ul>
          <li>左ドラッグ: 回転</li>
          <li>ホイール: ズーム</li>
          <li>右ドラッグ: パン</li>
        </ul>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Scene3DSimple width={800} height={600} />
        </Box>
      </Paper>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          デバッグ情報
        </Typography>
        <Typography variant="body2">
          ブラウザのDevToolsのConsoleを開いて、マウス操作時のログを確認してください。
        </Typography>
      </Paper>
    </Container>
  )
}