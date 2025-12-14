import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { APP_NAME } from '../lib/constants'
import { Loader2 } from 'lucide-react'

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsValidSession(!!session)
    }
    checkSession()
  }, [])

  const onSubmit = async (values: ResetPasswordFormValues) => {
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Password updated successfully')
    navigate('/logbook', { replace: true })
  }

  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-navy-800" />
      </div>
    )
  }

  if (!isValidSession) {
    return (
      <div className="flex min-h-[100dvh] items-start justify-center bg-background px-4 py-10 pb-28 overflow-y-auto sm:items-center sm:py-0 sm:pb-0">
        <div className="w-full max-w-md">
          <div className="rounded-xl bg-surface p-6 shadow-lg text-center">
            <h1 className="mb-2 text-xl font-semibold text-foreground">Invalid or expired link</h1>
            <p className="mb-4 text-sm text-muted-foreground">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <a
              href="/forgot-password"
              className="inline-flex items-center justify-center rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900"
            >
              Request new link
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-background px-4 py-10 pb-28 overflow-y-auto sm:items-center sm:py-0 sm:pb-0">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-surface p-6 shadow-lg">
          <h1 className="mb-1 text-center text-2xl font-semibold text-primary">{APP_NAME}</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">Create a new password</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className="block w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="block w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-md bg-navy-800 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-navy-900 disabled:bg-navy-400"
            >
              {isSubmitting ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
