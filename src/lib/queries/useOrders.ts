import { useQuery } from '@tanstack/react-query';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const body = await res.json();
      return { orders: body.orders || [], profile: body.profile || null };
    },
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useOrdersEnabled(enabled: boolean) {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const body = await res.json();
      return { orders: body.orders || [], profile: body.profile || null };
    },
    staleTime: 30 * 1000,
    enabled,
    placeholderData: (prev) => prev,
  });
}
