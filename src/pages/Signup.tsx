import { Link } from 'react-router-dom'
import { SignupForm } from '../components/auth/SignupForm'

export function Signup() {
  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-background px-4 py-10 pb-28 overflow-y-auto sm:items-center sm:py-0 sm:pb-0">
      <div className="w-full max-w-md space-y-4">
        <SignupForm />
        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
