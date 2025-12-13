import { Link } from 'react-router-dom'
import { LoginForm } from '../components/auth/LoginForm'

export function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A2D3D] px-4">
      <div className="w-full max-w-md space-y-4">
        <LoginForm />
        <p className="text-center text-xs text-gray-400">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-[#1BA9A0] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
