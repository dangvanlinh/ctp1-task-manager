import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBuilds, createBuild, updateBuild, deleteBuild, addMilestone, deleteMilestone, type CreateBuildPayload } from '../api/builds';

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['builds'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateBuildPayload>) => updateBuild(id, data),
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

export function useAddMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ buildId, data }: { buildId: string; data: { name: string; date: string; type: string } }) =>
      addMilestone(buildId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['builds'] }),
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMilestone,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['builds'] }),
  });
}
