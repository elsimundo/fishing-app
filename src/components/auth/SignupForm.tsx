import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { APP_NAME } from '../../lib/constants'
import { validateUsername, normalizeUsername } from '../../utils/validation'
import { useCheckUsername } from '../../hooks/useCheckUsername'
import { ensureProfile } from '../../utils/profile'

const signupSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
})

type SignupFormValues = z.infer<typeof signupSchema>

export function SignupForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const watchedUsername = watch('username') || ''
  const usernameValidation = validateUsername(watchedUsername)
  const {
    data: availability,
    isLoading: checkingUsername,
  } = useCheckUsername(watchedUsername, usernameValidation.valid)

  const onSubmit = async (values: SignupFormValues) => {
    setFormError(null)
    setSuccessMessage(null)

    const usernameCheck = validateUsername(values.username)
    if (!usernameCheck.valid) {
      setFormError(usernameCheck.error ?? 'Invalid username')
      return
    }

    const normalizedUsername = normalizeUsername(values.username)

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          username: normalizedUsername,
        },
      },
    })

    if (error) {
      setFormError(error.message)
      return
    }

    const authUser = data.user

    if (authUser) {
      try {
        await ensureProfile({ userId: authUser.id, username: normalizedUsername, email: values.email })
      } catch (profileErr) {
        const message = profileErr instanceof Error ? profileErr.message : 'Profile creation failed.'
        console.error('Profile creation failed after signup', message)
        setFormError(
          'Account created but profile failed. Please try signing in again to finish setup or contact support.',
        )
        return
      }
    }

    setSuccessMessage('Check your email to confirm your account, then log in.')
  }

  const inputClass = "block w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-base shadow-sm focus:border-navy-800 focus:outline-none focus:ring-0 min-h-[56px]"
  const labelClass = "mb-2 block text-sm font-semibold text-slate-700"
  const errorClass = "mt-2 text-sm text-red-600 font-medium"
  const successClass = "mt-2 text-sm text-emerald-600 font-medium"

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-surface p-6 shadow-lg">
      <h1 className="mb-2 text-center text-3xl font-bold text-navy-800">{APP_NAME}</h1>
      <p className="mb-8 text-center text-base text-slate-600">Create a new account</p>

      {formError ? (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-base text-red-700 font-medium">
          {formError}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-base text-emerald-700 font-medium">
          {successMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className={labelClass} htmlFor="username">
            Username
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-slate-400">
              @
            </span>
            <input
              id="username"
              type="text"
              autoComplete="username"
              className="block w-full rounded-xl border-2 border-slate-200 px-4 py-4 pl-8 text-base shadow-sm focus:border-navy-800 focus:outline-none focus:ring-0 min-h-[56px]"
              maxLength={20}
              {...register('username')}
            />
          </div>
          {watchedUsername && !usernameValidation.valid ? (
            <p className={errorClass}>{usernameValidation.error}</p>
          ) : null}
          {watchedUsername && usernameValidation.valid && availability && !availability.available ? (
            <p className={errorClass}>@{normalizeUsername(watchedUsername)} is already taken</p>
          ) : null}
          {watchedUsername && usernameValidation.valid && availability?.available ? (
            <p className={successClass}>✓ @{normalizeUsername(watchedUsername)} is available</p>
          ) : null}
        </div>

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
            autoComplete="new-password"
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
