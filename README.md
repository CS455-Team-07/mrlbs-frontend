# Multi-Resource Lab Booking System (MRLBS)

The frontend repository for the CS455 Software Engineering project. It provides the initial user interface scaffold for a future system that will support members and administrators using shared lab resources.

## Technology stack

- React with TypeScript
- Vite
- Tailwind CSS
- React Router
- ESLint and Prettier
- Vitest and React Testing Library

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm

## Installation

```sh
npm install
```

## Development

```sh
npm run dev
```

## Build

```sh
npm run build
```

## Tests and code quality

```sh
npm test
npm run lint
npm run format:check
```

## Environment variables

Copy `.env.example` to `.env` and set the Vite environment variables needed for local development:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

`VITE_API_BASE_URL` configures both API calls and Google OAuth redirects because both endpoints are served by the same backend. For local sign-in, start the backend on port `8080` with its database and Google OAuth credentials configured before choosing **Continue with Google**. If the backend is stopped or uses a different port, update `VITE_API_BASE_URL` and restart the Vite dev server.

## Current status

Google OIDC sign-in is implemented for the configured institutional domain. Booking and user-profile workflows remain future work.

## AI Engineering Log

Material AI-assisted engineering work is documented in [`AI_ENGINEERING_LOG.md`](AI_ENGINEERING_LOG.md). [`AGENTS.md`](AGENTS.md) contains the repository workflow for future AI-assisted development.
