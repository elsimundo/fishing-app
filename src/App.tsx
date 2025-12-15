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
import LakeOwnerDashboard from './pages/LakeOwnerDashboard'
import MarkDetailPage from './pages/MarkDetailPage'
import SpeciesDetailPage from './pages/SpeciesDetailPage'
import SettingsPage from './pages/SettingsPage'
import PartnerApplicationPage from './pages/PartnerApplicationPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import UsersPage from './pages/admin/UsersPage'
import BusinessesPage from './pages/admin/BusinessesPage'
import LakesPage from './pages/admin/LakesPage'
import PartnersPage from './pages/admin/PartnersPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminChallengesPage from './pages/admin/ChallengesPage'
import SubmitBusinessPage from './pages/SubmitBusinessPage'
import MessagesPage from './pages/MessagesPage'
import ChallengeBoardPage from './pages/ChallengeBoardPage'
import { ChallengeDetailPage } from './pages/ChallengeDetailPage'
import { ChallengeRulesPage } from './pages/ChallengeRulesPage'
import CatchesPage from './pages/CatchesPage'
import { FishIdentifierPage } from './pages/FishIdentifierPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import NotFoundPage from './pages/NotFoundPage'

function RootRedirect() {
  const search = window.location.search ?? ''
  const hash = window.location.hash ?? ''
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  const type = hashParams.get('type') ?? searchParams.get('type')
  const accessToken = hashParams.get('access_token') ?? searchParams.get('access_token')
  const code = hashParams.get('code') ?? searchParams.get('code')
  const isRecovery = type === 'recovery' && Boolean(accessToken || code)

  if (isRecovery) {
    return <Navigate to={`/reset-password${search}${hash}`} replace />
  }

  return <Navigate to="/logbook" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route path="/identify" element={<FishIdentifierPage />} />
        <Route path="/catches/new" element={<LogCatchPage />} />
        <Route path="/posts/new" element={<CreatePostPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/catches" element={<CatchesPage />} />
        <Route path="/catches/:id" element={<CatchDetailPage />} />
        <Route path="/catches/:id/edit" element={<CatchEditPage />} />
        <Route path="/sessions" element={<Dashboard />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/lakes/:slugOrId" element={<LakeDetailPage />} />
        <Route path="/lakes/:lakeId/dashboard" element={<LakeOwnerDashboard />} />
        <Route path="/marks/:markId" element={<MarkDetailPage />} />
        <Route path="/species/:speciesId" element={<SpeciesDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/partner/apply" element={<PartnerApplicationPage />} />
        <Route path="/logbook" element={<ProfilePage />} />
        <Route path="/profile/:userId" element={<UserProfilePage />} />
        {/* Public profile route by username slug, e.g. /anglername */}
        <Route path="/:username" element={<UserProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:conversationId" element={<MessagesPage />} />
        <Route path="/challenges" element={<ChallengeBoardPage />} />
        <Route path="/challenges/rules" element={<ChallengeRulesPage />} />
        <Route path="/challenges/:slug" element={<ChallengeDetailPage />} />
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/businesses" element={<BusinessesPage />} />
        <Route path="/admin/lakes" element={<LakesPage />} />
        <Route path="/admin/partners" element={<PartnersPage />} />
        <Route path="/admin/challenges" element={<AdminChallengesPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
