import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import ProjectEditor from '@/pages/ProjectEditor'
import SimulationView from '@/pages/SimulationView'
import EstimationView from '@/pages/EstimationView'
import TestSimulation from '@/pages/TestSimulation'
import Settings from '@/pages/Settings'

function App() {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.default' }}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="project/:id" element={<ProjectEditor />} />
          <Route path="project/:id/simulation" element={<SimulationView />} />
          <Route path="project/:id/estimation" element={<EstimationView />} />
          <Route path="test-simulation" element={<TestSimulation />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Box>
  )
}

export default App