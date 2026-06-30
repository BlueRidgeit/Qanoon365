# Qanoon365 — Legal Intelligence Platform

## Project Identity

Qanoon365 is a legal intelligence platform with AI-powered document intelligence and court research capabilities, rebranded from AlBasti with BlueRidge IT theming. Features the Daleel AI chatbot for querying SharePoint document knowledge bases. Built with TypeScript end-to-end on Azure.

## Branding
- Colors: Orange #f7941f, Blue #0b79bc, White #ffffff, Charcoal #32373c
- "Qanoon" in orange, "365" in blue
- Arabic: قانون٣٦٥

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Framer Motion |
| Backend | NestJS 11, Prisma 7, PostgreSQL 16 |
| AI | Azure OpenAI GPT-4o (swappable), Azure AI Search, Azure Doc Intelligence |
| Ingestion | Python 3.12: PyMuPDF, azure-search-documents, openai, msgraph-sdk |
| Storage | Azure Blob Storage (Azurite for local dev) |
| Cache/Queue | Redis, BullMQ |
| Auth | JWT (access 15m + refresh 7d), role-based |
| Monorepo | npm workspaces: packages/api, packages/web, packages/shared, packages/ingestion (Python) |

## Credentials

- **Admin:** bladmin@albasti.dev / Myfav0r!teBL1T
- **Demo users:** {name}@albasti.dev / Admin123!
- **Roles:** admin > partner > compliance > lawyer > bd

## Legal Terminology Standard

Use these terms consistently across the application — never use the "Avoid" column:

| Correct Term | Avoid | Context |
|---|---|---|
| Enquiry / Enquiries | Lead(s) | New business enquiries from potential clients |
| Engagement Pipeline | Opportunities | The pipeline tracking from enquiry to instruction |
| Instruction / Instructed | Won / Retained / Deal | When a client formally engages the firm |
| Not Instructed | Lost / Declined | When a client does not proceed |
| Fee Proposal | Proposal | A fee quote sent to a prospective client |
| Fee Arrangement | Engagement Type | Retainer, hourly, fixed fee, etc. |
| Estimated Fees | Estimated Value | Monetary estimate for an engagement |
| Conflict Checks | Ethical Clearance | Conflict of interest review |
| Under Review | Pending | Status for conflict checks being reviewed |
| Waiver Granted | Waived | Conflict acknowledged but proceeding |
| KYC & Compliance | Client Due Diligence / CDD | Know Your Client verification |
| Document Vault | Documents | Secure document storage |
| Court Filings & Pleadings | Court Filing | Court documents category |
| Legal Memoranda | Research | Internal research documents |
| Agreements & Contracts | Contract | Legal agreement documents |
| Firm Dashboard | Firm Overview | Main dashboard page |
| Client Directory | Clients | Client listing page |
| Counsel & Contacts | Contacts | Contact directory |
| Firm Settings | Settings | Administration page |
| Litigant Profile Analysis | Party Intelligence | AI query type |
| Comparable Precedents | Comparable Cases | AI query type |
| Precedent & Case Law | Contextual Case Law | AI query type |

## Navigation Structure

Sidebar sections: OVERVIEW, PRACTICE, RELATIONSHIPS, COMPLIANCE, INTELLIGENCE, FIRM ADMIN

## Arabic Language (Implemented)

- Library: next-intl v4.8.2 (cookie-based locale, no URL routing)
- Direction: RTL layout with dir="rtl" for Arabic
- Font: Noto Sans Arabic via `font-arabic` class
- Brand: "البسطي" (Al Basti in Arabic)
- Translation files: messages/en.json, messages/ar.json
- Locale config: packages/web/i18n/request.ts
- Language switcher: packages/web/src/components/layout/language-switcher.tsx

## Coding Standards

- TypeScript strict mode across all packages
- All Prisma imports use `.js` extensions (NestJS nodenext module resolution)
- Shared types/enums in packages/shared
- Frontend state: Zustand (client), TanStack React Query (server)
- Component library: shadcn/ui (copied into components/ui/)
- Styling: Tailwind CSS 4 with oklch color space
- Color scheme: Navy primary + Gold accent + Emerald success
- Use serif font (Playfair Display via `font-heading` class) for page h1 headings
- Multi-tenant: schema-per-tenant via SET search_path
- AI: Swappable provider interface (ICourtIntelProvider pattern)

## CI/CD & Deployment

- **Auto-deploy**: Push to `main` triggers `.github/workflows/deploy.yml`
- Builds images in ACR, deploys to Container Apps, verifies health
- Auth: OIDC via User-Assigned Managed Identity (`github-deploy-identity` in `rg-albasti-dev`)
- Image tags: `sha-<7char>` (from commit SHA) + `latest`
- Manual deploy: `/deploy` skill or see `docs/internal/AZURE_DEPLOYMENT.md`
- Strategy rationale: `docs/internal/AZURE_CONTAINER_APPS_GUIDE.md`

## Quick Commands

```bash
# Start local services (Postgres, Redis, Azurite)
docker compose up -d

# Run API
cd packages/api && npm run start:dev

# Run Frontend
cd packages/web && npm run dev

# Run API tests
cd packages/api && npm test

# Seed database
cd packages/api && npx prisma db seed

# Generate Prisma client
cd packages/api && npx prisma generate
```

## Key Files

- `AGENTS.md` — Full development blueprint and phase tracking
- `packages/shared/src/enums/index.ts` — All shared enums
- `packages/api/prisma/schema.prisma` — Database schema (20+ models)
- `packages/api/prisma/seed.ts` — Demo data seeding
- `packages/web/src/components/layout/sidebar.tsx` — Navigation
- `packages/web/src/components/layout/header.tsx` — Header with breadcrumbs and notifications
- `packages/web/src/components/layout/notification-panel.tsx` — Notification dropdown panel
- `packages/web/src/app/globals.css` — Theme and styling
- `packages/api/src/court-intel/` — AI court intelligence module
- `packages/api/src/ai-drafting/` — AI document drafting module
- `packages/api/src/conflicts/conflict-analysis.service.ts` — AI conflict detection
- `packages/api/src/leads/intake-assistant.service.ts` — AI intake parsing
- `packages/api/src/time-billing/` — Time entries, billing rates, invoicing
- `packages/api/src/court-calendar/` — Court hearings and deadlines
- `packages/api/src/tasks/` — Task management with Kanban
- `packages/api/src/notifications/` — Notification CRUD and unread counts
- `packages/api/src/jobs/` — BullMQ background job processors
- `docs/internal/ADR.md` — Architecture Decision Records
- `docs/internal/AI_STRATEGY.md` — AI integration roadmap
- `docs/internal/LEGAL_TERMINOLOGY.md` — Full terminology reference with Arabic
- `docs/internal/AZURE_DEPLOYMENT.md` — Azure deployment guide (manual + CI/CD)
- `docs/internal/AZURE_CONTAINER_APPS_GUIDE.md` — Reusable guide for Container Apps deployments
- `.github/workflows/deploy.yml` — CI/CD pipeline (push to main → deploy)
