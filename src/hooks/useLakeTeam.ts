import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type LakeRole = 'owner' | 'manager' | 'bailiff' | null

export interface LakeTeamMember {
  id: string
  lake_id: string
  user_id: string
  role: 'manager' | 'bailiff'
  invited_by: string | null
  created_at: string
  profile?: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

/**
 * Get the current user's role for a specific lake
 * Returns: 'owner' | 'manager' | 'bailiff' | null
 */
export function useLakeRole(lakeId: string | undefined) {
  const { user } = useAuth()

  return useQuery<LakeRole>({
    queryKey: ['lake-role', lakeId, user?.id],
    queryFn: async () => {
      if (!lakeId || !user?.id) return null

      // First check if user is the owner (via claimed_by)
      const { data: lake } = await supabase
        .from('lakes')
        .select('claimed_by')
        .eq('id', lakeId)
        .single()

      if (lake?.claimed_by === user.id) {
        return 'owner'
      }

      // Check lake_team for manager/bailiff role
      const { data: teamRole } = await supabase
        .from('lake_team')
        .select('role')
        .eq('lake_id', lakeId)
        .eq('user_id', user.id)
        .single()

      return (teamRole?.role as LakeRole) || null
    },
    enabled: !!lakeId && !!user?.id,
  })
}

/**
 * Get all team members for a lake (including the owner)
 */
export function useLakeTeam(lakeId: string | undefined) {
  return useQuery({
    queryKey: ['lake-team', lakeId],
    queryFn: async () => {
      if (!lakeId) return { owner: null, team: [] }

      // Get lake claimed_by
      const { data: lake } = await supabase
        .from('lakes')
        .select('claimed_by')
        .eq('id', lakeId)
        .single()

      // Get team members
      const { data: team } = await supabase
        .from('lake_team')
        .select('id, lake_id, user_id, role, invited_by, created_at')
        .eq('lake_id', lakeId)
        .order('created_at', { ascending: true })

      // Collect all user IDs we need to fetch (owner + team members)
      const userIds: string[] = []
      if (lake?.claimed_by) userIds.push(lake.claimed_by)
      ;(team || []).forEach(t => {
        if (!userIds.includes(t.user_id)) userIds.push(t.user_id)
      })

      // Fetch all profiles in one query
      let profiles: Record<string, { id: string; username: string | null; full_name: string | null; avatar_url: string | null }> = {}
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds)
        
        profiles = (profileData || []).reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {} as typeof profiles)
      }

      // Transform team data with profiles
      const transformedTeam = (team || []).map((member) => ({
        ...member,
        profile: profiles[member.user_id] || null,
      }))

      // Get owner profile
      const ownerProfile = lake?.claimed_by ? profiles[lake.claimed_by] || null : null

      return {
        owner: ownerProfile,
        team: transformedTeam as LakeTeamMember[],
      }
    },
    enabled: !!lakeId,
  })
}

/**
 * Add a team member to a lake
 */
export function useAddLakeTeamMember() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      lakeId,
      userId,
      role,
    }: {
      lakeId: string
      userId: string
      role: 'manager' | 'bailiff'
    }) => {
      const { data, error } = await supabase
        .from('lake_team')
        .insert({
          lake_id: lakeId,
          user_id: userId,
          role,
          invited_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      // Get lake name for notification
      const { data: lake } = await supabase
        .from('lakes')
        .select('name')
        .eq('id', lakeId)
        .single()

      // Send notification to the invited user
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'lake_team_invite',
        title: 'You\'ve been added to a lake team!',
        message: `You are now a ${role} at ${lake?.name || 'a fishing venue'}`,
        related_lake_id: lakeId,
        related_user_id: user?.id,
        action_url: `/lakes/${lakeId}/dashboard`,
      })

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lake-team', variables.lakeId] })
    },
  })
}

/**
 * Remove a team member from a lake
 */
export function useRemoveLakeTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      lakeId,
      memberId,
    }: {
      lakeId: string
      memberId: string
    }) => {
      // Get the team member info before deleting
      const { data: member } = await supabase
        .from('lake_team')
        .select('user_id')
        .eq('id', memberId)
        .single()

      const { error } = await supabase
        .from('lake_team')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      // Get lake name for notification
      const { data: lake } = await supabase
        .from('lakes')
        .select('name')
        .eq('id', lakeId)
        .single()

      // Notify the removed user
      if (member?.user_id) {
        await supabase.from('notifications').insert({
          user_id: member.user_id,
          type: 'lake_team_removed',
          title: 'Removed from lake team',
          message: `You have been removed from the team at ${lake?.name || 'a fishing venue'}`,
          related_lake_id: lakeId,
        })
      }

      return { lakeId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lake-team', data.lakeId] })
    },
  })
}

/**
 * Update a team member's role
 */
export function useUpdateLakeTeamRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      memberId,
      lakeId,
      role,
    }: {
      memberId: string
      lakeId: string
      role: 'manager' | 'bailiff'
    }) => {
      const { data, error } = await supabase
        .from('lake_team')
        .update({ role })
        .eq('id', memberId)
        .select('*, user_id')
        .single()

      if (error) throw error

      // Get lake name for notification
      const { data: lake } = await supabase
        .from('lakes')
        .select('name')
        .eq('id', lakeId)
        .single()

      // Notify the user about their role change
      if (data?.user_id) {
        await supabase.from('notifications').insert({
          user_id: data.user_id,
          type: 'lake_team_role_changed',
          title: 'Your role has been updated',
          message: `You are now a ${role} at ${lake?.name || 'a fishing venue'}`,
          related_lake_id: lakeId,
          action_url: `/lakes/${lakeId}/dashboard`,
        })
      }

      return { ...data, lakeId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lake-team', data.lakeId] })
    },
  })
}

/**
 * Get all lakes where the current user has a role (owner, manager, or bailiff)
 */
export function useMyLakes() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['my-lakes', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      // Get lakes where user is owner
      const { data: ownedLakes } = await supabase
        .from('lakes')
        .select('id, name, slug, cover_image_url, is_premium')
        .eq('claimed_by', user.id)

      // Get lakes where user is team member
      const { data: teamLakes } = await supabase
        .from('lake_team')
        .select(`
          role,
          lake:lakes(id, name, slug, cover_image_url, is_premium)
        `)
        .eq('user_id', user.id)

      const owned = (ownedLakes || []).map((lake) => ({
        ...lake,
        role: 'owner' as const,
      }))

      const team = (teamLakes || [])
        .filter((t) => t.lake)
        .map((t) => {
          const lake = Array.isArray(t.lake) ? t.lake[0] : t.lake
          return {
            id: lake.id as string,
            name: lake.name as string,
            slug: lake.slug as string,
            cover_image_url: lake.cover_image_url as string | null,
            is_premium: lake.is_premium as boolean,
            role: t.role as 'manager' | 'bailiff',
          }
        })

      return [...owned, ...team]
    },
    enabled: !!user?.id,
  })
}
