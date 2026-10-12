import { useQuery } from '@tanstack/react-query'

import { sellersApi } from '../api/sellers.api'

export function useSeller(id: string) {
  return useQuery({
    queryKey: ['sellers', id],
    queryFn: ({ signal }) => sellersApi.fetchPublic(id, signal)
  })
}
