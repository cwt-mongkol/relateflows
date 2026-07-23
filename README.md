# RelateFlows

> Enterprise CRM with multi-channel social inbox — manage deals, leads, and conversations from one dashboard.

## Stack

- **React 19** + **TypeScript 6** + **Vite 8**
- **Tailwind CSS 4** + **DaisyUI 5**
- **lucide-react** — icons

## Features

- **Pipeline (Kanban)** — drag-and-drop deal management with dynamic stages, color picker, per-user stage persistence
- **Social Inbox** — unified Facebook / Instagram / LINE messaging, convert chat to leads, allocate to sales
- **Dashboard** — deal overview with metrics
- **Settings** — per-account language (en/th/zn), theme (light/dark/system), brand colors, pipeline stage CRUD
- **Auth** — Google, LINE, and Facebook login (demo mode without real OAuth)
- **Dark mode** — full CSS overrides with proper contrast hierarchy
- **Text Scramble** — decode animation on the login brand

## Getting Started

```bash
# Frontend
npm install
npm run dev

# Backend (separate terminal)
cd backend
npm install
npm run dev
```

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_LINE_CLIENT_ID=your_line_channel_id
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_API_URL=http://localhost:5000
JWT_SECRET=replace-with-strong-random-secret
DATABASE_URL=postgresql://user:pass@localhost:5432/relateflows
```

Login falls back to demo mode if the backend is unavailable.

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Required Environment Variables (set in Vercel Dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend URL. Defaults to your Vercel domain `/api/*` |
| `JWT_SECRET` | Yes | Strong random string ≥32 chars for signing JWT |
| `DATABASE_URL` | No | PostgreSQL connection string. Without it, the app runs in demo mode |

### How it works

- **Frontend**: Vite builds to `dist/`, served as static files by Vercel's CDN.
- **Backend API**: `api/index.js` exports the Express app. Vercel wraps it as a serverless function at `/api/*`.
- **Database**: If `DATABASE_URL` is not set, all API endpoints return 500 and the frontend falls back to offline mock data — the app is fully usable in demo mode.
- **Auth**: Without real OAuth credentials, Google/LINE/Facebook login uses demo mode.

## Build

---

## Security Architecture

### Token Model (Dual-Token)

| Token | Lifetime | Purpose |
|-------|----------|---------|
| **Access Token** | 15 minutes | Bearer auth for every API request |
| **Refresh Token** | 7 days | Obtain new access tokens; stored in DB for revocation |

- Access tokens are short-lived to limit damage if leaked.
- Refresh tokens are rotated on each use (old one revoked in DB).
- On logout, the refresh token is immediately revoked.
- All API calls automatically retry with a new access token on 401.

### Inactivity Auto-Logout (30 min)

- The app tracks `mousemove`, `mousedown`, `click`, `keydown`, `touchstart`, `touchmove`, `scroll`, `wheel` events.
- After **30 minutes of no interaction**, the session is fully cleared (both tokens + user data removed), the refresh token is revoked server-side, and the user is redirected to login.
- A periodic check runs every 60 seconds.

### Security Checklist for Production

- [ ] Set `JWT_SECRET` to a cryptographically random string (≥32 chars)
- [ ] Serve **only over HTTPS** (Vite `preview` with TLS, or a reverse proxy like nginx/Caddy)
- [ ] Set `httpOnly` + `Secure` + `SameSite=Strict` cookies for refresh tokens instead of `localStorage` (requires backend + proxy)
- [ ] Validate OAuth tokens server-side with each provider's SDK (Google `google-auth-library`, Facebook `graph-api`, LINE `@line/bot-sdk`)
- [ ] Rate-limit `/api/auth/*` endpoints to prevent brute-force/guess attacks
- [ ] Use `helmet` middleware on Express for security headers
- [ ] Rotate secrets periodically and revoke all refresh tokens on secret rotation

## Project Structure

```
src/
├── components/
│   ├── auth/          — LoginPage, TextScramble
│   ├── dashboard/     — DashboardView, metrics
│   ├── inbox/         — InboxView, chat thread, lead allocation
│   ├── layout/        — Sidebar, Header, MainContent
│   ├── modals/        — AddDeal, AddContact, AddWorkflow, DealDetailModal
│   ├── pipeline/      — PipelineView (Kanban)
│   ├── settings/      — SettingsView
│   └── ui/            — shared UI components
├── context/           — AuthContext, CRMContext, SettingsContext
├── data/              — mockData (initial stages, leads, chat messages)
├── types/             — TypeScript interfaces (Deal, Lead, PipelineStage, etc.)
├── App.tsx            — auth gate + route switching
├── main.tsx           — provider hierarchy
└── index.css          — Tailwind + dark mode overrides
```
