import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { ThemeLoader } from './components/ThemeLoader'
import { AchievementCelebrationProvider } from './hooks/useAchievementCelebration.tsx'
import { AchievementCelebrationGlobal } from './components/gamification/AchievementCelebrationGlobal'
import 'mapbox-gl/dist/mapbox-gl.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <ThemeLoader>
              <AchievementCelebrationProvider>
                <App />
                <AchievementCelebrationGlobal />
              </AchievementCelebrationProvider>
            </ThemeLoader>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </QueryClientProvider>
  </StrictMode>,
)
