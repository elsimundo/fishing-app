import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

async function deleteCatch(id: string): Promise<void> {
  const { error } = await supabase.from('catches').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export function useDeleteCatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCatch,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catches'] })
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
