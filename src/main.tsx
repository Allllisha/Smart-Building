import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App'
import { professionalTheme } from './theme/professionalTheme'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <ThemeProvider theme={professionalTheme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
)