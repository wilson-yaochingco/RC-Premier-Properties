# RC Premier Properties — Development Roadmap

The master implementation map. It states what the product is becoming, what phase we are
in, what to build next, and — just as importantly — **what must not be built yet**.

Architecture is documented separately in
[`architecture/overview.md`](architecture/overview.md); API rules in
[`api/conventions.md`](api/conventions.md). This document does not repeat them.

---

## Status legend

| Symbol | Meaning                                       |
| ------ | --------------------------------------------- |
| ⬜     | Not Started                                   |
| 🟨     | Planned — scope agreed, work not begun        |
| 🟦     | In Progress                                   |
| 🟩     | Complete — Definition of Done fully verified  |
| ⛔     | Blocked — waiting on a decision or dependency |

## Phase overview

| Phase | Name                                  | Status | In MVP?     |
| ----- | ------------------------------------- | ------ | ----------- |
| 0     | Project Foundation                    | 🟦     | Yes         |
| 1     | Product Planning, Brand & UX          | 🟦     | Yes         |
| 2A    | Core Public Website MVP               | 🟦     | Yes         |
| 2B    | Enhanced Property Experience          | ⬜     | No          |
| 3A    | Secure Property Administration        | ⬜     | Partly      |
| 3B    | CRM & Advanced Administration         | ⬜     | No          |
| 4     | Client Accounts & Seller Verification | ⬜     | No          |
| 5     | Communication & AI                    | ⬜     | No          |
| 6     | Production Hardening & Launch         | ⬜     | Launch gate |
| 7     | Post-Launch Growth                    | ⬜     | No          |

**Phases 0, 1 and 2A are In Progress, not Complete.** Phase 0 still needs a verified
MongoDB connection and repository-admin branch protection. Phase 1 still needs the
approved logo asset and business validation of lifecycle vocabulary. Phase 2A is built
and tested around those dependencies but cannot pass its persistence and real-inventory
gates without MongoDB and supplied listings. A directory existing is not evidence that a
capability works.

---

## How to use this document

**A roadmap entry means "this is planned." It does not mean "implement this now."**

Do not build a later phase early because it is documented here. Work only on the phase or
feature currently requested.

Before implementing any roadmap item:

1. Inspect the existing code — do not assume something does or does not exist.
2. Read the relevant documents in [`/docs`](README.md).
3. Confirm the dependencies for that item are actually finished.
4. Plan the change and agree the scope.
5. Implement only the requested scope.
6. Test it.
7. Update documentation when behaviour or architecture materially changes.

Conventions for where code belongs are in the root [`AGENTS.md`](../AGENTS.md).

---

## Confirmed technology stack

Verified from installed packages, not from declarations.

| Layer    | Technology                                                     |
| -------- | -------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend  | Node.js, Express 5, TypeScript (ESM)                           |
| Database | **MongoDB with Mongoose** — not to be substituted              |
| Shared   | `@rc/shared` — API types both apps compile against             |
| Security | helmet, express-rate-limit, origin-pinned CORS                 |
| Tooling  | npm workspaces, ESLint, Prettier, GitHub Actions CI            |

`shared/` is not in every early sketch of this project but is central to it: it is the
single definition of everything crossing the network, so type drift is a compile error
rather than a production bug. See [`architecture/overview.md`](architecture/overview.md).

**Infrastructure providers are deliberately unselected.** Media storage, email, SMS/OTP,
authentication, maps, analytics, monitoring, hosting, CDN, WAF and AI all read _provider
to be evaluated/selected during the relevant phase_. See the [Decision log](#decision-log--deferred-decisions).

---

## MVP boundary

The initial usable product is:

```text
Phase 0  +  Phase 1  +  Phase 2A  +  the listing-management slice of Phase 3A
```

That is: a foundation, an agreed design, an excellent public property website, and enough
admin capability that staff can manage listings without touching the database by hand.

**The MVP explicitly does not need** AI of any kind, a full CRM, client accounts, seller
verification, advanced analytics, favorites, or viewing scheduling. None of those prove
the core business experience; all of them can wait.

If a decision would delay the MVP for something on that list, the answer is no.

---

## Dependency map

```text
Phase 0  Foundation
   │
   ▼
Phase 1  Brand + Product + UX
   │
   ▼
Phase 2A Core Public MVP  ◄── MVP ships around here
   │
   ├──────────────► Phase 3A Property Administration
   │                    (listing management needed for a real MVP)
   ▼
Phase 2B Enhanced Experience
   │
   ▼
Phase 3B CRM + Operations
   │
   ▼
Phase 4  Client Accounts + Seller Verification
   │
   ▼
Phase 5  Communication + AI
   │
   ▼
Phase 6  Production Hardening ──► Launch
   │
   ▼
Phase 7  Growth
```

### What can run in parallel

- **Brand and UX work (Phase 1)** alongside the remaining Phase 0 cleanup — design does
  not depend on a MongoDB connection.
- **Phase 3A property administration** alongside the later parts of Phase 2A, once the
  property data model is settled. Admin needs the model, not the public UI.
- **SEO and accessibility** are not phases. They are requirements of every UI phase.
- **Documentation** is written with the change it describes, never after.

### What cannot

- No property UI before the data model exists (Phase 1 → 2A).
- No admin before authentication and server-side authorization (Phase 3A internal order).
- No favorites, bookings or seller submissions before there are properties to attach them
  to.
- **No AI before the property data, search, and lead workflows are reliable.** AI over a
  weak data layer produces confident nonsense.

---

# Phase 0 — Project Foundation 🟦

**Goal:** a clean, maintainable full-stack development environment before product
development begins.

### Repository and workflow

Branching model — **protected main**:

```text
feature/*  ──►  Pull Request  ──►  main
```

`main` is stable, release-ready code and is never developed on directly. Every change —
features, fixes, refactors and documentation alike — is made on a branch created _before_
the work starts, and reaches `main` through a reviewed pull request.

Full workflow, branch naming and commit conventions:
[`development/git-workflow.md`](development/git-workflow.md).

`.gitignore` must keep `.env`, `.env.local`, `node_modules`, build output and generated
types out of the repository. Only `.env.example` is committed.

### Frontend foundation

Next.js with App Router, React, TypeScript, ESLint, environment configuration, and the
source organization described in [`AGENTS.md`](../AGENTS.md): `app/` for routes,
`components/{ui,layout}/` for shared UI, `features/` for domain code. **No product UI.**

An API client foundation belongs here: a thin fetch wrapper in `src/services/` built on
`API_BASE_URL` from `src/lib/env.ts`, with consistent error handling, so every future
feature does not invent its own.

### Backend foundation

Express on TypeScript ESM with Mongoose, validated environment configuration, the
`app.ts`/`server.ts` split, central routing, MongoDB connection handling, a health
endpoint, and error-handling middleware.

### Frontend ↔ backend

```text
Next.js  ──►  Express REST API  ──►  MongoDB
```

The frontend calls the backend directly over HTTP at `NEXT_PUBLIC_API_URL`; it does not
proxy through Next.js API routes. All routes live under `API_PREFIX` from `@rc/shared`.

### Documentation

The `/docs` structure and its rules — see [`docs/README.md`](README.md).

### Security requirements

- [x] Secrets never committed; `.env` git-ignored, `.env.example` committed
- [x] CORS pinned to a single configured origin, never `*`
- [x] Security headers via helmet; rate limiting on the API surface
- [x] Environment validated at startup so misconfiguration fails loudly and early
- [x] Request body size limits

### Testing requirements

The foundation now supports the Phase 1/2A test harness. `createApp()` accepts injectable
services and never listens, so HTTP integration tests exercise the real Express stack
without requiring a test network port or pretending that an unavailable MongoDB works.

### Documentation to update

`docs/architecture/`, `docs/development/`, `docs/api/`

### Definition of Done

- [x] Frontend runs locally
- [x] Health endpoint responds
- [x] Environment files configured safely and git-ignored
- [x] Lint, typecheck and build pass; CI green on every push
- [x] Documentation structure exists with conventions written down
- [x] Development workflow documented
- [ ] **MongoDB connection verified working** — never yet achieved; no local server and
      no Atlas string configured
- [x] **Backend starts successfully** — verified in development; it reports MongoDB as
      disconnected and continues in an explicitly degraded state when the local service
      is unavailable
- [ ] Branch protection enabled on `main` (currently unprotected) and the pull request
      workflow in use
- [x] Pull request template added
- [x] Frontend API client foundation implemented with typed HTTP, transport and JSON
      error normalization

### Not in this phase

Any product UI, any Mongoose model, any business endpoint.

---

# Phase 1 — Product Planning, Brand & UX 🟦

**Goal:** decide what RC Premier Properties looks like, how people navigate it, and what
data it needs — before writing the public website.

This phase is mostly decisions and design. Resist starting Phase 2A code inside it.

### Brand identity

Logo; primary, secondary and neutral palettes; typography; photography direction;
iconography; spacing scale; border radii; shadows; motion philosophy.

Visual direction: **light luxury, premium, modern, clean, editorial, trustworthy,
real-estate focused.** Avoid generic SaaS styling — this is a property brand, not a
dashboard product.

### Target audience

Document each group and what it needs: buyers, renters, investors, sellers, existing
clients, and internal agents/admin staff. Account for Philippine market expectations,
including how buyers actually search and which communication channels they expect.

### Property taxonomy

Likely classifications: house and lot, condominium, townhouse, lot/land, commercial,
office, warehouse. **Do not over-model categories before requirements are known** — a
category nobody lists is a category that costs maintenance forever.

### Property data model planning

Plan fields, do not create schemas.

| Group          | Fields to plan                                                                           |
| -------------- | ---------------------------------------------------------------------------------------- |
| Identity       | Property ID, listing ID, title, slug                                                     |
| Listing        | For sale / for rent, property type, status, featured flag                                |
| Pricing        | Price, currency (**PHP / ₱** default), negotiability, pricing notes                      |
| Location       | Region, province, city/municipality, barangay, development, general address, coordinates |
| Specifications | Bedrooms, bathrooms, parking, lot area, floor area, furnishing, storeys, year built      |
| Content        | Short description, full description, highlights, amenities, features                     |
| Media          | Cover image, gallery, video tour, floor plans, brochure                                  |
| Ownership      | Assigned agent, internal reference data                                                  |

**Location privacy is a design decision, not an afterthought.** Decide per listing type
whether an exact address and coordinates may be public, or whether only a general area
should be shown until a viewing is booked. Owner information is never public.

The implementation separates editorial publication from market availability so one
cannot accidentally grant the other:

```text
publicationStatus: draft → pending → published → archived
availability:      available → reserved → sold / rented
```

This is the safest technical baseline; the business must validate the vocabulary before
Phase 3A exposes lifecycle controls to staff.

### Information architecture

Core public pages: Home, Listings, Property Details, About, Contact, Sell Your Property,
Book a Viewing. Later: Blog/Resources, Login, Client Dashboard, Admin Dashboard.

### UX design

Produce wireframes or clickable designs before implementation, at **mobile, tablet and
desktop**, prioritising the seven core pages. Dashboards may stay low-fidelity until
their implementation phase approaches.

### Security requirements

- [x] Decide which property fields are public, which are authenticated, which are
      internal-only — before any model is written
- [x] Decide the location-privacy rule per listing type — general area only for every
      public MVP listing; exact addresses and coordinates remain internal
- [x] Identify what personal data each form will collect and why it is needed

### Testing requirements

- [x] **Select and configure a test runner** — Vitest for unit/HTTP integration tests and
      Playwright for browser acceptance
- [x] One integration test proving the harness runs in CI
- [x] Agree what "tested" means per layer, so Phase 2A can ship tests from its first commit

### Documentation to update

`docs/architecture/` (brand and UX decisions with lasting structural impact),
`docs/database/` (the planned property model, clearly marked as planning),
`docs/development/` (testing conventions)

### Definition of Done

- [ ] Brand identity documented: colors, typography, spacing, iconography and motion are
      documented; the approved logo asset is still not present
- [x] Target audiences documented
- [x] Property taxonomy agreed and justified for the public MVP
- [x] Property data model planned field by field, including public/private classification
- [x] Location-privacy rule decided
- [ ] Lifecycle statuses implemented as separate publication and availability states,
      pending business validation before administration work
- [x] Information architecture and navigation agreed
- [x] Designs exist as implemented, clickable pages for all seven core routes at mobile,
      tablet and desktop breakpoints
- [x] Test runner configured and running in CI
- [x] Relevant documentation updated

### Not in this phase

Building pages, creating Mongoose models, writing endpoints.

---

# Phase 2A — Core Public Website MVP 🟦

**Goal:** launch the core property browsing experience. This is the first genuinely
usable version of RC Premier Properties.

**Depends on:** Phase 1 designs and the agreed property data model.

### Scope

**Home** — hero, property search entry, featured properties, categories, locations, why
RC Premier Properties, selling CTA, viewing CTA, trust signals, contact CTA. Final
sections follow the Phase 1 designs, not this list.

**Listings** — the discovery surface. Filters: keyword, location, sale/rent, property
type, min/max price, bedrooms, bathrooms, lot area, floor area. Sorting: newest, price
ascending, price descending. Filters belong in the URL so results are shareable and
back-button behaviour is correct. Plan a scalable result strategy (pagination or
equivalent) plus empty, loading and error states, and a mobile filter UX that is not a
desktop panel squeezed onto a phone.

**Listing cards** — cover image, price, sale/rent, type, location, bedrooms, bathrooms,
area, status. Keep them visually clean; a card that shows everything communicates nothing.

**Property details** — gallery, price, location, specifications, description, highlights,
amenities, map, assigned agent, inquiry CTA, viewing CTA. Similar properties only as a
placeholder until real recommendation logic exists in Phase 5E.

The Phase 2A map is a privacy-preserving public discovery baseline, not a production map
provider decision. It may render only a separately approved public point, approximate
city/municipality boundaries and configurable evaluation tiles. Geocoding, routing,
nearby landmarks, production provider selection and provider account setup remain in
Phase 2B.

**About** — company, mission, service area, professional positioning. **Do not fabricate
awards, statistics, reviews, accreditations or company history.** Only publish what the
business supplies.

**Contact** — contact details, inquiry form, office information if supplied.

**Inquiry system** — real persistence, not a form that emails into the void. Store
property, name, email, phone, message, timestamp, source, status.

### Frontend responsibilities

Public pages and layouts in `app/`; shared primitives in `components/ui/` and
`components/layout/`; property-specific components, hooks and services in
`features/properties/`; inquiry code in `features/inquiries/`.

### Backend responsibilities

`modules/properties/` and `modules/inquiries/`: model, service, controller, routes and
validation. Public read endpoints for published listings only. Server-side filtering,
sorting and pagination — never ship the whole collection and filter in the browser.

### Data requirements

First real Mongoose models: `Property` and `Inquiry`. Indexes on the fields filters and
sorts actually use. Unpublished listings must be unreachable through any public endpoint.

### Security requirements

- [x] Input validation on every filter and form field, server-side
- [x] **NoSQL injection prevention** — allowlisted fields, scalar validation and escaped
      regular expressions; user input is never spread into a query object
- [x] Rate limiting and honeypot spam prevention on the inquiry form from day one
- [x] Only published listings exposed publicly; draft, pending and archived never leak
- [x] Owner and internal reference data never serialized to public responses
- [x] Inquiry data treated as personal information from the moment it is collected

### SEO requirements

Metadata per page, canonical URLs, semantic HTML, Open Graph, sitemap, robots
configuration, property-specific metadata, and structured data where appropriate.
Human-readable URLs, concept:

```text
/properties/modern-3-bedroom-house-angeles-city
```

Confirm URL architecture against Next.js App Router conventions before finalising.

### Accessibility requirements

Keyboard navigation, semantic structure, form labels, visible focus, an alt-text strategy
for property imagery, sufficient contrast, and accessible modals and galleries.

### Responsive requirements

Mobile, tablet and desktop. Mobile is the primary case for property browsing in this
market, not an afterthought.

### Testing requirements

- [x] Unit tests for filter/query building and price formatting
- [x] Integration tests for property listing, detail and inquiry endpoints
- [x] A test proving unpublished listings are not publicly reachable
- [ ] Manual acceptance pass across all three breakpoints

### Documentation to update

`docs/features/properties.md`, `docs/features/inquiries.md`, `docs/api/`,
`docs/database/`

### Definition of Done

- [x] All core public pages implemented and matching the Phase 1 designs
- [ ] Property search, filtering, sorting and pagination are implemented and tested with
      isolated fixtures, but a real MongoDB and supplied inventory are unavailable
- [ ] Filters reflected in the URL; browser navigation behaves correctly
- [x] Empty, loading and error states implemented across the public routes and forms
- [ ] Inquiry persistence is implemented; live persistence is unverified without MongoDB,
      and staff retrieval correctly waits for authenticated administration
- [x] Unpublished listings verified unreachable publicly
- [ ] Responsive on mobile, tablet and desktop
- [x] SEO foundation in place: metadata, sitemap, robots, canonical URLs, structured data
- [ ] Accessibility requirements met
- [x] Unit and HTTP integration tests pass; implemented security requirements are covered
- [ ] Documentation updated

### Not in this phase

Favorites, viewing scheduling, calculators, accounts, admin UI, AI, recommendations.

---

# Phase 2B — Enhanced Property Experience ⬜

**Goal:** deepen engagement once the core public experience is stable.

**Depends on:** a stable Phase 2A.

### Scope

**Favorites** — decide whether anonymous favorites use local storage initially and
authenticated favorites sync later. If both, **document the migration strategy before
building either**, or anonymous favorites will be silently lost at sign-up.

**Viewing scheduling**

```text
Property → select date/time → contact details → booking request → admin review
```

Do not assume instant confirmation. A viewing is a commitment of someone's time; default
to admin review unless the business explicitly wants auto-confirmation.

**Video tours** — where the business supplies them.

**Production maps and nearby landmarks** — evaluate and select the production map
provider, configure the production account/domain, and decide whether to add geocoding,
routing or nearby-landmark data. The Phase 2A discovery baseline does not select a
production provider. Every expansion must preserve the Phase 1 location-privacy rule.

**Property brochure** — decide during implementation whether brochures are uploaded,
generated, or both.

**Mortgage calculator** — PHP calculations from property price, down payment, interest
rate and term. **Label results as estimates. Not financial advice, not a lender quote.**

**Cash-out / payment calculator** — ⛔ **Blocked.** The business meaning of "cash-out
calculator" is undefined. Define the actual rules before any implementation; do not
invent financial formulas.

**Communication integrations** — Messenger, WhatsApp, Viber, telephone. Evaluate which
channels the business actually uses rather than adding all four.

### Security requirements

- [ ] Booking requests rate-limited and validated; treat as personal data
- [ ] Anonymous favorites never leak one visitor's data to another
- [ ] Calculators run on inputs the user supplies; no server-side financial decisions
- [ ] Map integration does not expose precise coordinates for privacy-restricted listings

### Testing requirements

- [ ] Unit tests for calculator maths, including boundary values
- [ ] Integration tests for booking creation and favorites persistence
- [ ] Migration test if anonymous favorites transfer to accounts

### Documentation to update

`docs/features/`, `docs/api/`, `docs/database/`

### Definition of Done

- [ ] Favorites work, with the anonymous/authenticated strategy documented
- [ ] Viewing requests can be submitted and reviewed
- [ ] Map integration live and respecting location privacy
- [ ] Mortgage calculator accurate and clearly labelled as an estimate
- [ ] Cash-out calculator either defined and built, or explicitly deferred
- [ ] Responsive and accessible
- [ ] Tests pass; security requirements verified
- [ ] Documentation updated

---

# Phase 3A — Secure Property Administration ⬜

**Goal:** let authorized staff manage listings without touching the database by hand.

**Depends on:** the property model from Phase 2A. **Security is architectural here, not a
later addition.**

The listing-management portion of this phase is part of the MVP — a public site nobody
can update is not a product.

### Authentication

Plan session/token architecture, secure credential handling, password hashing if
credentials are managed locally, MFA/2FA, login rate limiting, account lockout, secure
logout, and session expiry.

Decide deliberately whether authentication is built in-house or delegated to a managed
identity provider, and **document the security implications of the choice.** Do not
choose on convenience alone. _Provider to be evaluated/selected during this phase._

### Authorization

Server-side role enforcement on every sensitive action. Candidate roles: `admin`,
`agent`, `client` — not final until validated against real requirements.

**Hiding a button in the frontend is not authorization.** Every sensitive backend action
independently verifies permissions, regardless of what the UI allows.

### Property management

Create, edit, preview, draft, publish, unpublish, archive, mark reserved, mark sold, mark
rented.

### Media management

Drag-and-drop upload, multiple images, reordering, cover selection, compression, modern
formats, file size limits, **MIME validation**, secure upload handling, and deletion.
_Storage provider to be evaluated/selected during this phase._

### Inquiry management

View inquiries, identify the related property, assign status, record follow-up. Candidate
lifecycle, pending business validation:

```text
new → contacted → qualified → viewing scheduled → closed / lost
```

### Audit trail

Record actor, action, entity, entity ID, timestamp and relevant change metadata for
sensitive changes. **Do not log sensitive values themselves** — record that a field
changed, not the personal data it contained.

### Security requirements

- [ ] Every admin endpoint enforces authentication **and** authorization server-side
- [ ] Broken access control tested explicitly: client role cannot reach admin endpoints,
      agent cannot reach another agent's data
- [ ] Uploads validated by MIME type and size; filenames sanitised; uploads cannot be
      executed
- [ ] Login rate limiting and lockout in place
- [ ] Sessions expire; logout genuinely invalidates
- [ ] Audit trail captures sensitive changes without capturing sensitive values
- [ ] Admin routes excluded from public search indexing

### Testing requirements

- [ ] **Authorization tests are mandatory**, not optional: every role against every
      sensitive endpoint
- [ ] Integration tests for the full listing lifecycle
- [ ] Upload tests including malicious file types and oversized files
- [ ] Authentication abuse tests: brute force, session fixation, expired tokens

### Documentation to update

`docs/architecture/` (authentication and authorization architecture),
`docs/features/`, `docs/api/`, `docs/database/`

### Definition of Done

- [ ] Staff can perform the full listing lifecycle through the UI
- [ ] Authentication implemented with the chosen approach documented
- [ ] Role-based authorization enforced server-side on every sensitive action
- [ ] Authorization tests pass for every role/endpoint combination
- [ ] Media upload secure, validated and working
- [ ] Inquiry management usable by staff
- [ ] Audit trail recording sensitive changes
- [ ] Tests pass; security requirements verified
- [ ] Documentation updated

### Not in this phase

Full CRM, agent management, analytics, client accounts.

---

# Phase 3B — CRM & Advanced Administration ⬜

**Goal:** turn admin tooling into a real estate operations workspace.

**Depends on:** Phase 3A authentication and authorization.

### Scope

**Leads** — contact, property, inquiry, source, status, assigned agent, follow-up, notes,
timeline.

**Clients** — central client records.

**Agents** — profile, contact information, listing assignments, lead assignments, status.

**Bookings** — manage viewing requests from Phase 2B.

**Analytics** — candidate metrics: property views, popular listings, inquiry count,
inquiry source, viewing requests, conversion rate. **Define precisely what each metric
counts before implementing it.** Never display fabricated or vanity numbers — a metric
nobody can explain is worse than no metric.

**Audit logs** — appropriate admin access to security and activity history.

### Security requirements

- [ ] Agents see only the leads and listings assigned to them, enforced server-side
- [ ] Client records are personal data with correspondingly restricted access
- [ ] Audit log is append-only and readable only by authorized roles
- [ ] Analytics aggregate; they never expose individual client identities to unauthorized
      staff

### Testing requirements

- [ ] Authorization tests for agent-scoped data access
- [ ] Integration tests for lead lifecycle transitions
- [ ] Unit tests for analytics aggregation, verified against known fixtures

### Documentation to update

`docs/features/`, `docs/api/`, `docs/database/`

### Definition of Done

- [ ] Leads, clients, agents and bookings manageable through the UI
- [ ] Every analytics metric documented with its exact definition
- [ ] Agent-scoped access verified by tests
- [ ] Audit logs accessible to authorized roles
- [ ] Tests pass; security requirements verified
- [ ] Documentation updated

---

# Phase 4 — Client Accounts & Seller Verification ⬜

**Goal:** authenticated client experiences, without exposing private information
publicly.

**Depends on:** Phase 3A authentication.

### Registration

Candidate requirements: full legal name, email with verification, phone with OTP,
password or identity-provider authentication, terms and privacy acceptance.
_Email and SMS/OTP providers to be evaluated/selected during this phase._

### Privacy

**Real names and private account information must never become publicly visible by
default.** Only authorized staff access sensitive identity information, only when
genuinely required for the task.

### Client dashboard

Profile, favorites, viewing bookings, inquiry history, and messages if messaging exists.

### Seller workflow

```text
Seller submission → property details → required documents → identity/document review
   → admin review → approved / rejected / changes requested → listing preparation → published
```

### Document security

Seller identity and property documents require **stronger controls than public property
images**: private storage separate from the public media bucket, authorization on every
access, limited and time-bound access, validation, audit logging of every view, and a
documented retention policy. These documents are the most sensitive data in the system.

### Security requirements

- [ ] Clients can access only their own data — verified by test, not by inspection
- [ ] Seller documents stored privately, never publicly addressable
- [ ] Every document access authorized and audit-logged
- [ ] Email verification and phone OTP resistant to enumeration and abuse
- [ ] Password storage uses a current, strong hashing algorithm if managed locally
- [ ] Retention policy defined for identity documents

### Testing requirements

- [ ] Authorization tests: one client attempting to reach another client's data
- [ ] Tests proving seller documents are unreachable without authorization
- [ ] Registration abuse tests: enumeration, OTP brute force, verification bypass

### Documentation to update

`docs/architecture/` (privacy and document-security architecture),
`docs/features/`, `docs/api/`, `docs/database/`

### Definition of Done

- [ ] Registration with verification working
- [ ] Client dashboard functional
- [ ] Seller submission workflow end to end
- [ ] Documents private, authorized, audit-logged, with a retention policy
- [ ] Cross-account access attempts fail, proven by tests
- [ ] Tests pass; security and privacy requirements verified
- [ ] Documentation updated

---

# Phase 5 — Communication & AI ⬜

**Goal:** introduce AI only after property data, search, accounts and lead workflows are
reliable.

**Depends on:** Phases 2A, 3A, 3B and 4. _AI provider to be evaluated/selected during
this phase._

AI over a weak data layer produces confident nonsense. The order here is not negotiable.

### 5A — Live communication

Website messaging or chat, plus external channels where appropriate. Decide whether
communication is synchronous, asynchronous, external-platform based, or a combination.

### 5B — AI FAQ assistant

Answers approved questions about the viewing process, property categories, locations,
general financing process, requirements and RC Premier Properties services.
**The assistant must not invent company policies or listing facts.**

### 5C — Natural-language property finder

> Find me a 3-bedroom house in Quezon City under ₱15M.

Translates intent into structured search criteria and **searches actual property data**.
The model selects filters; the database selects listings. The model never generates
listings.

### 5D — AI lead qualification

Budget, location, property type, timeline, purchase/rental intent, payment method. Store
structured answers against the lead record.

### 5E — Recommendations

Similar properties drawn from real inventory only.

### 5F — AI-assisted follow-up

Drafts for staff: inquiry responses, viewing follow-ups, property recommendations.
**Human approval required before anything is sent.**

### AI safety rules

AI must never autonomously publish listings, change prices, promise availability, make
contractual commitments, approve sellers or clients, make legal determinations, provide
personalized financial advice, or send sensitive communications without human review.

### Security requirements

- [ ] Prompt injection considered wherever AI reads user-supplied or listing content
- [ ] AI has no write access to listings, prices or approvals
- [ ] Personal data sent to any AI provider is minimised and documented
- [ ] AI outputs affecting customers pass through human review
- [ ] AI endpoints rate-limited and abuse-monitored

### Testing requirements

- [ ] Tests proving AI cannot return properties absent from the database
- [ ] Tests proving AI cannot perform restricted write actions
- [ ] Prompt-injection resistance tests
- [ ] Unit tests for natural-language-to-filter translation

### Documentation to update

`docs/architecture/` (AI architecture and safety boundaries), `docs/features/`, `docs/api/`

### Definition of Done

- [ ] Each shipped sub-capability meets its own acceptance criteria
- [ ] Every AI safety rule enforced in code, not merely by prompt
- [ ] AI-generated customer communication requires human approval
- [ ] Tests pass, including injection and fabrication tests
- [ ] Documentation updated

---

# Phase 6 — Production Hardening, Security Audit & Launch ⬜

**Goal:** verify the whole platform before release.

**Security was built throughout every earlier phase. This phase verifies it
comprehensively — it is not the first time security is considered.**

Use recognised guidance: [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
and the [OWASP Top 10](https://owasp.org/www-project-top-ten/).

### Application security review

Authentication, authorization, access control, session security, input validation, output
encoding, CSRF where applicable, XSS, injection, **NoSQL injection**, rate limiting, file
upload security, secret management, sensitive data handling.

**Pay particular attention to broken access control** — consistently the most common and
most damaging web application flaw.

### Infrastructure

HTTPS, secure hosting, CDN, WAF, DDoS protection, backups, restore procedures,
environment isolation, secret storage. _Providers to be evaluated/selected during this
phase._

### Testing

Unit tests for important business logic. Integration tests for API and database
interactions. **Authorization tests** attempting to reach other users' data, admin
endpoints as a client, agent endpoints without permission, private documents, and
unpublished listings.

End-to-end tests for the critical journeys that exist by this point:

```text
Browse → Property → Inquiry
Search → Filter → Property
Property → Book Viewing
Admin Login → Create Listing → Publish
Client Login → Favorite → Dashboard
```

### Security testing

Dependency scanning, static analysis, vulnerability scanning, upload testing, rate-limit
testing, authentication abuse testing, authorization testing, and penetration testing
before launch where feasible.

### Performance

Core Web Vitals, image optimization, API performance, MongoDB query performance and
indexes, caching, bundle size, lazy loading, CDN usage. **Identify where caching helps
before introducing it** — premature caching hides problems rather than solving them.

### SEO and accessibility audits

Metadata, sitemap, robots, canonical URLs, structured data, social previews, property
indexing, redirects, 404 handling. Accessibility reviewed against appropriate WCAG
guidance.

### Monitoring

Application and backend errors, failed login spikes, permission failures, suspicious
behaviour, availability, performance, and critical admin actions. _Provider to be
evaluated/selected during this phase._

### Backup recovery

**Do not merely verify that backups exist. Perform a restore and document the result.**
An untested backup is a hypothesis.

### Definition of Done — production launch gate

- [ ] Security review complete; all critical and high findings resolved
- [ ] Broken access control specifically tested across every role
- [ ] Dependency and vulnerability scans clean of critical issues
- [ ] Penetration test completed where feasible; findings resolved
- [ ] HTTPS, WAF, DDoS protection and environment isolation in place
- [ ] Secrets stored securely; none present in Git history
- [ ] **Backup restore performed and documented** — not just configured
- [ ] Unit, integration, authorization and E2E tests pass
- [ ] Core Web Vitals within target on mobile and desktop
- [ ] SEO audit passed
- [ ] Accessibility audit passed
- [ ] Monitoring and alerting live and verified
- [ ] Rollback procedure documented and tested
- [ ] Documentation current

**Production does not launch until every critical item above passes.**

---

# Phase 7 — Post-Launch Growth ⬜

**Goal:** keep improving based on real usage. Launch is a milestone, not the finish line.

Candidate work, none scheduled: search improvements, better recommendations, CRM
improvements, agent tools, lead automation, advanced analytics, content and blog
expansion, SEO expansion, performance work, mobile/PWA improvements, a notification
system, additional integrations, AI improvements, operational tooling.

**Prioritise from actual user and business data after launch**, not from this list.

---

# Cross-cutting requirements

These apply across phases and are not optional extras.

**Security is continuous.** Every phase carries its own security requirements. Phase 6
verifies; it does not introduce.

**Privacy.** The product handles personal information, contact details, identity
verification, seller documents and client history. Because it operates in the
Philippines, **data-protection obligations must be reviewed by someone qualified before
production.** This document makes no legal claims and is not a compliance assessment.

**Accessibility** applies to every UI phase, considered during development rather than
bolted on before launch.

**Responsive design.** Every public and client interface works on mobile, tablet and
desktop.

**Performance.** Avoid unnecessarily heavy frontend experiences. Property imagery is the
dominant payload of a real estate site and must be optimized.

**SEO.** Public property inventory must be discoverable and correctly understood by
search engines.

**Observability.** Production systems need sufficient logging and monitoring to diagnose
problems without reproducing them locally.

**Documentation.** Significant architectural or behavioural changes update `/docs` in the
same change.

---

# Conceptual domain map

**This is a conceptual map, not a MongoDB schema.** Actual schemas are designed during
the phase that implements them.

Candidate entities:

```text
User            Property        PropertyMedia   Agent
Inquiry         ViewingBooking  Favorite        SellerSubmission
Lead            Message         AuditLog
```

Likely relationships, conceptually:

```text
Property
 ├── Agent              assigned
 ├── Media              images, floor plans, brochure
 ├── Inquiries
 ├── Viewing Bookings
 └── Favorites

User
 ├── Favorites
 ├── Inquiries
 ├── Viewing Bookings
 └── Seller Submissions
```

**Do not force relational patterns onto MongoDB.** Whether media is embedded in the
property document or stored separately, and whether inquiries reference properties or
duplicate a snapshot, depends on real access patterns. Decide those when the access
patterns are known — not now.

---

# Conceptual API evolution

**Planning examples only. These are not instructions to implement.** All routes sit under
`API_PREFIX` from `@rc/shared`; real endpoints are documented in
[`docs/api/`](api/) as they are built.

```text
/api/v1/health                        ← exists today

/api/v1/properties                    Phase 2A
/api/v1/properties/:id-or-slug        Phase 2A
/api/v1/inquiries                     Phase 2A
/api/v1/viewings                      Phase 2B
/api/v1/auth                          Phase 3A
/api/v1/admin/...                     Phase 3A
/api/v1/users                         Phase 4
```

Conventions every endpoint follows — versioning, error envelope, status codes — are in
[`api/conventions.md`](api/conventions.md).

---

# Environment strategy

```text
Development  →  Testing  →  Staging  →  Production
```

Not all environments are needed immediately. Development exists today; testing becomes
meaningful once the Phase 1 test runner is configured; staging matters as Phase 6
approaches.

**Production secrets are never stored in Git.** Only `.env.example` is committed. Each
environment gets its own database, its own credentials, and its own configured origins.

---

# Decision log — deferred decisions

No vendor has been selected. Each decision below is deliberately open.

| Decision                | Decide by | What should drive it                                                          |
| ----------------------- | --------- | ----------------------------------------------------------------------------- |
| Test runner             | Phase 1   | Speed, TypeScript/ESM support, CI integration, watch-mode experience          |
| Production map provider | Phase 2B  | Philippine coverage quality, pricing at expected volume, privacy controls     |
| Authentication approach | Phase 3A  | Security posture, MFA support, maintenance burden, cost — **not convenience** |
| Media storage provider  | Phase 3A  | Cost at volume, CDN integration, image transformation, private-bucket support |
| Email provider          | Phase 4   | Deliverability to Philippine recipients, transactional reliability, cost      |
| SMS/OTP provider        | Phase 4   | Philippine carrier coverage, delivery rates, per-message cost                 |
| AI provider             | Phase 5   | Model quality, cost per request, data handling terms, latency                 |
| Hosting provider        | Phase 6   | Region/latency for Philippine users, cost, operational simplicity             |
| CDN                     | Phase 6   | Image delivery performance, regional presence, cost                           |
| WAF / DDoS protection   | Phase 6   | Threat coverage, false-positive rate, integration with hosting                |
| Analytics provider      | Phase 6   | Privacy posture, data ownership, required metrics                             |
| Monitoring provider     | Phase 6   | Error tracking, alerting, log retention, cost                                 |

Open business questions:

- **"Cash-out calculator"** — meaning undefined. ⛔ Blocks that Phase 2B item.
- **Property lifecycle statuses** — proposed, needs business validation.
- **Inquiry lifecycle statuses** — proposed, needs business validation.
- **Roles** (`admin`, `agent`, `client`) — proposed, needs validation.
- **Location privacy per listing type** — must be decided in Phase 1.

When a decision is made, record it in [`architecture/`](architecture/) with its reasoning
and update the row above.

---

# Out of scope / guardrails

**A roadmap entry means "this is planned." It does not mean "implement this now."**

Do not:

- Implement a later phase because it is documented here
- Create Mongoose models for features not currently being built
- Add infrastructure because it might eventually be useful
- Select a provider that this document lists as deferred
- Fabricate company facts — awards, statistics, reviews, accreditations, history
- Invent financial formulas without confirmed business rules
- Present AI output as verified fact
- Treat frontend hiding as authorization
- Mark a phase complete because its directories exist

Work only on the currently requested phase or feature. When a phase's Definition of Done
has unchecked items, that phase is not finished — regardless of how much of it appears to
work.
