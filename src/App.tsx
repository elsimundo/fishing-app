import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { CatchDetailPage } from './pages/CatchDetailPage'
import { CatchEditPage } from './pages/CatchEditPage'
import { Profile } from './pages/Profile'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { SessionsPage } from './pages/SessionsPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/catches/:id" element={<CatchDetailPage />} />
        <Route path="/catches/:id/edit" element={<CatchEditPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
