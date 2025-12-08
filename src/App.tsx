import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { CatchDetailPage } from './pages/CatchDetailPage'
import { CatchEditPage } from './pages/CatchEditPage'
import LogCatchPage from './pages/LogCatchPage'
// import { Profile } from './pages/Profile' // Unused
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import StartSessionPage from './pages/StartSessionPage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import FeedView from './pages/FeedView'
import SearchUsersPage from './pages/SearchUsersPage'
import ExplorePage from './pages/ExplorePage'
import DiscoverPage from './pages/DiscoverPage'
import CompetePage from './pages/CompetePage'
import CompetitionDetailPage from './pages/CompetitionDetailPage'
import CreateCompetitionPage from './pages/CreateCompetitionPage'
import CreatePostPage from './pages/CreatePostPage'
import LakeDetailPage from './pages/LakeDetailPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import UsersPage from './pages/admin/UsersPage'
import BusinessesPage from './pages/admin/BusinessesPage'
import LakesPage from './pages/admin/LakesPage'
import SubmitBusinessPage from './pages/SubmitBusinessPage'
import MessagesPage from './pages/MessagesPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/feed" element={<FeedView />} />
        <Route path="/search" element={<SearchUsersPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/businesses/submit" element={<SubmitBusinessPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/compete" element={<CompetePage />} />
        <Route path="/compete/create" element={<CreateCompetitionPage />} />
        <Route path="/compete/:competitionId/edit" element={<CreateCompetitionPage />} />
        <Route path="/compete/:competitionId" element={<CompetitionDetailPage />} />
        <Route path="/sessions/new" element={<StartSessionPage />} />
        <Route path="/catches/new" element={<LogCatchPage />} />
        <Route path="/posts/new" element={<CreatePostPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/catches/:id" element={<CatchDetailPage />} />
        <Route path="/catches/:id/edit" element={<CatchEditPage />} />
        <Route path="/sessions" element={<Dashboard />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/lakes/:slugOrId" element={<LakeDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:userId" element={<UserProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:conversationId" element={<MessagesPage />} />
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/businesses" element={<BusinessesPage />} />
        <Route path="/admin/lakes" element={<LakesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
