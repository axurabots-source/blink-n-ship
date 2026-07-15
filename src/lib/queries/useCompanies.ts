import { useQuery } from '@tanstack/react-query';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await fetch('/api/courier/companies');
      if (!res.ok) throw new Error('Failed to fetch companies');
      const body = await res.json();
      return body.companies || [];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useCompaniesEnabled(enabled: boolean) {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await fetch('/api/courier/companies');
      if (!res.ok) throw new Error('Failed to fetch companies');
      const body = await res.json();
      return body.companies || [];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled,
    placeholderData: (prev) => prev,
  });
}
