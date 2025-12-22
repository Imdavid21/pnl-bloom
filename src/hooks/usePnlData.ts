import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchCalendar, 
  fetchDayDetails, 
  triggerBackfill, 
  triggerRecompute,
  pollHypercore,
  CalendarResponse,
  DayDetailsResponse 
} from "@/lib/pnlApi";

export function usePnlCalendar(
  wallet: string | null,
  year: number,
  view: string = 'total',
  product: string = 'perps',
  tz: string = 'utc'
) {
  return useQuery<CalendarResponse>({
    queryKey: ['pnl-calendar', wallet, year, view, product, tz],
    queryFn: () => fetchCalendar(wallet!, year, view, product, tz),
    enabled: !!wallet,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePnlDayDetails(
  wallet: string | null,
  date: string | null,
  tz: string = 'utc'
) {
  return useQuery<DayDetailsResponse>({
    queryKey: ['pnl-day', wallet, date, tz],
    queryFn: () => fetchDayDetails(wallet!, date!, tz),
    enabled: !!wallet && !!date,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBackfill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wallet, start, end }: { wallet: string; start: string; end: string }) =>
      triggerBackfill(wallet, start, end),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pnl-calendar'] });
    },
  });
}

export function useRecompute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wallet, start_day, end_day }: { wallet: string; start_day: string; end_day: string }) =>
      triggerRecompute(wallet, start_day, end_day),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pnl-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['pnl-day'] });
    },
  });
}

export function usePollHypercore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wallet, startTime, endTime, fullHistory, maxFills }: { 
      wallet: string; 
      startTime?: number; 
      endTime?: number;
      fullHistory?: boolean;
      maxFills?: number;
    }) =>
      pollHypercore(wallet, startTime, endTime, fullHistory, maxFills),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pnl-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['pnl-day'] });
    },
  });
}
