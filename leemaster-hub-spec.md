# LeeMaster Design Hub — Full Specification

## Overview

A private web application (PWA) that serves as the central hub for LeeMaster Design's business operations. Built on Next.js + MongoDB + Vercel. This is a single-user internal tool (Morgan's business dashboard) — password-protected, not public-facing.

The app should be installable as a PWA so it feels native on both desktop (Mac dock) and mobile (iPhone home screen).

---

## Tech Stack

- **Framework:** Next.js (App Router) — handles frontend, API routes, and all backend logic
- **Database:** MongoDB
- **Hosting:** Vercel
- **Auth:** Simple password-protected login (single user). NextAuth with credentials provider.
- **Payments Integration:** Stripe (webhooks for auto-conversion and financial data)
- **Form Integration:** Tally (webhook to auto-populate client profiles on intake submission)
- **Styling:** Tailwind CSS
- **File Storage:** Vercel Blob (for logo uploads, assets)

No CMS. This is a private internal tool — not public-facing. All data is managed directly through the dashboard UI and API routes. Hosted at `hub.leemasterdesign.com` behind auth.

---

## Core Sections

### 1. Dashboard (Landing Page)

The first thing seen on login. A snapshot of the entire business at a glance. Focused on actionable info — not just vanity metrics.

**Components:**

- **MRR + trend line** — current MRR with up/down indicator from last month
- **Active clients count**
- **Leads in pipeline** — broken out by status (warm, cold, call scheduled, no response)
- **Leads needing attention:**
  - Replies waiting on you
  - Follow-ups due today
  - Scheduled calls today
  - Leads with a specific follow-up date that's arrived
- **OpenClaw status** — running/down, messages sent today, leads scraped today
- **Recent activity feed** — last 10 actions across the whole system (new lead scraped, message sent, reply received, client payment, status changes, etc.)

---

### 2. Leads / CRM

The sales pipeline. Every prospect from cold outreach lives here.

**Lead Record Fields:**

| Field | Type | Notes |
|---|---|---|
| Name | Text | Contact person's name |
| Business Name | Text | |
| Phone | Text | Primary contact method |
| Email | Text | Optional |
| Website | URL | Their current site, if any |
| Status | Enum | See statuses below |
| Call Scheduled Date | DateTime | Populated when status = Call Scheduled |
| Follow-Up Date | DateTime | "Hit me up in a month" scenarios |
| Source | Enum | KSL, HomeAdvisor, Nextdoor, Google Maps, Referral, Other |
| Industry | Enum | Landscaping, Plumbing, HVAC, Excavation, Electrical, Roofing, Painting, Cleaning, General Contractor, Other |
| Notes | Rich Text | Freeform, manually updated. Running log of conversation context for closing calls |
| Last Contacted Date | DateTime | Auto-updated when a message is sent |
| Created Date | DateTime | When OpenClaw first found/added them |

**Lead Statuses:**

1. **No Response** — outreach sent, no reply yet
2. **Rejected** — said no / not interested
3. **Cold** — replied but iffy, not warm
4. **Warm** — interested, conversation ongoing
5. **Call Scheduled** — call is booked (shows date field)
6. **Closed Won** — deal done → auto-converts to Client when Stripe payment received
7. **Closed Lost** — was in pipeline but fell through

**Key Behaviors:**

- When status changes to "Closed Won" AND a Stripe payment webhook is received with matching info, the lead auto-converts to a Client record. All relevant data carries over (name, business name, contact info, industry, notes).
- Leads with a Follow-Up Date that has arrived should surface on the Dashboard under "Leads needing attention."
- The leads list should be filterable by status, source, and industry.
- Default sort: most recently contacted first, with "needing attention" leads pinned to top.

---

### 3. Clients

Everything about a paying customer in one unified profile. Combines client info, project tracking, and intake form data.

**Client Record Fields:**

| Field | Type | Notes |
|---|---|---|
| Name | Text | Carried from lead |
| Business Name | Text | Carried from lead |
| Contact Info | Text | Phone, email — carried from lead |
| Industry | Enum | Carried from lead |
| Plan Tier | Enum | Landing Page, Multi-Page, eCommerce |
| PPC Client | Boolean | Yes/No |
| PPC Management Fee | Currency | $599/month if applicable |
| PPC Ad Spend | Currency | Client's monthly ad budget |
| Monthly Revenue | Currency | Total they pay LeeMaster (subscription + PPC fee) |
| Start Date | DateTime | When they became a client (first Stripe payment) |
| Next Billing Date | DateTime | From Stripe |
| Project Status | Enum | See statuses below |
| Website URL | URL | Their live site |
| Domain Info | Text | Registrar, domain name, expiration date |
| Notes | Rich Text | Carried from lead, continues to be updated |
| Intake Form Data | Nested Object | See intake fields below |

**Project Statuses:**

1. **Awaiting Design** — intake received, design not started
2. **Awaiting Revision** — design sent, waiting on client feedback
3. **Awaiting Final Dev** — revisions approved, building final version
4. **Deployed Active** — site is live, client is active and paying
5. **Deployed Canceled** — site was live but client canceled/churned

**Intake Form Fields (auto-populated via Tally webhook):**

| Field | Type |
|---|---|
| Business Name | Text |
| Primary Contact Name | Text |
| Email | Text |
| Mobile Phone Number | Text |
| Business Address | Text (optional) |
| Business Description | Long Text |
| Services/Products Offered | Long Text |
| Plan Chosen | Enum |
| Domain Preference | Text |
| Domain Backup 1 | Text |
| Domain Backup 2 | Text |
| Logo | File Upload |
| Branded Content/Assets/Photos | File Upload (multiple) |
| Linked Sites (Social Media, etc.) | Text |
| Website Examples They Like | Text |
| Style Requests | Long Text |
| Call to Action | Text — what should visitors do? Call, form, book online? |
| Service Area | Text — where do they operate? |
| Tagline/Slogan | Text (optional) |

**Key Behaviors:**

- Client profiles are created automatically when a lead converts (Stripe webhook + status change).
- Tally webhook populates the intake form fields on the client profile. Match by email or phone number.
- Clients list should be filterable by plan tier, project status, PPC client status.
- Client profile page shows everything in one view: info, project status, intake details, notes — tabbed or sectioned.

---

### 4. OpenClaw

Window into the AI employee's activity. This section provides visibility and control over what OpenClaw is doing.

**Components:**

**Activity Feed:**
- Chronological log of everything OpenClaw has done
- Lead scraped (with source)
- Message sent (with recipient and preview)
- Follow-up sent
- Lead added to CRM
- Any errors or failures

**Queue:**
- Scheduled follow-ups with dates
- Leads waiting to be contacted
- Any pending tasks

**Message Templates:**
- The outreach scripts OpenClaw uses for initial contact
- Follow-up message templates (follow-up #1, #2, etc.)
- Editable by Morgan directly in the hub
- Template variables: {name}, {business_name}, {industry}, {source}, etc.

**Cost Tracking:**
- API spend broken down by day, week, month
- Running total for current billing period
- Cost per lead scraped
- Cost per message sent
- Model used and token counts

**Status:**
- Is OpenClaw running or down?
- Last heartbeat / last action timestamp
- Uptime indicator
- Quick restart/pause controls (if feasible via API)

---

### 5. Finances

The money picture. Pulls primarily from Stripe with some manual expense input.

**Metrics & Components:**

**Revenue:**
- **MRR** — total monthly recurring revenue with trend graph (line chart over time)
- **Plan Breakdown** — pie chart showing % of revenue from each of the 4 plans:
  - Landing Page ($99/mo)
  - Multi-Page ($199/mo)
  - eCommerce ($249/mo)
  - PPC Management ($599/mo)
- **Setup Fees Collected** — one-time income, tracked separately
- **Total Revenue** — MRR + setup fees for current month

**Expenses:**
- Auto-tracked: Stripe processing fees, OpenClaw API costs
- Manually entered: Mac Mini, Mint Mobile, Vercel, MongoDB, domain registrations, VA costs (future), any other operational costs
- Simple form to add/edit recurring and one-time expenses

**Profit:**
- Total Revenue minus Total Expenses
- Displayed prominently with trend

**Churn:**
- Clients lost per month
- Churn rate (% of total clients)
- List of recently canceled clients

**Growth:**
- New clients added per month
- Net client growth (new minus churned)
- MRR growth trend over time

**Data Source:**
- Stripe API / webhooks for all revenue data, billing dates, payment history
- Manual input for expenses not tracked through Stripe
- All financial data should have monthly and weekly views

---

## Integrations

### Stripe
- **Webhooks:** Listen for `checkout.session.completed`, `invoice.paid`, `customer.subscription.created`, `customer.subscription.deleted`
- **Auto-conversion:** When payment received, match to lead by email/phone → convert to client
- **Financial data:** Pull MRR, revenue, billing dates, payment history
- **Churn detection:** Listen for `customer.subscription.deleted` → update client status to Deployed Canceled

### Tally
- **Webhook:** On form submission, POST data to hub API
- **Auto-populate:** Match intake submission to existing client profile by email or phone. If no match exists, create a new client profile in "Awaiting Design" status.

### OpenClaw (Future — API/Webhook integration)
- OpenClaw pushes activity data to the hub via API
- Hub exposes endpoints for OpenClaw to:
  - Add new leads
  - Update lead status and last contacted date
  - Log messages sent
  - Report costs/usage
  - Read message templates
  - Read lead queue / follow-up schedule

---

## Pricing Reference

| Plan | Monthly | Setup Fee |
|---|---|---|
| Landing Page | $99/mo | $299 |
| Multi-Page | $199/mo | $399 |
| eCommerce | $249/mo | $499 |
| PPC Management | $599/mo | — |

---

## Design Notes

- Clean, modern UI. Dark mode preferred.
- Fast and snappy — this is an internal tool, prioritize speed over animation.
- Mobile responsive — needs to work well on iPhone for checking on the go.
- PWA installable — should be addable to Mac dock and iPhone home screen.
- Minimal clicks to get to important info. Dashboard should answer "what do I need to do right now?" in one glance.
