import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { APP_NAME } from '../../lib/constants'
import { ensureProfile } from '../../utils/profile'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })
  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setFormError(error.message)
      toast.error(error.message)
      return
    }

    // Ensure a profile exists (covers cases where signup created the account but profile insert failed)
    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes.user
    if (user) {
      try {
        await ensureProfile({
          userId: user.id,
          username: (user.user_metadata as any)?.username ?? null,
          email: user.email,
        })
      } catch (profileErr) {
        const message = profileErr instanceof Error ? profileErr.message : 'Could not ensure profile.'
        console.error('Ensure profile after login failed', message)
        toast.error('Signed in, but we could not finish your profile. Please try again.')
      }
    }

    toast.success('Signed in')
    navigate('/logbook', { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-surface p-6 shadow-lg">
      <h1 className="mb-1 text-center text-2xl font-semibold text-primary">{APP_NAME}</h1>
      <p className="mb-6 text-center text-sm text-slate-600">Sign in to your account</p>

      {formError ? (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('email')}
          />
          {errors.email ? (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-medium text-navy-800 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-md bg-navy-800 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-navy-900 disabled:bg-navy-400"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
