import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { APP_NAME } from '../lib/constants'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    setIsSubmitted(true)
    toast.success('Check your email for the reset link')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-surface p-6 shadow-lg">
          <h1 className="mb-1 text-center text-2xl font-semibold text-primary">{APP_NAME}</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">Reset your password</p>

          {isSubmitted ? (
            <div className="space-y-4">
              <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                <p className="font-medium">Check your email</p>
                <p className="mt-1">
                  We've sent a password reset link to your email address. Click the link to reset your password.
                </p>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="font-medium text-navy-800 hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="block w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-md bg-navy-800 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-navy-900 disabled:bg-navy-400"
              >
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-navy-800 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
