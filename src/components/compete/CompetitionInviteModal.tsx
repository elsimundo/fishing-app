import { useState } from 'react'
import { X, Search, UserPlus } from 'lucide-react'
import { useInviteToCompetition } from '../../hooks/useCompetitionInvites'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface CompetitionInviteModalProps {
  competitionId: string
  competitionTitle: string
  onClose: () => void
}

interface UserSearchResult {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
}

export function CompetitionInviteModal({ competitionId, competitionTitle, onClose }: CompetitionInviteModalProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const inviteUsers = useInviteToCompetition()

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', user?.id) // Exclude current user
        .limit(10)

      if (error) throw error
      setSearchResults(data ?? [])
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const toggleUserSelection = (selectedUser: UserSearchResult) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === selectedUser.id)
      if (isSelected) {
        return prev.filter(u => u.id !== selectedUser.id)
      } else {
        return [...prev, selectedUser]
      }
    })
  }

  const handleSendInvites = async () => {
    if (selectedUsers.length === 0) return

    try {
      await inviteUsers.mutateAsync({
        competitionId,
        userIds: selectedUsers.map(u => u.id),
      })
      onClose()
    } catch (error: any) {
      console.error('Error sending invites:', error)
      alert(error.message || 'Failed to send invites')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Invite to Competition</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Invite anglers to join <span className="font-semibold">{competitionTitle}</span>
          </p>

          {/* Search Input */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by username or name..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
            />
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Selected ({selectedUsers.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(selectedUser => (
                  <div
                    key={selectedUser.id}
                    className="flex items-center gap-2 rounded-full bg-navy-100 px-3 py-1 text-sm"
                  >
                    <span className="font-medium text-navy-800">{selectedUser.username}</span>
                    <button
                      type="button"
                      onClick={() => toggleUserSelection(selectedUser)}
                      className="text-navy-600 hover:text-navy-800"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="max-h-64 overflow-y-auto">
            {isSearching ? (
              <p className="text-center text-sm text-gray-500 py-4">Searching...</p>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map(result => {
                  const isSelected = selectedUsers.some(u => u.id === result.id)
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => toggleUserSelection(result)}
                      className={`w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                        isSelected ? 'bg-navy-50 border border-navy-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                        {result.avatar_url ? (
                          <img src={result.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          result.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{result.username}</p>
                        {result.full_name && (
                          <p className="text-xs text-gray-500 truncate">{result.full_name}</p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-navy-800 flex items-center justify-center">
                          <UserPlus size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : searchQuery.length >= 2 ? (
              <p className="text-center text-sm text-gray-500 py-4">No users found</p>
            ) : (
              <p className="text-center text-sm text-gray-500 py-4">Search for users to invite</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSendInvites}
            disabled={selectedUsers.length === 0 || inviteUsers.isPending}
            className="flex-1 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
          >
            {inviteUsers.isPending ? 'Sending...' : `Send ${selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
