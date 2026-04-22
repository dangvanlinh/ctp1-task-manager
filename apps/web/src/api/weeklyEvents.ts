import { apiFetch } from './client';

export interface WeeklyEventRaw {
  projectId: string;
  month: number;
  year: number;
  data: any[];
  configs: any[];
  updatedAt: string | null;
}

export function fetchWeeklyEvents(projectId: string, month: number, year: number) {
  return apiFetch<WeeklyEventRaw>(`/weekly-events?projectId=${projectId}&month=${month}&year=${year}`);
}

export function saveWeeklyEvents(data: {
  projectId: string;
  month: number;
  year: number;
  data: any[];
  configs?: any[];
}) {
  return apiFetch<WeeklyEventRaw>('/weekly-events', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
