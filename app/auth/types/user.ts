export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;
  cover?: string;
  bio?: string;
  role?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  followStatus?: string;
  mutualFriendCount?: number;
}

export interface LoginResponse {
  access_token: string;
}

export interface AuthError {
  message?: string;
  error?: string;
}
