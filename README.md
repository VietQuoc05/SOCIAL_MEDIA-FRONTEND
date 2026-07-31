# Social Media Frontend

A feature-rich social media frontend built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, and **Socket.IO**. This is the client-side companion to the [Social Media Backend](https://github.com/VietQuoc05/SOCIAL_MEDIA-BACKEND).

---

## 🚀 Features

### 🔐 Authentication
- Login, Register, Email Verification flows
- Forgot / Reset password
- **Switch Account** modal with up to 3 saved accounts for quick switching
- Login with email/password for a new account directly from the sidebar

### 🏠 Home Feed
- Infinite scroll feed with cursor-based pagination
- Like/unlike posts with optimistic UI updates
- Real-time reaction count sync via WebSocket
- Multi-image post navigation
- **Suggested for You** sidebar — recommends users with mutual friends
- **Switch Account** button in sidebar for account switching
- **Preferences** — Dark/Bright theme toggle

### 👤 Profile
- View user profiles with avatar, bio, followers/following/posts stats
- Follow/Unfollow users
- **Mutual friends** count display
- Edit own profile (username, display name, bio, avatar, cover photo)

### 📝 Posts
- Create posts with captions and multiple image uploads
- Delete own posts
- View post detail with full-size images

### 💬 Comments
- Add, edit, and delete comments
- Nested replies (threaded comments)
- Like/unlike comments

### 💬 Real-time Chat
- One-on-one messaging with Socket.IO
- Send text messages and images
- Message history with cursor-based pagination
- Unread message badges on header
- Typing indicators
- Read receipts

### 🔍 Search
- Real-time user search from header
- Dedicated search results page

### 🎨 Themes
- **Dark mode** (default): dark background, green accent
- **Bright mode**: light background, blue accent (Instagram-style)
- Theme persisted in localStorage
- Toggle via Preferences modal from avatar dropdown

### 📱 Mobile Support
- Capacitor Android configuration for native app builds
- Responsive design with Tailwind CSS

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 4 |
| **Real-time** | Socket.IO Client |
| **HTTP Client** | Native Fetch API |
| **Mobile** | Capacitor 8 (Android) |

---

## 🛠 Local Development

### Prerequisites
- Node.js 20+
- Backend API running (see backend README)

### Setup

```bash
# Install dependencies
npm install

# Set environment variables (see below)

# Start dev server
npm run dev
```

### Environment Variables

Create a `.env.local` file or set these in your environment:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000` |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket URL | `http://localhost:3000` |
| `NEXT_PUBLIC_STORAGE_PUBLIC_URL` | Public storage URL (optional) | — |

> **Note:** `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` default to `http://localhost:3000` in code. Override via environment variables for production.

---

## 📁 Project Structure

```
app/
├── layout.tsx                     # Root layout with ThemeProvider
├── page.tsx                       # Landing page (Login / Register links)
├── globals.css                    # Global styles + theme CSS variables
├── login/                         # Login page
├── register/                      # Register page
├── forgot-password/               # Forgot password page
├── reset-password/                # Reset password page
├── resend-verify-email/           # Resend verification email page
├── auth/
│   ├── verify/                    # Email verification page
│   └── components/
│       └── AuthForm.tsx           # Shared auth form component
├── home/
│   └── page.tsx                   # Main feed + right sidebar
├── profile/
│   └── page.tsx                   # User profile page
├── edit-profile/
│   └── page.tsx                   # Edit profile page
├── post-detail/
│   ├── page.tsx                   # Post detail page entry
│   └── PostDetailContent.tsx      # Post detail with comments
├── post/
│   └── page.tsx                   # Create / view post
├── chat/
│   └── page.tsx                   # Real-time chat
├── search/
│   └── page.tsx                   # Search results
└── api/                           # API routes (if any)

components/
├── Header.tsx                     # Global header with search, nav, avatar menu
├── ThemeProvider.tsx              # Dark/Bright theme context provider
├── CreatePostModal.tsx            # Modal for creating new posts
├── SuggestedForYou.tsx            # Suggested users sidebar widget
├── SwitchAccountModal.tsx         # Switch account modal with saved accounts
└── PreferencesModal.tsx           # Theme preferences modal

services/
├── api.ts                         # HTTP client + all API service methods
└── socket.ts                      # Socket.IO client initialization
```

---

## 🎨 Theme System

The app supports two themes controlled by CSS variables on the `<html>` element:

- **`.theme-dark`** (default): `#121212` background, `#1ed760` green accent
- **`.theme-bright`**: `#ffffff` background, `#0095f6` blue accent

Switching themes updates all UI elements instantly via CSS variable overrides. The selection is persisted in `localStorage`.

---

## 📄 Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Login |
| `/register` | Register |
| `/forgot-password` | Forgot password |
| `/reset-password?token=` | Reset password |
| `/resend-verify-email` | Resend verification email |
| `/auth/verify?token=` | Verify email |
| `/home` | Main feed (authenticated) |
| `/profile?userId=` | User profile |
| `/edit-profile` | Edit own profile |
| `/post-detail?postId=` | View post with comments |
| `/chat` | Real-time messaging |
| `/search?q=` | Search users |
| `/explore` | Explore page with search, recent searches, and trending posts |

---

## 🔌 API Integration

The frontend communicates with the backend REST API via a typed service layer in `services/api.ts`. All API calls include JWT Bearer token authentication (when available). Real-time features use Socket.IO via `services/socket.ts`.

### Key Service Modules

| Module | Description |
|--------|-------------|
| `authApi` | Login, register, verify email, reset password |
| `usersApi` | Get user, search, update profile |
| `followApi` | Follow/unfollow, followers/following, stats, suggested users |
| `postsApi` | CRUD posts, feed with cursor pagination |
| `commentsApi` | CRUD comments with nested replies |
| `reactionsApi` | Like/unlike posts and comments |
| `chatApi` | Conversations, messages, read receipts |

---

## 📄 License

MIT