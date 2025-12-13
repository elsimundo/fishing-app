import { Link } from 'react-router-dom'
import { SignupForm } from '../components/auth/SignupForm'

export function Signup() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A2D3D] px-4">
      <div className="w-full max-w-md space-y-4">
        <SignupForm />
        <p className="text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#1BA9A0] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
