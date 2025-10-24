import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard, fetchUserRanking } from '../api';

export function useLeaderboard(projectId: string, limit = 100) {
  return useQuery({
    queryKey: ['leaderboard', projectId, limit],
    queryFn: () => fetchLeaderboard(projectId, limit),
    enabled: !!projectId,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useUserRanking(projectId: string, address?: string) {
  return useQuery({
    queryKey: ['userRanking', projectId, address],
    queryFn: () => fetchUserRanking(projectId, address!),
    enabled: !!projectId && !!address,
  });
}
