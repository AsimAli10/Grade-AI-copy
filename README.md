# WhatTheFood

An AI-powered nutrition assistant that turns food photos into actionable insights, complete with dashboards, marketing pages, embeddable widgets, and subscription management. WhatTheFood helps users understand their meals, track macro goals, and upgrade to premium plans—all while giving operators full control over branding, analytics, and billing.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Feature Highlights](#feature-highlights)
3. [System Architecture](#system-architecture)
4. [Tech Stack](#tech-stack)
5. [Repository Structure](#repository-structure)
6. [Environment Configuration](#environment-configuration)
7. [Local Development](#local-development)
8. [Database & Supabase](#database--supabase)
9. [Edge Functions & AI Pipeline](#edge-functions--ai-pipeline)
10. [Running Quality Checks](#running-quality-checks)
11. [Deployment Guide](#deployment-guide)
12. [Troubleshooting Checklist](#troubleshooting-checklist)
13. [Contributing & Maintenance](#contributing--maintenance)

---

## Project Overview

WhatTheFood is a full-stack Next.js application that blends AI analysis with rich UX:

- **Marketing Site** – Landing, features, pricing, blog, and how-it-works pages styled for both light and dark themes.
- **Authenticated App** – Dashboards, scan history, analytics, profile, billing, and settings managed through Supabase auth.
- **Embeddable Widget** – Create, customize, and embed nutrition widgets with live previews and code snippets.
- **AI Nutrition Engine** – Supabase Edge Function calls Google Gemini to return hygienic, numerical nutrition data with confidence scores.
- **Monetization** – Stripe billing, plan upgrades, widget tiers, and daily usage limits backed by Postgres tables and policies.

---

## Feature Highlights

- **Meal Scanning**: Upload an image to generate calories, macros, and ingredients with sanitized numeric responses.
- **Serving Size Intelligence**: Auto-suggest average servings (e.g., “1 cup ≈ 250 g”) and allow decimal servings up to 3 places.
- **Daily Free Limits**: Anonymous users get 10 lifetime scans; registered free users get 10 per day, enforced server-side via `free_scan_sessions`.
- **Widget Dashboard**: Separate create/edit forms, branded toggles, embed code previews, and per-widget URLs for easy distribution.
- **Marketing UX**: Single scrollbar layout, redesigned hero + footer, responsive blog cards with consistent framing, and accessible mobile navigation.
- **Account Area**: Dashboard insights, scan history, saved widgets, billing management, and upgrade prompts tied into Stripe products.
- **Logout Hardening**: Server API route clears Supabase cookies while client clears local session state to avoid “Auth session missing!” loops.
- **Dark Mode Support**: Footer, cards, and widgets honor Tailwind `dark:` variants for consistent appearance.

---

## System Architecture

```
Next.js App Router (pages in app/)
└── Marketing routes (app/(marketing)/...)
└── Auth layout (app/(auth)/layout.tsx)
└── Authenticated application (app/(app)/...)
    └── API routes (app/api/*)
    └── Client components ("use client") in src/components
Supabase Backend
└── Postgres tables, RLS policies, Supabase Auth
└── Edge Functions (supabase/functions/*)
Stripe Billing
└── Checkout sessions, webhooks, plan synchronization
Google Gemini
└── Image-to-nutrition analysis via `analyze-food` function
```

- **State Management**: Hook-based with React Query for async data, `useForm` for forms, and light context usage.
- **Styling**: Tailwind + shadcn/ui components, with custom utility classes for layout consistency.
- **APIs**: Next.js API routes for free-scan tracking and auth signout; Supabase Edge Functions for AI, billing, and content feeds.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI / Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui, Radix UI, lucide-react |
| State / Data | TanStack Query, react-hook-form, zod |
| Backend | Supabase (Auth, Postgres, Storage, Functions) |
| AI | Google Gemini models via Edge Functions |
| Billing | Stripe Checkout + Webhooks |
| Tooling | ESLint, TypeScript, PostCSS, tailwind-merge |

---

## Repository Structure

```
app/                  # App Router pages (marketing, auth, app)
src/components/       # Reusable UI + feature-specific components
src/views/            # Legacy views wrapped by App Router pages
src/utils/            # Helpers for scans, subscriptions, URLs, etc.
src/hooks/            # Custom hooks (useBlogPosts, use-toast, use-mobile)
supabase/functions/   # Edge Functions (AI, checkout, blog feed, etc.)
supabase/migrations/  # Postgres schema migrations (*.sql)
public/               # Static assets, favicons, robots
README.md             # You are here
```

Helpful docs in root:
- `STRIPE_SETUP.md` – Stripe products & webhook configuration
- `DEPLOY_EDGE_FUNCTIONS.md` – Deploying Supabase functions + secrets
- `RUN_MIGRATION.md` – Applying SQL migrations manually or via CLI
- `EDGE_FUNCTION_DEBUG.md`, `REDEPLOY_FUNCTION.md` – Troubleshooting runtime issues

---

## Environment Configuration

Create `.env.local` for Next.js runtime and configure Supabase secrets separately.

### Client/Server (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=<https://xyz.supabase.co>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_APP_URL=https://your-domain.com

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_WIDGET_PLAN1_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_WIDGET_PLAN1_YEARLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_WIDGET_PLAN2_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_WIDGET_PLAN2_YEARLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_WIDGET_PLAN3_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_WIDGET_PLAN3_YEARLY_PRICE_ID=price_...

SUPABASE_SERVICE_ROLE_KEY=<only-for-local-api-route-testing>
```

> Never commit `.env.local`. Keep secret keys in Vercel/GitHub environment configs.

### Supabase Edge Function Secrets

Set via CLI:

```bash
supabase secrets set \
  SUPABASE_URL=https://xyz.supabase.co \
  SUPABASE_ANON_KEY=<anon> \
  SUPABASE_SERVICE_ROLE_KEY=<service-role> \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  GEMINI_API_KEY=<google-ai-key>
```

`GEMINI_API_KEY` can be substituted with `GOOGLE_API_KEY` if using Google AI Studio.

---

## Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Visit the app
http://localhost:3000
```

Ensure Supabase keys are set or use the Supabase local emulator if running offline. Widget embed previews and AI scans require the edge functions to be deployed or mocked.

### Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Production build (runs typecheck & lint) |
| `npm run start` | Start optimized production server |
| `npm run lint` | ESLint with Next.js config |
| `npm run typecheck` | TypeScript diagnostics without emitting files |

---

## Database & Supabase

### Key Tables

- `profiles` – User metadata (via Supabase Auth) – not created in repo but required.
- `free_scan_sessions` – Tracks remaining free scans per user or anonymous session.
- `widget_settings` – Widget configuration (branding, features, embed preferences).
- `widget_sites`, `widget_api_calls` – Usage analytics per widget + domain.
- `platform_subscriptions` – Stripe subscription synchronization.

### Running Migrations

Using Supabase CLI:

```bash
supabase db push   # push all migrations
# or
d supabase migration up  # iterate through migration history
```

Manual option: copy the SQL file contents into Supabase dashboard (see `RUN_MIGRATION.md`).

Each migration follows timestamp naming (`YYYYMMDDHHMMSS_description.sql`). Run them sequentially if applying manually.

### Row-Level Security

All sensitive tables have RLS enabled. Policies grant users access only to their own records, while certain tables allow anonymous inserts (widget API telemetry) when necessary.

---

## Edge Functions & AI Pipeline

### Functions Overview

| Function | Purpose |
| --- | --- |
| `analyze-food` | Fetches image, calls Gemini, sanitizes output to numeric values, returns nutrition summary & optional insights |
| `food-insights` | AI-generated nutrition insights for premium users |
| `create-checkout-session` | Starts Stripe checkout flows |
| `stripe-webhook` | Handles subscription events, syncs with Supabase |
| `sync-subscription` | Reconciles Supabase subscription state |
| `complete-profile` | Completes onboarding details |
| `blog-feed` | Provides curated blog content |

### Deploying Functions

```bash
supabase functions deploy analyze-food --project-ref <project>
# repeat for other functions
```

Ensure secrets (Stripe, Gemini, Supabase keys) are set before deployment. Redeploy `analyze-food` after prompt changes to guarantee numeric values.

---

## Running Quality Checks

```bash
npm run lint       # ESLint (checks React hooks, accessibility, etc.)
npm run typecheck  # TypeScript strict mode
```

CI/CD should run both commands before deployment. Also consider `next build` locally to catch potential runtime issues (serialization errors, missing env vars).

---

## Deployment Guide

1. **Prepare Environment**
   - Set variables in Vercel (or preferred host) matching `.env.local` entries.
   - Add Supabase service role + Stripe secrets as “Server” env vars only.
2. **Deploy Edge Functions**
   - Use Supabase CLI or dashboard; confirm `analyze-food` returns numeric data.
3. **Configure Stripe**
   - Create products/prices for each plan.
   - Add webhook endpoint (exposed by Supabase function or Vercel API) with signing secret.
4. **Deploy Next.js App**
   - For Vercel: `vercel --prod` or push to main branch.
   - Ensure `NEXT_PUBLIC_APP_URL` reflects production domain for redirects.
5. **Post-Deploy Validation**
   - Test login, free scans, premium upgrade, widget creation, and embed snippet.
   - Monitor Supabase logs and Stripe dashboard for errors.

---

## Troubleshooting Checklist

| Issue | Possible Fix |
| --- | --- |
| Free scans not decrementing | Confirm `/api/free-scans` env vars, run `free_scan_sessions` migration, check Supabase RLS |
| AI nutrition missing numbers | Redeploy `analyze-food`; verify `GEMINI_API_KEY` secret and network access |
| Logout shows “Auth session missing!” | Ensure `/api/auth/signout` route is reachable and client calls `supabase.auth.signOut({ scope: "local" })` |
| Widget save timeout | Supabase project must be active; `withTimeout` handles delayed responses, but check network + Supabase logs |
| Stripe webhooks failing | Confirm secret values, redeploy function, verify endpoint in Stripe dashboard |
| 404 on marketing pages | Ensure App Router routes exist under `app/(marketing)/...` and navigation links are updated |
| Double scrollbars | Check pages for `overflow` classes; sections should use `min-h-screen` instead of `h-screen` |

Refer to `EDGE_FUNCTION_DEBUG.md`, `QUICK_FIX_CHECKOUT.md`, and `VERIFY_ENDPOINTS.md` for deeper diagnostics.

---

## Contributing & Maintenance

1. **Branching** – Create a feature branch from `main`. Keep commits scoped and descriptive.
2. **Coding Standards** – Follow existing Tailwind utility conventions, TypeScript typings, and React hook dependency lint rules.
3. **Tests & Verification** – Run `npm run lint` and `npm run typecheck` before submitting PRs. Manual QA for scans, widget workflows, and billing changes is strongly recommended.
4. **Documentation** – Update README, environment guides, or edge function docs when you change configuration steps or add features.
5. **Deployment** – Coordinate edge function redeployments with backend config changes.

For support, open an issue or contact the maintainer. Happy building! 🥗📸🍽️
