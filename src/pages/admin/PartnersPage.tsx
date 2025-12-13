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
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Sales Partners</h1>
            <p className="text-sm text-muted-foreground">Manage partner applications and commissions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users size={16} />
              <span className="text-xs font-medium">Active Partners</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{activePartners.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp size={16} />
              <span className="text-xs font-medium">Total Signups</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{totalSignups}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign size={16} />
              <span className="text-xs font-medium">Total Earnings</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">£{totalEarnings.toFixed(2)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'applications'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-muted-foreground hover:text-foreground'
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
                : 'text-muted-foreground hover:text-foreground'
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
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingApps.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">No pending applications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApps.map((app) => (
                  <div key={app.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{app.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{app.email}</p>
                        {app.phone && <p className="text-sm text-muted-foreground">{app.phone}</p>}
                        <div className="mt-3 space-y-2">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Why join:</p>
                            <p className="text-sm text-foreground">{app.why_join}</p>
                          </div>
                          {app.experience && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Experience:</p>
                              <p className="text-sm text-foreground">{app.experience}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Expected signups:</p>
                            <p className="text-sm text-foreground">{app.expected_signups} businesses</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
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
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-card px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
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
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : partners.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">No partners yet</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Partner Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Commission</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Signups</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Earnings</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {partners.map((partner) => (
                      <tr key={partner.id} className="hover:bg-muted">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {partner.partner_code}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {(partner.commission_rate * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{partner.total_signups}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          £{Number(partner.total_earnings).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              partner.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {partner.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
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
