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
VITE_AUTH_ENABLED=false
```

Authentication is turned off by default for the current project demo. The frontend uses a demo administrator profile and expects the backend to run with authentication disabled too. Set `VITE_AUTH_ENABLED=true` to restore the Google sign-in flow; the backend must also be configured with `AUTH_ENABLED=true` and valid Google OAuth credentials. `VITE_API_BASE_URL` configures API calls and Google OAuth redirects from the same backend.

## Current status

The Google OIDC flow remains available when authentication is enabled. Booking and user-profile workflows remain future work.

## AI Engineering Log

Material AI-assisted engineering work is documented in [`AI_ENGINEERING_LOG.md`](AI_ENGINEERING_LOG.md). [`AGENTS.md`](AGENTS.md) contains the repository workflow for future AI-assisted development.
