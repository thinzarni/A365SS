# Project Specification: A365 HR - Self-Service (A365SS_New)

## 1. Overview
**A365 HR - Self-Service** is a modern, responsive web application designed as the next-generation replacement for the existing Flutter-based employee self-service portal. It provides employees and managers with a centralized dashboard for managing attendance, leave requests, claims, team collaboration, and organizational structures.

## 2. Objectives
- **Modern Infrastructure**: Transition from Flutter to a performant React + Vite + TypeScript stack.
- **Architectural Parity**: Maintain logic and feature parity with the legacy mobile application while optimizing for web interactions.
- **Scalability & Multi-tenancy**: Support dynamic domain selection and organization-specific configurations through a robust multi-tenant backend integration.
- **Premium UX/UI**: Deliver a high-fidelity, responsive user interface with rich aesthetics, real-time updates, and smooth transitions.

## 3. Technology Stack

### Frontend Core
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 7](https://vitejs.dev/)
- **Language**: [TypeScript 5.9](https://www.typescriptlang.org/)
- **Routing**: [React Router 7](https://reactrouter.com/)

### State & Data Management
- **Global State**: [Zustand](https://zustand-demo.pmnd.rs/) (Lightweight, persistent store for auth and session data)
- **Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query/latest) (Server-state management, caching, and background synchronization)
- **API Client**: [Axios](https://axios-http.com/) (Customized with interceptors for multi-tenant headers and token management)

### Styling & UI
- **Styling**: Vanilla CSS with [CSS Modules](https://github.com/css-modules/css-modules) for component-level scoping.
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [React Hot Toast](https://react-hot-toast.com/)
- **Typography**: Inter (Sans-serif)

### Authentication & Security
- **Identity Provider**: Azure AD (Microsoft Entra ID) using `@azure/msal-react`.
- **Auth Flows**: Supports standard sign-in, silent authentication, and QR-based login.
- **Access Control**: Higher-order components (`AuthGuard`) for protecting routes.

### Real-time & Internationalization
- **Real-time**: Custom WebSocket implementation (`ChatSocket`) mirroring Flutter logic.
- **I18n**: [i18next](https://www.i18next.com/) with browser language detection and multi-language support (English, Myanmar).

## 4. Feature Modules

### 4.1. Core Dashboard
- **Attendance Tracking**: Real-time "Time In" and "Time Out" status.
- **Monthly Summary**: High-level counters for attendance, check-ins, activities, and leaves.
- **Quick Actions**: Grid of shortcuts for common tasks (Leave, Claims, Requests, etc.).

### 4.2. Request Management
- **List & Detail**: Unified interface for tracking Personal Requests and Manager Approvals.
- **New Request**: Guided forms for submitting various HR requests.
- **Status Tracking**: Visual indicators for pending, approved, and rejected states.

### 4.3. Leave & Claims
- **Leave Application**: Comprehensive leave request system with balance checking.
- **Leave Summary**: Detailed breakdown of entitlement versus usage.
- **Claim Management**: Submission and tracking of expense claims with attachment support.

### 4.4. Team & Organization
- **Team View**: Hierarchical view of team members, reporting lines, and attendance status.

### 4.5. Collaboration (Chat)
- **Messaging**: Real-time 1:1 and group messaging.
- **Mentions**: Support for @mentions in conversations.
- **WebSocket Service**: persistent socket connection for instant message delivery and read receipts.

## 5. Directory Structure
```text
src/
├── components/          # Reusable UI and Layout components
│   ├── auth/            # AuthGuard and login logic
│   ├── layout/          # AppLayout, Sidebar, Header
│   └── ui/              # Shared UI primitives (Button, Input, Modal)
├── config/              # Centralized configuration (API routes, MSAL)
├── i18n/                # Translation files and locale setup
├── lib/                 # Modular service clients (API, WebSocket, Utils)
├── pages/               # Feature-specific page components
├── router/              # Route definitions and navigation logic
├── stores/             # Zustand persistent stores
└── styles/              # Global CSS, tokens, and themes
```

## 6. Development Workflow
1. **Local Development**: `npm run dev`
2. **Build**: `npm run build` (Compiles TypeScript and bundles via Vite)
3. **Linting**: `npm run lint` (ESLint with React Refresh support)
## 7. Future Roadmap
- **Advanced Reporting**: Integration of PowerBI or D3.js for deep organizational insights and workforce planning.
- **Enhanced Mobile Web**: Further optimization for mobile browser performance and touch-friendly interactions.
- **Workflow Automation**: BPMN-based workflow engine for sophisticated request approval paths.
- **Offline Capabilities**: Service worker implementation for basic viewing of attendance and requests in offline mode.
