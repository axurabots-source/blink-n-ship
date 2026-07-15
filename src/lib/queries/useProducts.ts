import { useQuery } from '@tanstack/react-query';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const body = await res.json();
      return body.products || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useProductsEnabled(enabled: boolean) {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const body = await res.json();
      return body.products || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
    placeholderData: (prev) => prev,
  });
}
