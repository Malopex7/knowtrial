# Project Direction — KnowTrial

## Purpose
A study app that transforms learning material into original, citation-grounded practice exams. Users upload study material, generate exams, take them, receive scored feedback with explanations, and track progress over time.

## Core Constraints
1. **No copyrighted content** — never use real vendor exam questions or dumps; generate original questions only.
2. **Grounded in source material** — every question and explanation must cite the specific chunks used as evidence.
3. **No hallucinations** — answers and explanations must be supported by referenced material; flag uncertainty.

## Coding Conventions
- **Backend:** Express 5 (ES modules), Mongoose models in `PascalCase`, route files in `camelCase`.
- **Frontend:** Next.js App Router, TypeScript strict mode, Zustand for state, shadcn/ui components.
- **Styling:** Tailwind v4 utility classes only — no inline styles, no CSS modules.
- **API responses:** Always return `{ success: true, data: ... }` or `{ success: false, error: "message" }`.
- **Validation:** Validate all inputs on the backend; validate generated question objects against the JSON schema before storing.
- **Auth:** JWT tokens in `Authorization: Bearer <token>` header. Middleware: `protect` (logged-in) and `adminOnly` (admin role).

## Design Principles
- Clean, modern UI (dark mode default).
- Fast: cache processed materials, reuse chunk indexes.
- Clear error messages with actionable fallbacks.
- Mobile-responsive (Tailwind breakpoints).

## South African Localisation
- Date format: `DD/MM/YYYY`
- Currency: ZAR (R) where applicable
- Timezone: SAST (UTC+2) for timestamps
