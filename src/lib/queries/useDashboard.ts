import { useQuery } from '@tanstack/react-query';

export type TodayOrder = {
  id: string;
  customerName: string | null;
  city: string | null;
  productName: string;
  trackingNumber: string | null;
  profit: number;
  costPrice: number | null;
};

export type DashboardData = {
  businessName: string | null;
  stats: {
    totalOrders: number;
    bookedToday: number;
    totalRevenue: number;
    totalProfit: number;
    totalBooked: number;
    inTransit: number;
    delivered: number;
    returned: number;
    missingCostPrice: number;
  };
  graphData: Array<{ dateStr: string; profit: number; revenue: number }>;
  todayOrders: TodayOrder[];
};

export function useDashboard() {
  return useQuery<DashboardData>({
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
