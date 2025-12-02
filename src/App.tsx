import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { CatchDetailPage } from './pages/CatchDetailPage'
import { CatchEditPage } from './pages/CatchEditPage'
import LogCatchPage from './pages/LogCatchPage'
import { Profile } from './pages/Profile'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import StartSessionPage from './pages/StartSessionPage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import FeedView from './pages/FeedView'
import ExplorePage from './pages/ExplorePage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/feed" element={<FeedView />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route
          path="/compete"
          element={<div className="p-8 text-center text-sm text-gray-600">Compete coming soon</div>}
        />
        <Route path="/sessions/new" element={<StartSessionPage />} />
        <Route path="/catches/new" element={<LogCatchPage />} />
        <Route
          path="/posts/new"
          element={
            <div className="p-8 text-center">
              <p className="mb-2 text-lg font-semibold">Share Photo</p>
              <p className="text-sm text-gray-600">Coming in Phase 2C.</p>
            </div>
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/catches/:id" element={<CatchDetailPage />} />
        <Route path="/catches/:id/edit" element={<CatchEditPage />} />
        <Route path="/sessions" element={<Dashboard />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:userId" element={<UserProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
