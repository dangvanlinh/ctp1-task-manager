import { apiFetch } from './client';

export interface MonthlyRevenueDto {
  id: string;
  projectId: string;
  month: number;
  year: number;
  amount: string; // BigInt serialized as string — parse with Number() or BigInt()
  note: string | null;
  updatedAt: string;
  createdAt: string;
}

export function fetchMonthlyRevenue(projectId: string, year: number) {
  return apiFetch<MonthlyRevenueDto[]>(`/monthly-revenue?projectId=${projectId}&year=${year}`);
}

export function saveMonthlyRevenue(data: {
  projectId: string;
  month: number;
  year: number;
  amount: number | string;
  note?: string | null;
}) {
  return apiFetch<MonthlyRevenueDto>('/monthly-revenue', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export interface YearlyKpiDto {
  projectId: string;
  year: number;
  amount: string;
}

export function fetchYearlyKpi(projectId: string, year: number) {
  return apiFetch<YearlyKpiDto>(`/monthly-revenue/kpi?projectId=${projectId}&year=${year}`);
}

export function saveYearlyKpi(data: { projectId: string; year: number; amount: number | string }) {
  return apiFetch<YearlyKpiDto>('/monthly-revenue/kpi', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
