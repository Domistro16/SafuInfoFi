import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Projects
export const fetchProjects = async (active = true) => {
  const response = await api.get('/projects', {
    params: { active },
  });
  return response.data;
};

export const fetchProject = async (id: string) => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

export const fetchProjectStats = async (id: string) => {
  const response = await api.get(`/projects/${id}/stats`);
  return response.data;
};

// Leaderboards
export const fetchLeaderboard = async (projectId: string, limit = 100) => {
  const response = await api.get(`/leaderboards/${projectId}`, {
    params: { limit },
  });
  return response.data;
};

export const fetchUserRanking = async (projectId: string, address: string) => {
  const response = await api.get(`/leaderboards/${projectId}/user/${address}`);
  return response.data;
};

// Users
export const fetchUser = async (address: string) => {
  const response = await api.get(`/users/${address}`);
  return response.data;
};

export const fetchUserStats = async (address: string) => {
  const response = await api.get(`/users/${address}/stats`);
  return response.data;
};

export const linkWallet = async (data: {
  walletAddress: string;
  xHandle: string;
  safuDomain: string;
}) => {
  const response = await api.post('/users/link-wallet', data);
  return response.data;
};

// Posts
export const fetchProjectPosts = async (
  projectId: string,
  options?: { limit?: number; sortBy?: string }
) => {
  const response = await api.get(`/posts/${projectId}`, {
    params: options,
  });
  return response.data;
};

export const fetchTopPosts = async (
  projectId: string,
  limit = 10,
  timeframe = '7d'
) => {
  const response = await api.get(`/posts/${projectId}/top`, {
    params: { limit, timeframe },
  });
  return response.data;
};
