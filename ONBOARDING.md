# LD Hub — Onboarding Guide

A private PWA serving as the central operations hub for LeeMaster Design. Single-user internal tool — password-protected, not public-facing. Hosted at `hub.leemasterdesign.com`.

**Who it's for:** Morgan (sole operator of LeeMaster Design, a web design agency targeting local service businesses).

**Tech stack:** Next.js 16 (App Router) · React 19 · MongoDB/Mongoose · Tailwind CSS v4 · Vercel · Stripe · Tally · NextAuth v5 · TypeScript

---

## Getting Started

### Environment Variables

Copy `.env.example` and fill in:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `AUTH_SECRET` | NextAuth JWT secret (`openssl rand -base64 32`) |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_LANDING_SUB` | Stripe price ID — Landing Page subscription |
| `STRIPE_PRICE_MULTI_SUB` | Stripe price ID — Multi-Page subscription |
| `STRIPE_PRICE_ECOM_SUB` | Stripe price ID — eCommerce subscription |
| `STRIPE_PRICE_PPC_SUB` | Stripe price ID — PPC management subscription |
| `STRIPE_PRICE_LANDING_SETUP` | Stripe price ID — Landing Page setup fee |
| `STRIPE_PRICE_MULTI_SETUP` | Stripe price ID — Multi-Page setup fee |
| `STRIPE_PRICE_ECOM_SETUP` | Stripe price ID — eCommerce setup fee |
| `TALLY_WEBHOOK_SECRET` | Tally HMAC signing secret |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `OPENCLAW_API_KEY` | Shared secret for OpenClaw agent auth |
| `CRON_SECRET` | Bearer token for Vercel cron endpoints |
| `TELEGRAM_BOT_TOKEN` | (Optional) Telegram alert bot token |
| `TELEGRAM_CHAT_ID` | (Optional) Telegram chat to send alerts to |

### Local Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also validates types)
npm run lint       # ESLint check
```

### Changing the Login Password

Password is stored as a bcrypt hash in `src/lib/auth.ts`. To change it:

```bash
node -e "require('bcryptjs').hash('new-password',12).then(console.log)"
```

Replace the `HASHED_PASSWORD` constant in `src/lib/auth.ts` with the output.

---

## Architecture

### App Router Structure

```
src/app/
├── layout.tsx                    Root layout (providers, metadata, PWA config)
├── globals.css                   Design tokens + Tailwind v4 theme
├── (auth)/login/page.tsx         Password-only login
├── (dashboard)/
│   ├── layout.tsx                AppShell wrapper (sidebar, header, mobile nav)
│   ├── page.tsx                  Dashboard home
│   ├── leads/page.tsx            Leads CRM
│   ├── clients/page.tsx          Client management
│   ├── openclaw/page.tsx         AI employee control panel
│   ├── site-health/page.tsx      Website monitoring
│   └── finances/page.tsx         Revenue, expenses, trends
├── api/                          All API routes (see API Reference)
└── manifest.ts                   PWA manifest generation
```

Route groups: `(auth)` for login, `(dashboard)` for all authenticated pages. The group names don't affect URLs.

### Auth Flow

- **Provider:** NextAuth v5 with credentials provider (password-only, no username)
- **Session strategy:** JWT, 30-day expiry
- **User:** Single hardcoded user (Morgan, morgan@leemasterdesign.com)
- **Middleware** (`src/middleware.ts`): Edge middleware redirects unauthenticated requests to `/login`
- **Public routes:** `/login`, `/api/auth/*`, `/api/webhooks/*`, `/api/validate/*`, `/api/cron/*`, static assets

### Database Layer

- **ORM:** Mongoose 9 with TypeScript interfaces
- **Connection:** Singleton pattern cached on `global` to prevent multiple connections in Vercel's serverless environment (`src/lib/db.ts`)
- **13 models** in `src/models/` (see Data Models section)

---

## Core Sections

### Dashboard (`/`)

Executive snapshot — the first thing seen after login. All data server-side fetched.

**KPI cards (top row):**
- MRR with active client count
- Active clients
- Leads in pipeline (contacted but not yet won/lost)
- Outreach queue (leads awaiting first contact)

**Needs Attention section:**
- Follow-ups due today
- Scheduled calls today

**OpenClaw status card:** Connected/disconnected indicator, messages sent today, leads scraped today. Links to `/openclaw`.

**Site Health summary:** Healthy/degraded/down counts with problem site list. Links to `/site-health`.

**Recent Activity feed:** Last 10 system-wide events (lead created, status changed, payment received, etc.).

---

### Leads / CRM (`/leads`)

The sales pipeline. Two tabs:

**Outreach Queue tab:** "New" leads in FIFO order (oldest first). Each card has a "Mark Contacted" button that sets status to "No Response" and stamps `lastContactedDate`.

**Pipeline tab:** All non-"New" leads. Two view modes:
- **Kanban board** — drag-and-drop columns by status (uses @dnd-kit). Cards with orange borders indicate leads needing attention (overdue follow-up or call).
- **Table view** — sortable list with search and filters (status, source, industry).

**Lead operations:**
- Create/edit/delete individual leads
- Bulk import from CSV (with template download, preview, and validation)
- Bulk delete, bulk status/source/industry updates
- Duplicate detection scanner (matches on normalized phone and email)
- Generate Stripe payment link (selects plan tier, copies link)
- Convert to client (opens ClientForm pre-filled from lead data)
- Detail slide-over with activity timeline, status dropdown, edit mode

**Lead statuses:** New → No Response → Rejected / Cold / Warm / Call Scheduled → Closed Won / Closed Lost

**Lead sources:** KSL, HomeAdvisor, Nextdoor, Google Maps, Referral, Other

---

### Clients (`/clients`)

Paying customer management. Clients are created automatically when a lead converts via Stripe payment, or manually.

**Client operations:**
- Create/edit/delete with search and filters (plan tier, project status, PPC status)
- Bulk delete and bulk status updates
- Detail slide-over with project status dropdown, intake form viewer, activity timeline
- Stripe-managed fields show a "from Stripe" badge and are read-only

**Plan tiers:**
| Tier | Monthly | Setup Fee |
|------|---------|-----------|
| Landing Page | $99 | $299 |
| Multi-Page | $199 | $399 |
| eCommerce | $249 | $499 |

**Project statuses:** Awaiting Design → Awaiting Revision → Awaiting Final Dev → Deployed Active / Deployed Canceled

**PPC add-on:** Tracked separately with management fee and ad spend fields. Has its own Stripe subscription.

**Intake form:** Auto-populated via Tally webhook. Contains business description, services, domain preferences, logo, brand content URLs, style requests, tagline, etc.

---

### OpenClaw — AI Employee (`/openclaw`)

Control panel for the external OpenClaw agent (AI-powered lead scraping and outreach automation).

**Status monitoring:**
- Heartbeat polling every 60 seconds. Connected if last heartbeat < 15 minutes.
- Current task summary display.

**KPI cards:** Connection status, messages sent today, API spend this month.

**Task queue:** Create, edit, delete, and reorder tasks. Quick-action buttons pre-fill prompts (Scrape leads, Send outreach, Follow up). Tasks progress: pending → in_progress → completed/failed.

**Message templates:** CRUD for outreach templates with variable interpolation (`{name}`, `{business_name}`). Types: initial_contact, follow_up_1/2/3, custom. Toggle active/inactive.

**Activity feed:** Paginated log of all agent actions (lead_scraped, message_sent, follow_up_sent, lead_added, error). Each entry can track AI model, token count, and cost.

**Cost tracking:** Cost per lead, cost per message, weekly and monthly totals.

---

### Site Health Monitoring (`/site-health`)

Automated monitoring of client websites via Vercel cron jobs.

**Summary bar:** Total monitored, healthy, degraded, down counts.

**Alert cards:** Problem sites displayed prominently with status, incident description, and duration.

**Health table:** Per-client row showing uptime status, response time (ms), SSL days remaining, contact form status, last checked time.

**Incident history:** Filterable list of past and ongoing incidents with duration tracking.

**Three check types:**
| Check | Schedule | Logic |
|-------|----------|-------|
| Uptime | Every 30 min | HTTP fetch — 500+ = down, 400+ = degraded, >10s = degraded |
| SSL | Daily 6am UTC | TLS inspection — ≤0 days = down, ≤14 days = degraded |
| Contact Form | Every 6 hours | POST to endpoint — 5xx/timeout = down |

**Alert deduplication:** 1st alert immediate, 2nd at 1 hour, then every 6 hours. Alerts sent via Telegram.

**Only monitors** clients with "Deployed Active" project status and a `websiteUrl`.

---

### Finances (`/finances`)

Revenue analytics, expense tracking, and business metrics.

**Time period selector:** Last 7 Days, Last 30 Days, This Month, YTD, Last 12 Months, or Custom date range.

**KPI cards:** MRR, Total Revenue, Total Expenses, Profit — each with delta badge showing change vs. previous equivalent period.

**Charts:**
- MRR trend line (area chart, auto-granularity: weekly if ≤45 days, monthly otherwise)
- Plan breakdown donut chart (revenue and count by tier + PPC)

**Growth metrics:** New clients, net growth, MRR delta.

**Churn metrics:** Churn rate %, churned client count, recently canceled clients list.

**Expense management:** Full CRUD table with category filter. Auto-tracked expenses (Stripe fees) are read-only. Manual entries for hosting, tools, domains, etc.

**Expense categories:** Hosting, API Costs, Stripe Fees, Phone, Domain, Software, Hardware, VA, Other

---

## Integrations

### Stripe

**Payment links** (`POST /api/stripe/payment-link`): Generates a Stripe Checkout URL for a given plan tier. Includes setup fee if configured. Metadata carries `leadId` and `planTier`.

**Webhook** (`POST /api/webhooks/stripe`): Verified via `STRIPE_WEBHOOK_SECRET`.

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Creates Client from Lead. Extracts plan tier, setup fee, monthly revenue from line items. Links by Stripe customer ID or email. |
| `customer.subscription.created` | Maps subscription fields to client (plan tier, revenue, billing date). |
| `invoice.paid` | Updates `nextBillingDate`. Auto-creates Expense for Stripe processing fee. Logs Activity. |
| `customer.subscription.deleted` | If PPC subscription: disables PPC. If main subscription: sets status to "Deployed Canceled". |

### Tally

**Webhook** (`POST /api/webhooks/tally`): Verified via HMAC-SHA256 (`TALLY_WEBHOOK_SECRET`).

Parses intake form fields by label matching. Matching priority: Client by email → Client by phone → Lead by email → Lead by phone → OrphanIntake (stored for manual matching later).

### OpenClaw API

External agent authenticates via `x-api-key` header matching `OPENCLAW_API_KEY`. The Edge middleware accepts the API key as an alternative to session auth for all `/api/openclaw/*` routes, so every endpoint under that prefix is agent-accessible.

Endpoints the agent calls:
- `POST /api/openclaw/heartbeat` — report alive status
- `POST /api/openclaw/activity` — log actions (scrape, message, error)
- `GET /api/openclaw/templates` — fetch message templates
- `GET/PUT /api/openclaw/tasks/[id]` — claim and update tasks
- `GET /api/openclaw/leads` — list leads (filter: status, source, industry)
- `POST /api/openclaw/leads` — create lead (with duplicate detection)
- `GET /api/openclaw/leads/[id]` — fetch a single lead
- `PUT /api/openclaw/leads/[id]` — update a lead (logs activity on status/contact changes)

### Vercel Cron (`vercel.json`)

```
*/30 * * * *    /api/cron/uptime         Uptime checks every 30 min
0 6 * * *       /api/cron/ssl            SSL checks daily at 6am UTC
0 */6 * * *     /api/cron/contact-form   Contact form checks every 6 hours
```

All cron endpoints require `Authorization: Bearer <CRON_SECRET>`.

### Validation API

`GET /api/validate` — External endpoint (used by OpenClaw) to check if a lead/client already exists before scraping. Authenticated via `VALIDATE_API_KEY` bearer token. Searches by normalized phone, email, or business name across both Lead and Client collections.

---

## Data Models

All models use MongoDB with Mongoose, include `createdAt`/`updatedAt` timestamps, and live in `src/models/`.

### Lead
Sales prospect. Core CRM entity. Fields: name, businessName, phone, email, website, status (enum), source (enum), industry, state, callScheduledDate, followUpDate, lastContactedDate, notes, intakeForm (embedded). Indexes on phone, email, businessName.

### Client
Paying customer. Created from Lead conversion or manually. Fields: name, businessName, phone, email, industry, planTier, ppcClient, ppcManagementFee, ppcAdSpend, monthlyRevenue, setupFeeAmount, startDate, nextBillingDate, projectStatus, websiteUrl, contactFormEndpoint, domainInfo, currentHealthStatus, lastHealthCheck, notes, intakeForm (embedded), leadId (→ Lead), stripeCustomerId, canceledAt. Indexes on phone, email, businessName.

### Activity
System-wide event log. Types: lead_created, lead_status_changed, lead_contacted, client_created, client_updated, client_status_changed, payment_received, openclaw_action, expense_added, site_health_changed. References Lead or Client via relatedEntityId.

### Expense
Business cost tracking. Fields: name, amount, type (recurring/one-time), category (enum), date, autoTracked (boolean). Auto-tracked expenses are created by the Stripe webhook for processing fees.

### Industry
Custom industry names extending the default list. Simple name field, merged with defaults at query time.

### MessageTemplate
OpenClaw outreach templates. Fields: name, type (initial_contact/follow_up_1/2/3/custom), content (with `{variable}` placeholders), active (boolean).

### IntakeFormSchema
Shared embedded schema (not a standalone collection). Used inside Lead, Client, and OrphanIntake. Fields: businessName, primaryContactName, email, phone, address, businessDescription, servicesOffered, planChosen, domainPreference, domainBackup1/2, logoUrl, brandedContentUrls[], socialLinks, websiteExamples, styleRequests, callToAction, serviceArea, tagline.

### OrphanIntake
Unmatched Tally form submissions. Stored with email, phone, intakeForm, and tallySubmissionId for manual review and later matching.

### SiteHealthCheck
Individual check results. Fields: clientId (→ Client), checkType (uptime/ssl/contact_form), status (healthy/degraded/down), responseTimeMs, statusCode, sslDaysRemaining, sslExpiry, errorMessage, checkedAt. TTL index auto-deletes after 30 days.

### SiteIncident
Tracks down/degraded periods. Fields: clientId (→ Client), type (down/degraded/ssl_expiring/ssl_expired/contact_form_broken), description, startedAt, resolvedAt, lastAlertSentAt, alertCount. Used for alert deduplication.

### OpenClawStatus
Heartbeat singleton. Fields: lastHeartbeat, currentTaskId (→ OpenClawTask), currentTaskSummary. Single document, upserted on each ping.

### OpenClawTask
Task queue for the AI agent. Fields: prompt, status (pending/in_progress/completed/failed), order, result, error, startedAt, completedAt. Indexed on (status, order).

### OpenClawActivity
AI agent action log. Types: lead_scraped, message_sent, follow_up_sent, lead_added, error. Fields: type, details, relatedLeadId (→ Lead), cost, aiModel, tokenCount.

### Key Relationships

```
Lead ──converts to──▸ Client (on Closed Won + Stripe payment)
Lead ◂──referenced by── Activity, OpenClawActivity
Client ◂──referenced by── SiteHealthCheck, SiteIncident, Activity
Client ──references──▸ Lead (via leadId)
OpenClawStatus ──references──▸ OpenClawTask (via currentTaskId)
OrphanIntake ──waiting to match──▸ Client or Lead
```

---

## API Reference

### Activity
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/activity` | Recent activity feed (filterable by entity) |

### Auth
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handler |

### Clients
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/clients` | List clients (filter: planTier, projectStatus, ppcClient) |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/[id]` | Get client |
| PUT | `/api/clients/[id]` | Update client |
| DELETE | `/api/clients/[id]` | Delete client |

### Cron Jobs
| Method | Endpoint | Schedule | Purpose |
|--------|----------|----------|---------|
| GET | `/api/cron/uptime` | */30 * * * * | Check website uptime |
| GET | `/api/cron/ssl` | 0 6 * * * | Check SSL certificates |
| GET | `/api/cron/contact-form` | 0 */6 * * * | Test contact form endpoints |

### Expenses
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/expenses` | List expenses (filter: type, category) |
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses/[id]` | Get expense |
| PUT | `/api/expenses/[id]` | Update expense |
| DELETE | `/api/expenses/[id]` | Delete expense |

### Finances
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/finances/summary` | Financial aggregation (params: start/end or period) |

### Health Monitoring
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health/status` | Real-time health summary for all monitored sites |
| GET | `/api/health/history` | Incident history (filter: status, limit) |

### Industries
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/industries` | Merged list of default + custom industries |
| POST | `/api/industries` | Create custom industry |

### Leads
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/leads` | List leads (filter: status, source, industry) |
| POST | `/api/leads` | Create lead (with duplicate detection) |
| PATCH | `/api/leads` | Bulk update (status, source, industry, lastContactedDate) |
| DELETE | `/api/leads` | Bulk delete |
| GET | `/api/leads/[id]` | Get lead |
| PUT | `/api/leads/[id]` | Update lead |
| DELETE | `/api/leads/[id]` | Delete lead |
| GET | `/api/leads/duplicates` | Scan for duplicate leads |
| POST | `/api/leads/import` | Bulk import from CSV data |

### OpenClaw
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/openclaw/activity` | Session | Paginated activity log |
| POST | `/api/openclaw/activity` | API key | Log agent activity |
| GET | `/api/openclaw/heartbeat` | Session | Check agent connection status |
| POST | `/api/openclaw/heartbeat` | API key | Update agent heartbeat |
| GET | `/api/openclaw/summary` | Session | Cost and activity metrics |
| GET | `/api/openclaw/tasks` | Session | Pending + recent tasks |
| POST | `/api/openclaw/tasks` | Session | Create task |
| GET | `/api/openclaw/tasks/[id]` | Session | Get task |
| PUT | `/api/openclaw/tasks/[id]` | Session | Update task |
| DELETE | `/api/openclaw/tasks/[id]` | Session | Delete task |
| PUT | `/api/openclaw/tasks/reorder` | Session | Reorder task queue |
| GET | `/api/openclaw/templates` | Session | List message templates |
| POST | `/api/openclaw/templates` | Session | Create template |
| GET | `/api/openclaw/templates/[id]` | Session | Get template |
| PUT | `/api/openclaw/templates/[id]` | Session | Update template |
| DELETE | `/api/openclaw/templates/[id]` | Session | Delete template |
| GET | `/api/openclaw/leads` | API key | List leads (filter: status, source, industry) |
| POST | `/api/openclaw/leads` | API key | Create lead (with duplicate detection) |
| GET | `/api/openclaw/leads/[id]` | API key | Get lead |
| PUT | `/api/openclaw/leads/[id]` | API key | Update lead (with activity logging) |

### Stripe
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/stripe/payment-link` | Generate Stripe Checkout URL |

### Validation
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/validate` | Bearer token | Check if lead/client exists (used by OpenClaw) |

### Webhooks
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/webhooks/stripe` | Stripe signature | Handle Stripe events |
| POST | `/api/webhooks/tally` | HMAC-SHA256 | Handle Tally form submissions |

---

## Design System

### Theme

Apple-inspired design with full dark mode support. Tokens defined as CSS custom properties in `src/app/globals.css`, consumed via Tailwind v4's `@theme` directive.

**Key tokens:**

| Token | Light | Dark |
|-------|-------|------|
| `--color-surface` | #ffffff | #1c1c1e |
| `--color-surface-secondary` | #f5f5f7 | #2c2c2e |
| `--color-border` | #d2d2d7 | #38383a |
| `--color-text-primary` | #1d1d1f | #f5f5f7 |
| `--color-text-secondary` | #6e6e73 | #98989d |
| `--color-accent` | #0071e3 | #0a84ff |
| `--color-success` | #34c759 | #30d158 |
| `--color-warning` | #ff9f0a | #ff9f0a |
| `--color-danger` | #ff3b30 | #ff453a |

**Typography:** System font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif`).

**Dark mode:** Default theme. Toggled via `next-themes` ThemeProvider. ThemeToggle component in the header (sun/moon icon).

### Component Library (`src/components/ui/`)

10 base components used throughout the app:

| Component | Purpose |
|-----------|---------|
| Button | Variants: primary, secondary, ghost, danger. Sizes: sm, md, lg. Loading state. |
| Card | Container with optional title header. |
| Input | Text input with label and error display. |
| Textarea | Multi-line input matching Input styling. |
| Select | Custom dropdown (click-outside, keyboard nav). |
| DatePicker | Calendar popup with month/year navigation. Handles YYYY-MM-DD strings. |
| Modal | Centered overlay via React Portal. Escape/backdrop to close. |
| SlideOver | Right-side panel via React Portal. Animated slide-in. |
| Table | Minimal table system (Table, TableHeader, TableBody, TableRow, TableHead, TableCell). |
| Badge | Status pills. Variants: default, success, warning, danger, info, neutral. |

### Responsive Behavior

- **Desktop (md+):** Fixed left sidebar (collapsible to icons). Sticky top header with theme toggle and sign-out.
- **Mobile (<md):** Sidebar hidden. Fixed bottom nav with 3 primary items + "More" popover for remaining sections. Tables collapse to card layouts.
- **PWA:** Standalone display mode. Installable on Mac (dock) and iPhone (home screen). Theme color #0071e3.

### Layout Components (`src/components/layout/`)

| Component | Purpose |
|-----------|---------|
| AppShell | Main container managing sidebar collapse + content margin. |
| Sidebar | Fixed left nav — 6 items, collapses 200px → 64px. |
| Header | Sticky top bar — theme toggle + sign-out. |
| MobileNav | Fixed bottom nav — 3 primary + "More" popover. |
| Providers | Client wrapper — SessionProvider + ThemeProvider (dark default). |
| ThemeToggle | Sun/moon icon — hydration-safe via useSyncExternalStore. |

---

## Ideas & Observations

### Feature Ideas

1. **Outreach analytics dashboard** — Track response rates by template type, source, and industry. This data is partially captured in OpenClawActivity but not surfaced in any view.

2. **Lead scoring** — Assign weighted scores based on industry, source, engagement (responded, call scheduled), and time-in-pipeline. Could surface "hottest leads" on the dashboard.

3. **Revenue forecasting** — Use the pipeline (leads at each stage × historical conversion rates) to project next-month MRR. The Leads and Finances data already exist to power this.

4. **Client project timeline** — A visual progress bar or timeline for each client showing milestones (signed → intake submitted → design started → revision → deployed). Currently tracked as a single status enum.

5. **Automated follow-up reminders** — Push notifications (via Telegram or PWA notification) when a follow-up date arrives. The data exists (`followUpDate`, `callScheduledDate`) but nothing triggers from it today beyond dashboard display.

6. **Orphan intake resolution UI** — OrphanIntake documents are stored but there's no UI to review and match them. A small admin panel to view orphans and link them to leads/clients would close this gap.

7. **Expense auto-categorization** — Auto-tag OpenClaw API costs as "API Costs" expenses using OpenClawActivity cost data, similar to how Stripe fees are already auto-tracked.

8. **Bulk lead enrichment** — Let OpenClaw enrich existing leads (fill in missing email, website, industry) rather than only scraping new ones.

### Observations

- **Phone normalization** is implemented in multiple places (leads import, duplicate detection, validation API, Tally webhook). The logic is consistent but lives in different files. A shared `normalizePhone()` utility would reduce duplication.

- **The Stripe webhook handler** (`src/app/api/webhooks/stripe/route.ts`) handles 4 event types in a single function. As complexity grows, splitting into per-event handler functions would improve readability.

- **SiteHealthCheck TTL** is set to 30 days. This means historical health data older than a month is lost. If long-term uptime reporting is ever needed, this would need a separate aggregation collection.

- **OpenClaw endpoints** all accept API key auth via the Edge middleware (`x-api-key` header), so the agent can reach every `/api/openclaw/*` route without a browser session. The UI continues to use session auth for the same routes.

- **The finance summary endpoint** (`/api/finances/summary`) does heavy aggregation on every request. For large datasets, caching or incremental computation could improve response times.

- **Client `currentHealthStatus`** is denormalized on the Client document and updated by the cron jobs. This is a good pattern for dashboard reads but means the value can drift if a cron job fails. The health status page does re-aggregate from checks, so this is a display-only concern on the dashboard.

- **Kanban board** uses @dnd-kit for drag-and-drop. The pipeline statuses are hardcoded in the board component — if new statuses are added to the Lead model, the board columns need manual updating.

- **CSV import** supports flexible column mapping with case-insensitive enum matching and fallback defaults. Well-built for messy real-world data from scraping tools.
