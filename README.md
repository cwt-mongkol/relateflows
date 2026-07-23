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
npm install
npm run dev
```

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_LINE_CLIENT_ID=your_line_client_id
```

Login falls back to demo mode if these are empty.

## Build

```bash
npm run build
npm run preview
```

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
