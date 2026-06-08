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
}

export interface LoginResponse {
  access_token: string;
}

export interface AuthError {
  message?: string;
  error?: string;
}
