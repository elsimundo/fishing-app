import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type LakeReportReason =
  // Listing issues
  | 'not_a_fishing_lake'
  | 'incorrect_info'
  | 'duplicate'
  | 'closed_permanently'
  | 'inappropriate_content'
  // Venue issues (for anglers to report on-site problems)
  | 'littering'
  | 'broken_facilities'
  | 'fish_health'
  | 'overcrowding'
  | 'rule_violations'
  | 'safety_issue'
  | 'access_problem'
  | 'antisocial_behaviour'
  | 'other'

export type LakeReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'

export interface LakeReport {
  id: string
  lake_id: string
  reporter_id: string
  reason: LakeReportReason
  details: string | null
  status: LakeReportStatus
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  lake?: {
    id: string
    name: string
    region: string | null
  }
  reporter?: {
    id: string
    username: string
    display_name: string | null
  }
}

export const REPORT_REASON_LABELS: Record<LakeReportReason, string> = {
  // Listing issues
  not_a_fishing_lake: 'Not a fishing lake',
  incorrect_info: 'Incorrect information',
  duplicate: 'Duplicate listing',
  closed_permanently: 'Venue closed permanently',
  inappropriate_content: 'Inappropriate content',
  // Venue issues
  littering: 'Littering / rubbish',
  broken_facilities: 'Broken facilities (toilets, swims, etc.)',
  fish_health: 'Sick or dead fish',
  overcrowding: 'Overcrowding',
  rule_violations: 'Rule violations by other anglers',
  safety_issue: 'Safety concern',
  access_problem: 'Access problem',
  antisocial_behaviour: 'Antisocial behaviour',
  other: 'Other issue',
}

// Group reasons by category for UI
export const REPORT_REASON_CATEGORIES = {
  listing: {
    label: 'Listing Issues',
    reasons: ['not_a_fishing_lake', 'incorrect_info', 'duplicate', 'closed_permanently', 'inappropriate_content'] as LakeReportReason[],
  },
  venue: {
    label: 'Venue Issues',
    reasons: ['littering', 'broken_facilities', 'fish_health', 'overcrowding', 'rule_violations', 'safety_issue', 'access_problem', 'antisocial_behaviour', 'other'] as LakeReportReason[],
  },
}

/**
 * Submit a report for a lake
 */
export function useSubmitLakeReport() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      lakeId,
      reason,
      details,
    }: {
      lakeId: string
      reason: LakeReportReason
      details?: string
    }) => {
      if (!user) throw new Error('Must be logged in')

      const { data, error } = await supabase
        .from('lake_reports')
        .insert({
          lake_id: lakeId,
          reporter_id: user.id,
          reason,
          details: details?.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      // Get lake info for notification
      const { data: lake } = await supabase
        .from('lakes')
        .select('name, claimed_by')
        .eq('id', lakeId)
        .single()

      // Notify lake owner if claimed
      if (lake?.claimed_by) {
        await supabase.from('notifications').insert({
          user_id: lake.claimed_by,
          type: 'lake_problem_reported',
          title: 'Problem reported at your venue',
          message: `Someone reported an issue: ${REPORT_REASON_LABELS[reason]}`,
          related_lake_id: lakeId,
          related_user_id: user.id,
          action_url: `/lakes/${lakeId}/dashboard`,
        })
      }

      // Notify admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map((admin) => ({
          user_id: admin.id,
          type: 'lake_problem_reported',
          title: 'Lake problem reported',
          message: `${lake?.name || 'A lake'}: ${REPORT_REASON_LABELS[reason]}`,
          related_lake_id: lakeId,
          related_user_id: user.id,
          action_url: '/admin/lakes',
        }))

        await supabase.from('notifications').insert(adminNotifications)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lake-reports'] })
    },
  })
}

/**
 * Fetch reports for a specific lake (for owners/managers)
 */
export function useLakeReports(lakeId: string | undefined) {
  return useQuery<LakeReport[]>({
    queryKey: ['lake-reports', lakeId],
    queryFn: async () => {
      if (!lakeId) return []

      const { data, error } = await supabase
        .from('lake_reports')
        .select(`
          *,
          reporter:profiles!lake_reports_reporter_id_fkey(id, username, display_name)
        `)
        .eq('lake_id', lakeId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((item) => ({
        ...item,
        reporter: Array.isArray(item.reporter) ? item.reporter[0] : item.reporter,
      })) as LakeReport[]
    },
    enabled: !!lakeId,
  })
}

/**
 * Fetch all reports (for admins)
 */
export function useAllLakeReports(status?: LakeReportStatus) {
  return useQuery<LakeReport[]>({
    queryKey: ['lake-reports', 'all', status],
    queryFn: async () => {
      let query = supabase
        .from('lake_reports')
        .select(`
          *,
          lake:lakes(id, name, region),
          reporter:profiles!lake_reports_reporter_id_fkey(id, username, display_name)
        `)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((item) => ({
        ...item,
        lake: Array.isArray(item.lake) ? item.lake[0] : item.lake,
        reporter: Array.isArray(item.reporter) ? item.reporter[0] : item.reporter,
      })) as LakeReport[]
    },
  })
}

/**
 * Update a report status (admin only)
 */
export function useUpdateLakeReportStatus() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      adminNotes,
    }: {
      reportId: string
      status: LakeReportStatus
      adminNotes?: string
    }) => {
      if (!user) throw new Error('Must be logged in')

      const { data, error } = await supabase
        .from('lake_reports')
        .update({
          status,
          admin_notes: adminNotes?.trim() || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lake-reports'] })
    },
  })
}
