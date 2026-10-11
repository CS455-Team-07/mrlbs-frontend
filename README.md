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
VITE_AUTH_BASE_URL=http://localhost:8080
```

`VITE_API_BASE_URL` configures API calls. `VITE_AUTH_BASE_URL` configures the backend OAuth redirect endpoint. The login page redirects to Google and displays the verified account after the backend accepts its institutional identity.

## Current status

Google OIDC sign-in is implemented for the configured institutional domain. Booking and user-profile workflows remain future work.

## AI Engineering Log

Material AI-assisted engineering work is documented in [`AI_ENGINEERING_LOG.md`](AI_ENGINEERING_LOG.md). [`AGENTS.md`](AGENTS.md) contains the repository workflow for future AI-assisted development.
