import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Handshake, Check, X, Loader2, DollarSign, Users, TrendingUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'

type PartnerApplication = {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  why_join: string
  experience: string | null
  expected_signups: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

type SalesPartner = {
  id: string
  user_id: string
  partner_code: string
  commission_rate: number
  total_signups: number
  total_earnings: number
  status: string
  created_at: string
}

export default function PartnersPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'applications' | 'partners'>('applications')

  // Fetch pending applications
  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['partner-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_applications')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PartnerApplication[]
    },
  })

  // Fetch all partners
  const { data: partners = [], isLoading: partnersLoading } = useQuery({
    queryKey: ['sales-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_partners')
        .select('*')
        .order('total_earnings', { ascending: false })
      if (error) throw error
      return data as SalesPartner[]
    },
  })

  // Approve application mutation
  const approveApplication = useMutation({
    mutationFn: async (applicationId: string) => {
      const app = applications.find((a) => a.id === applicationId)
      if (!app) throw new Error('Application not found')

      // Generate partner code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_partner_code', {
        base_name: app.full_name,
      })
      if (codeError) throw codeError

      // Create sales partner
      const { error: partnerError } = await supabase.from('sales_partners').insert({
        user_id: app.user_id,
        partner_code: codeData,
        commission_rate: 0.25,
        status: 'active',
      })
      if (partnerError) throw partnerError

      // Update application status
      const { error: updateError } = await supabase
        .from('partner_applications')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', applicationId)
      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-applications'] })
      queryClient.invalidateQueries({ queryKey: ['sales-partners'] })
      toast.success('Application approved! Partner account created.')
    },
    onError: (error) => {
      console.error('Approve error:', error)
      toast.error('Failed to approve application')
    },
  })

  // Reject application mutation
  const rejectApplication = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('partner_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-applications'] })
      toast.success('Application rejected')
    },
    onError: () => {
      toast.error('Failed to reject application')
    },
  })

  const pendingApps = applications.filter((a) => a.status === 'pending')
  const activePartners = partners.filter((p) => p.status === 'active')
  const totalEarnings = partners.reduce((sum, p) => sum + Number(p.total_earnings), 0)
  const totalSignups = partners.reduce((sum, p) => sum + p.total_signups, 0)

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700">
            <Handshake size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">Sales Partners</h1>
            <p className="text-sm text-gray-600">Manage partner applications and commissions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Users size={16} />
              <span className="text-xs font-medium">Active Partners</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{activePartners.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <TrendingUp size={16} />
              <span className="text-xs font-medium">Total Signups</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totalSignups}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <DollarSign size={16} />
              <span className="text-xs font-medium">Total Earnings</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">£{totalEarnings.toFixed(2)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'applications'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Applications {pendingApps.length > 0 && `(${pendingApps.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'partners'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Partners ({partners.length})
          </button>
        </div>

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div>
            {appsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : pendingApps.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                <p className="text-sm text-gray-500">No pending applications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApps.map((app) => (
                  <div key={app.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{app.full_name}</h3>
                        <p className="text-sm text-gray-600">{app.email}</p>
                        {app.phone && <p className="text-sm text-gray-600">{app.phone}</p>}
                        <div className="mt-3 space-y-2">
                          <div>
                            <p className="text-xs font-medium text-gray-500">Why join:</p>
                            <p className="text-sm text-gray-700">{app.why_join}</p>
                          </div>
                          {app.experience && (
                            <div>
                              <p className="text-xs font-medium text-gray-500">Experience:</p>
                              <p className="text-sm text-gray-700">{app.experience}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium text-gray-500">Expected signups:</p>
                            <p className="text-sm text-gray-700">{app.expected_signups} businesses</p>
                          </div>
                          <p className="text-xs text-gray-400">
                            Applied {format(new Date(app.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => approveApplication.mutate(app.id)}
                          disabled={approveApplication.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          <Check size={16} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const reason = prompt('Rejection reason (optional):')
                            if (reason !== null) {
                              rejectApplication.mutate({ id: app.id, reason: reason || 'Not suitable' })
                            }
                          }}
                          disabled={rejectApplication.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <X size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Partners Tab */}
        {activeTab === 'partners' && (
          <div>
            {partnersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : partners.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                <p className="text-sm text-gray-500">No partners yet</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Partner Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Commission</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Signups</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Earnings</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {partners.map((partner) => (
                      <tr key={partner.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {partner.partner_code}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {(partner.commission_rate * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{partner.total_signups}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          £{Number(partner.total_earnings).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              partner.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {partner.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {format(new Date(partner.created_at), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
