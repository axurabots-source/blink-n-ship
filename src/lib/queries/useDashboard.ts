import { useQuery } from '@tanstack/react-query';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const json = await res.json();
      return {
        businessName: json.businessName,
        stats: json.stats,
        graphData: json.graphData,
        todayOrders: json.todayOrders,
      };
    },
    staleTime: 30 * 1000,
    refetchInterval: (query) => (typeof document !== 'undefined' && document.hidden ? false : 30 * 1000),
    placeholderData: (prev) => prev,
  });
}
