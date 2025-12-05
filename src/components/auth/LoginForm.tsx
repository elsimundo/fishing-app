import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    navigate('/dashboard', { replace: true })
  }

  const inputClass = "block w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-base shadow-sm focus:border-navy-800 focus:outline-none focus:ring-0 min-h-[56px]"
  const labelClass = "mb-2 block text-sm font-semibold text-slate-700"
  const errorClass = "mt-2 text-sm text-red-600 font-medium"

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-surface p-6 shadow-lg">
      <h1 className="mb-2 text-center text-3xl font-bold text-navy-800">{APP_NAME}</h1>
      <p className="mb-8 text-center text-base text-slate-600">Sign in to your account</p>

      {formError ? (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-base text-red-700 font-medium">
          {formError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            {...register('email')}
          />
          {errors.email ? (
            <p className={errorClass}>{errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            {...register('password')}
          />
          {errors.password ? (
            <p className={errorClass}>{errors.password.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-navy-800 px-6 py-5 text-lg font-semibold text-white shadow-lg hover:bg-navy-900 disabled:bg-navy-400 active:scale-[0.98] transition-all min-h-[64px]"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
