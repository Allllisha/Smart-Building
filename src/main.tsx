import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App'
import { professionalTheme } from './theme/professionalTheme'
import './index.css'

// 本番環境用の一時的な認証トークン設定
// バックエンドは現在、任意のトークンを受け入れる仮実装になっている
if (!localStorage.getItem('authToken')) {
  localStorage.setItem('authToken', 'dummy-token-for-production')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <ThemeProvider theme={professionalTheme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
)