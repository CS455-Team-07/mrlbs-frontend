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

Members and administrators sign in with an IITK email and password. Choose **Forgot password or first-time sign-in?** to set or reset a password using a code sent by the backend. The backend needs SMTP configuration to send the code. The frontend verifies the server session before restoring a cached profile. Set `VITE_API_BASE_URL` to point to the backend.

## Current status

Mailbox verification is the normal sign-in flow. It is a practical workaround for users who cannot complete OAuth consent; possession of an `@iitk.ac.in` mailbox is the identity check. Booking and user-profile workflows remain future work.

## AI Engineering Log

Material AI-assisted engineering work is documented in [`AI_ENGINEERING_LOG.md`](AI_ENGINEERING_LOG.md). [`AGENTS.md`](AGENTS.md) contains the repository workflow for future AI-assisted development.
