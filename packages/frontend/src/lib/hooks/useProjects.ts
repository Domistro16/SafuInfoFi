import { useQuery } from '@tanstack/react-query';
import { fetchProjects, fetchProject, fetchProjectStats } from '../api';

export function useProjects(active = true) {
  return useQuery({
    queryKey: ['projects', active],
    queryFn: () => fetchProjects(active),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
  });
}

export function useProjectStats(id: string) {
  return useQuery({
    queryKey: ['projectStats', id],
    queryFn: () => fetchProjectStats(id),
    enabled: !!id,
  });
}
