# Social Media App (Next.js)

A modern, minimal social media frontend built with Next.js (App Router). This repository contains the UI and a small set of server-side route handlers implemented under `app/` using the Next.js App Router. The project uses Mongoose/MongoDB for persistence in the API route handlers.

This README has been updated to reflect the actual files and APIs discovered in the repository (not just a generic template).

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Quick Features](#quick-features)
- [Project Structure (actual)](#project-structure-actual)
- [API routes (what exists)](#api-routes-what-exists)
- [Installation & Local development](#installation--local-development)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Notes on Frontend components & pages](#notes-on-frontend-components--pages)
- [Detailed components reference (partial, generated from code search)](#detailed-components-reference-partial-generated-from-code-search)
- [Testing and Linting](#testing-and-linting)
- [Deploying](#deploying)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License & Contact](#license--contact)

## Overview

The repository implements a Next.js App Router frontend for a social media application with built-in API route handlers under `app/api/*`. The UI lives under `app/uis` and uses client-side React components that call the local API routes. The server-side code uses Mongoose models defined in `app/api/models.js`.

## Tech Stack

- Next.js (App Router)
- React (client components + hooks)
- Node.js (Next API route handlers)
- MongoDB + Mongoose for DB models
- MUI (Material UI) used in some UI pages; Tailwind or other styling may be used elsewhere
- JavaScript (repository is in JS; TypeScript is optional)

## Quick Features

- User authentication flow hooks (login, current-user lookups) in the UI
- Posts API: create, list (with pagination), single post get/update/delete
- Comments and likes handlers
- Per-user post listing endpoint
- Simple crypto/wallet endpoints for wallet + transactions (basic operations)
- Admin UI pages to inspect users/posts

## Project Structure (actual)

Top-level important paths and files discovered:

- app/
  - api/
    - models.js — Mongoose schemas and connectToDatabase() (exports User, Post, Comment, Friend, Wallet, Transaction, EthersTx, Admin, etc.)
    - posts/
      - route.js — GET all posts, POST create post
      - [id]/route.js — GET single post, PUT update, DELETE
      - [id]/comments/route.js — GET comments, POST new comment
      - [id]/like/route.js — POST like/unlike
      - user/[userId]/route.js — GET posts by user
    - crypto/route.js — wallet and transaction operations (get-wallets, get-transactions, create-wallet, add-balance, adjust-balance)
    - (UI expects) users/auth endpoints like:
      - /api/users?operation=login
      - /api/users?operation=get-current
      - /api/auth/me (some UI code tries this)
  - uis/
    - page.js — Login / welcome page (client)
    - user-space/
      - profile/page.js — Profile page (client)
      - creation/page.js — Creation list page (client)
      - creation/new/page.js — New post form (client)
      - chat/ — chat components and pages
      - crypto-ethers/ — wallet/ethers components
    - crypto/
      - layout.js — Crypto layout used by wallet UI
  - admin/
    - [id]/page.js — Admin user inspector page

- README.md (this file)
- public/ — static assets (if present)
- styles/ — global styles (if present)
- package.json
- next.config.js (if present)

If you want a complete file tree, I can generate it from the repository.

## API routes (what exists and shapes inferred from code)

Below are the available API routes and the expected request/response shapes inferred from the source:

- GET /api/posts
  - Query params: page, limit, userId, category
  - Response: { success: true, posts: [...], pagination: { page, limit, total, pages } }

- POST /api/posts
  - Body: { title, content, description?, images?, tags?, category?, userId }
  - Validation: title, content, userId required
  - Response 201: { success: true, post, message }

- GET /api/posts/:id
  - Response: { success: true, post }

- PUT /api/posts/:id
  - Body: { title?, content?, description?, images?, tags?, category?, isPublic?, userId }
  - Authorization: checks that String(post.user) === String(userId)
  - Response: { success: true, post, message }

- DELETE /api/posts/:id
  - Body: { userId }
  - Authorization: checks that String(post.user) === String(userId)
  - Response: { success: true, message }

- GET /api/posts/user/:userId
  - Query params: page, limit, includePrivate (true|false)
  - Response: { success: true, posts: [...], user: { _id, firstName, lastName, pseudo, email }, pagination }

- GET /api/posts/:id/comments
  - Query params: page, limit
  - Response: { success: true, comments: [...], pagination }

- POST /api/posts/:id/comments
  - Body: { content, userId }
  - Response 201: { success: true, comment, message }

- POST /api/posts/:id/like
  - Body: { userId }
  - Toggles like/unlike
  - Response: { success: true, post, liked: boolean, likeCount }

- GET /api/crypto?operation=get-wallets|get-wallet|get-transactions
- POST /api/crypto (operations via query param or body.operation)
  - Supported ops: create-wallet, add-balance, adjust-balance
  - Responses: { success: true, wallet } or { success: true, transactions }

- Additional endpoints expected by UI (not enumerated in this README): /api/users and /api/auth (UI calls `/api/users?operation=get-current`, `/api/users?operation=login`, `/api/auth/me`). Please check `app/api/users` or auth route files if present.

## Installation & Local development

1. Clone the repo:
   git clone https://github.com/TageYassir/Social_Media_App.git
2. Change into the project directory:
   cd Social_Media_App
3. Install dependencies:
   npm install
   # or
   yarn
   # or
   pnpm install
4. Configure environment variables (see below).
5. Run development server:
   npm run dev
   # Opens on http://localhost:3000

This project uses MongoDB via Mongoose — for local dev you can run a local MongoDB server or use a cloud instance and set MONGODB_URI accordingly.

## Environment Variables

Create a `.env.local` in the project root and set at least:

- MONGODB_URI=mongodb://localhost:27017/social_media_app
- NEXT_PUBLIC_API_URL=http://localhost:3000
- NEXT_PUBLIC_WEBSOCKET_URL= (optional)
- NEXTAUTH_SECRET= (optional; only if using NextAuth or similar)

The API route handlers call `connectToDatabase()` from `app/api/models.js` — ensure `MONGODB_URI` or equivalent is used in that module.

## Available Scripts

- npm run dev — start development server
- npm run build — build production app
- npm run start — start production server
- npm run lint — run linter (if configured)
- npm run test — run tests (if configured)

## Notes on Frontend components & pages

I inspected several client pages and components; below are the important ones I found and where they call the API:

- app/uis/page.js — Login / welcome page. Uses MUI imports (Box, Button, TextField, etc.). Calls POST `/api/users?operation=login` and stores user in localStorage.
- app/uis/user-space/profile/page.js — Profile page. Fetches current user (`/api/users?operation=get-current`) and retrieves posts; contains robust helpers for fetching friend counts across multiple endpoints.
- app/uis/user-space/creation/page.js — Fetches and lists the current user's posts via `/api/posts/user/${userId}`.
- app/uis/user-space/creation/new/page.js — New post form that POSTs to `/api/posts` with `userId`.
- app/uis/crypto/layout.js — Layout and helpers for crypto/wallet UI; calls `/api/crypto` operations like `get-wallets`, `get-transactions`, `create-wallet`.
- app/admin/[id]/page.js — Admin page that fetches `/api/users/${id}` and `/api/posts?userId=${id}`.

Below are documented components found in the repository (each entry includes purpose, inferred props and example usage). These entries were generated by inspecting each file's default export and top-level functions.

1) app/uis/page.js
- Component: UisLoginPage (default export)
- Purpose: Login / welcome page — presents a login form and handles login flow (POST /api/users?operation=login), marks user online, stores user in localStorage and redirects to /uis/user-space.
- Props: none (page component)
- Example usage: This is the page rendered at /uis (no manual invocation required).
- Notes: Uses MUI components and includes password visibility toggle and robust markUserOnline helper.

2) app/uis/style.js
- Export: rawTheme (Material-UI theme factory, default export)
- Purpose: Central MUI theme configuration (palette, typography, shadows, shapes).
- Props: N/A — export used by ThemeProvider.
- Example usage:
  import { ThemeProvider } from '@mui/material'
  import rawTheme from './app/uis/style'
  <ThemeProvider theme={rawTheme}>{children}</ThemeProvider>

3) app/uis/crypto/layout.js
- Component: RootLayout (default export)
- Purpose: Layout for crypto section; manages nav, invitations, and resolves current user id.
- Props:
  - children: ReactNode
- Example usage:
  <RootLayout>
    <YourCryptoPage />
  </RootLayout>

4) app/uis/user-space/crypto-ethers/SendEther.js
- Component: SendEther (default export)
- Purpose: UI to send ETH using an ethers.js signer. Validates recipient and amount, estimates gas, and sends transaction.
- Props:
  - signer: ethers.Signer (required) — object used to sign/send the transaction
  - address: string (optional) — sender address
- Example usage:
  <SendEther signer={mySigner} address={myAddress} />

- Notes: Accepts ethers v5 or v6 (tries parseEther/formatEther/format). Shows gas estimate and validates address using ethers utility.

5) app/uis/user-space/crypto-ethers/ConnectWallet.js
- Component: ConnectWallet (default export)
- Purpose: Connects to injected Ethereum provider (MetaMask), obtains address and balance, optionally calls onConnected callback.
- Props:
  - onConnected: function(address, provider, signer) — called after successful connect
  - allowDisconnect: boolean (default true) — if true allow disconnect actions in UI
- Example usage:
  <ConnectWallet onConnected={(addr, provider, signer) => setSigner(signer)} />

6) app/uis/user-space/chat/[id]/ChatClient.js
- Component: ChatClient (default export)
- Purpose: Message/chat UI for a given receiver; handles messages list, recording audio, file uploads, marking seen, and masking URL for privacy.
- Props:
  - receiver: object | null (may be the populated user object)
  - receiverId: string | null (receiver id)
- Example usage:
  <ChatClient receiver={userObj} />
  or
  <ChatClient receiverId="605..." />

- Notes: Resolves receiverId from props, route params, or query. Uses many internal states (messages, recording, upload).

7) app/uis/user-space/chat/ConversationsList.js.js
- Component: ConversationsList (default export)
- Purpose: Lists user conversations with search and unread counts. Fetches messages via /api/messages?operation=get-by-user&userId=...
- Props: none
- Example usage:
  <ConversationsList />

- Note: File name appears to be "ConversationsList.js.js" in the repo; consider renaming to ConversationsList.js to avoid tooling confusion.

8) app/uis/user-space/ensureAuthClient.js
- Component: EnsureAuthClient (default export)
- Purpose: Client-only component that enforces authentication by redirecting to /uis if no user is present in localStorage.
- Props: none
- Example usage:
  // Place near top-level of client pages that require auth
  <EnsureAuthClient />

9) app/uis/user-space/chat/page.js
- Component: ChatIndexPage (default export)
- Purpose: Page wrapper that renders ConversationsList (index of chats)
- Props: none
- Example usage: Page automatically rendered at chat index.

10) app/uis/user-space/chat/MessageModal.js
- Component: MessageModal (default export)
- Purpose: Simple dialog/modal to display message details (senderId, receiverId, sentAt, text)
- Props:
  - open: boolean
  - onClose: function
  - message: object { senderId, receiverId, sentAt, text, ... }
- Example usage:
  <MessageModal open={open} onClose={() => setOpen(false)} message={msg} />

Important notes about this generated list
- The code search used to enumerate these components returned up to 10 results; results may be incomplete. If you want the full `app/uis` index I will run a complete repository enumeration and produce entries for every component.
- Also, I noticed a probable filename issue: `ConversationsList.js.js` — consider renaming to `ConversationsList.js`.

Would you like me to:
- (1) Enumerate every file under `app/uis` and produce a complete components reference (full props, inferred types, example usage) and then open a PR updating README with that section, OR
- (2) Produce a smaller, curated components index (only major pages and reusable components), OR
- (3) Open a PR now with the partial components reference above inserted into README (target branch: main)?

If you choose a PR, tell me the target branch (default `main`) and I will open it for you.

## Testing and Linting

- The project does not appear to include an explicit test setup in the inspected files. Recommended:
  - Unit tests: Jest + React Testing Library
  - E2E: Playwright or Cypress
  - Linting: ESLint + Prettier

## Deploying

- Vercel is recommended for Next.js App Router apps.
- Set `MONGODB_URI` and any other secrets in the deployment environment.
- If using server-side features (API routes), ensure your DB is accessible from the deployment environment.

## Contributing

- Create feature branches from `main`.
- Follow code style (Prettier/ESLint), include tests for new behavior.

## Troubleshooting

- "Failed to connect to MongoDB" — verify `MONGODB_URI` and that the DB is running.
- Hydration or SSR/client mismatches — check client-only hooks and avoid non-deterministic server rendering.
