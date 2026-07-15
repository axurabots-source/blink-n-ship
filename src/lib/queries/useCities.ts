import { useQuery } from '@tanstack/react-query';

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const res = await fetch('/api/courier/cities');
      if (!res.ok) throw new Error('Failed to fetch cities');
      const body = await res.json();
      return body.cities || [];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useCitiesEnabled(enabled: boolean) {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const res = await fetch('/api/courier/cities');
      if (!res.ok) throw new Error('Failed to fetch cities');
      const body = await res.json();
      return body.cities || [];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled,
    placeholderData: (prev) => prev,
  });
}
