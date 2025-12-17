import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, X, Info } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { Callout, CalloutDescription, CalloutTitle } from '../ui/callout'

interface DeleteAccountModalProps {
  onClose: () => void
}

export function DeleteAccountModal({ onClose }: DeleteAccountModalProps) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const canDelete = confirmText.toLowerCase() === 'delete my account'

  const handleDelete = async () => {
    if (!canDelete || !user) return

    setIsDeleting(true)
    try {
      // Call the soft delete function
      const { error } = await supabase.rpc('soft_delete_account', {
        user_id: user.id
      })

      if (error) throw error

      toast.success('Account scheduled for deletion')
      
      // Sign out and redirect
      await signOut()
      navigate('/login')
    } catch (error: any) {
      console.error('Failed to delete account:', error)
      toast.error(error.message || 'Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Delete Account</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <div className="mb-4">
            <Callout variant="warning">
              <AlertTriangle />
              <CalloutTitle>What happens when you delete</CalloutTitle>
              <CalloutDescription>
                <ul className="mt-1 space-y-1">
                  <li>• Your profile will be hidden immediately</li>
                  <li>• All your followers will be removed</li>
                  <li>• Your posts will be hidden from others</li>
                  <li>
                    • You have <strong>30 days</strong> to change your mind
                  </li>
                  <li>• After 30 days, all data is permanently deleted</li>
                </ul>
              </CalloutDescription>
            </Callout>
          </div>

          <div className="mb-4">
            <Callout variant="info">
              <Info />
              <CalloutDescription>
                <strong>Want to come back?</strong> Just log in within 30 days and your account will be restored.
              </CalloutDescription>
            </Callout>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Type <span className="font-bold text-red-400">delete my account</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete my account"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 font-semibold text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:bg-muted disabled:text-muted-foreground"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Account'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
