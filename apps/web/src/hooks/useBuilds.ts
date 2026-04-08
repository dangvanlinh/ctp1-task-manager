import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBuilds, createBuild, updateBuild, deleteBuild } from '../api/builds';

export function useBuilds(projectId: string, month: number, year: number) {
  return useQuery({
    queryKey: ['builds', projectId, month, year],
    queryFn: () => fetchBuilds(projectId, month, year),
    enabled: !!projectId,
  });
}

export function useCreateBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBuild,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['builds'] }),
  });
}

export function useUpdateBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string }) => updateBuild(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['builds'] }),
  });
}

export function useDeleteBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBuild,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['builds'] }),
  });
}
