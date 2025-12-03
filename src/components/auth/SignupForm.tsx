import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { APP_NAME } from '../../lib/constants'
import { validateUsername, normalizeUsername } from '../../utils/validation'
import { useCheckUsername } from '../../hooks/useCheckUsername'

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
    })

    if (error) {
      setFormError(error.message)
      return
    }

    const authUser = data.user

    if (authUser) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: authUser.id,
            username: normalizedUsername,
            email: values.email,
          },
          { onConflict: 'id' },
        )

      if (profileError) {
        setFormError('Account created but profile failed. Please contact support.')
        return
      }
    }

    setSuccessMessage('Check your email to confirm your account, then log in.')
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-surface p-6 shadow-lg">
      <h1 className="mb-1 text-center text-2xl font-semibold text-primary">{APP_NAME}</h1>
      <p className="mb-6 text-center text-sm text-slate-600">Create a new account</p>

      {formError ? (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="username">
            Username
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              @
            </span>
            <input
              id="username"
              type="text"
              autoComplete="username"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 pl-5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={20}
              {...register('username')}
            />
          </div>
          {watchedUsername && !usernameValidation.valid ? (
            <p className="mt-1 text-xs text-red-600">{usernameValidation.error}</p>
          ) : null}
          {watchedUsername && usernameValidation.valid && availability && !availability.available ? (
            <p className="mt-1 text-xs text-red-600">@{normalizeUsername(watchedUsername)} is already taken</p>
          ) : null}
          {watchedUsername && usernameValidation.valid && availability?.available ? (
            <p className="mt-1 text-xs text-emerald-600">@{normalizeUsername(watchedUsername)} is available</p>
          ) : null}
        </div>

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
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
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
          className="flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-70"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
