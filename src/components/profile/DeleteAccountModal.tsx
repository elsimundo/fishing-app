import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'react-hot-toast'

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
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Delete Account</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <div className="mb-4 rounded-xl bg-amber-50 p-4">
            <h3 className="mb-2 font-semibold text-amber-800">What happens when you delete:</h3>
            <ul className="space-y-1 text-sm text-amber-700">
              <li>• Your profile will be hidden immediately</li>
              <li>• All your followers will be removed</li>
              <li>• Your posts will be hidden from others</li>
              <li>• You have <strong>30 days</strong> to change your mind</li>
              <li>• After 30 days, all data is permanently deleted</li>
            </ul>
          </div>

          <div className="mb-4 rounded-xl bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Want to come back?</strong> Just log in within 30 days and your account will be restored.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Type <span className="font-bold text-red-600">delete my account</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete my account"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-200 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500"
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
