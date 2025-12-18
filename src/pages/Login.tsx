import { Link } from 'react-router-dom'
import { LoginForm } from '../components/auth/LoginForm'

export function Login() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-md space-y-4">
        <LoginForm />
        <p className="text-center text-xs text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
