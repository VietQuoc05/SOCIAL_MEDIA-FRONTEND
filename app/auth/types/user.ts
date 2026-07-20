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
  isPublicFollowers?: boolean;
  isPublicFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  followStatus?: string;
  mutualFriendCount?: number;
  isPrivate?: boolean;
}

export interface LoginResponse {
  access_token: string;
}

export interface AuthError {
  message?: string;
  error?: string;
}
