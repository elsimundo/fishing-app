import { Link } from 'react-router-dom'
import { LoginForm } from '../components/auth/LoginForm'

export function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4">
        <LoginForm />
        <p className="text-center text-xs text-slate-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-secondary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
