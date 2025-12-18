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
    <div className="mx-auto w-full max-w-md rounded-xl bg-card p-6 shadow-lg border border-border">
      <div className="mb-2 flex justify-center">
        <img 
          src="/catchi-logo-dark.png" 
          alt={APP_NAME} 
          className="h-16 w-auto dark:block hidden"
        />
        <img 
          src="/catchi-logo-light.png" 
          alt={APP_NAME} 
          className="h-16 w-auto dark:hidden"
        />
      </div>
      <p className="mb-6 text-center text-sm text-muted-foreground">Sign in to your account</p>

      {formError ? (
        <div className="mb-4 rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400">
          {formError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('email')}
          />
          {errors.email ? (
            <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-muted-foreground" htmlFor="password">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
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
