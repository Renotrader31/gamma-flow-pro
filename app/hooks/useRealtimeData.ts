import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useRealtimeData(endpoint: string, refreshInterval: number = 5000) {
  const { data, error, isLoading, mutate } = useSWR(
    endpoint,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )
  
  return {
    data,
    loading: isLoading,
    error,
    refresh: mutate
  }
}