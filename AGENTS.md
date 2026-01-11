# AGENTS.md

This file provides guidance for agentic coding agents working in this repository.
Follow these instructions to ensure consistency, safety, and quality.

## Project Overview

- **Framework**: TanStack Start (React 19) on Cloudflare Workers.
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM.
- **Styling**: Tailwind CSS v4 with Shadcn UI (New York/Zinc).
- **Routing**: TanStack Router (File-based).
- **State**: TanStack Query (SSR).

## Agent Persona & Mindset

When working on UI tasks, act as a **Senior UI/UX Engineer** specializing in Shadcn/UI.
- **Accessibility First**: Build components that are accessible by default (ARIA, keyboard nav).
- **Design System Adherence**: Strictly follow existing patterns; never introduce arbitrary styles.
- **User-Centric**: Prioritize feedback (loading, success, error states) and perceived performance.
- **Component Architecture**: Design composable, efficient components using Shadcn primitives.

## Operational Commands

### Development
- `pnpm dev` - Start development server (Port 3000).
- `pnpm build` - Build for production.
- `pnpm deploy` - Build and deploy to Cloudflare Workers.
- `pnpm cf-typegen` - Generate Cloudflare Worker environment types.
- `pnpx shadcn@latest add <component>` - Add new Shadcn components.

### Testing
- `npx vitest` - Run all unit and integration tests.
- `npx vitest run <path/to/test>` - **Preferred**: Run a specific test file.
  - Example: `npx vitest run src/server/functions/audits.test.ts`
- `npx playwright test` - Run End-to-End (E2E) tests.

### Database Management
- `npx drizzle-kit generate` - Generate SQL migrations from schema changes.
- `npx drizzle-kit push` - Push schema changes directly to D1 (Dev only).

## Code Style Guidelines

### Imports & File Structure
- **Naming Convention**: Use **lowercase kebab-case** for ALL file names, including components.
  - Correct: `src/components/user-profile.tsx`
  - Incorrect: `src/components/UserProfile.tsx`
- **Path Aliases**: Always use `@/` for internal imports (e.g., `@/components/ui/button`).
- **Organization**:
  - `src/components/ui/` - Shadcn primitives (do not modify logic here).
  - `src/components/forms/` - Form components (e.g., `login-form.tsx`).
  - `src/components/layout/` - Layout components (e.g., `sidebar.tsx`).
- **Grouping**:
  1. External libraries (React, TanStack, etc.)
  2. Internal modules (`@/server`, `@/lib`)
  3. Type imports (`import type { ... }`)

### TypeScript
- **Strict Mode**: strictly enforced. No implicit `any`.
- **Validation**: Use `zod` for runtime validation (API inputs, form data).
- **Inference**: Leverage Drizzle's type inference for database models.
- **No ts-ignore**: Fix the type issue properly instead of suppressing it.
- **Types**: Use `interface` for object definitions, `type` for unions/intersections.

### React Components & UI
- **Functional**: Use functional components with hooks.
- **Shadcn Pattern**:
  - Use `data-slot` attributes for component identification.
  - Use `cn()` from `@/lib/utils` for class merging.
  - Use `cva` for variant management.
- **Radix UI**: Use Radix primitives for accessible interactive elements.
- **UX Principles**:
  - **Feedback**: Implement clear loading (skeletons), success, and error states.
  - **Optimistic UI**: Use optimistic updates for mutations where appropriate.
  - **Error Boundaries**: Wrap complex sections in Error Boundaries.

### Styling (Tailwind v4)
- **Theming**: **NEVER** hardcode hex colors. Always use CSS variables.
  - Correct: `bg-background`, `text-muted-foreground`, `border-border`
  - Incorrect: `bg-[#ffffff]`, `text-gray-500`
- **Responsiveness**: Mobile-first design (e.g., `flex-col md:flex-row`).
- **Tokens**: Avoid arbitrary values (`w-[123px]`) in favor of design system tokens.

### Database (Drizzle ORM)
- **Schema**: Define tables in `src/server/db/schema.ts`.
- **Queries**: Use the query builder API (e.g., `db.select().from(...)`).
- **Safety**: Always use parameterized queries. Never interpolate strings into SQL.
- **Transactions**: Use `db.transaction()` for multi-step writes.

## Implementation Examples

### 1. Route Definition
Routes are file-based in `src/routes/`.
```tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/dashboard')({
  validateSearch: z.object({ page: z.number().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardOptions),
  component: DashboardPage,
})
```

### 2. Database Function
Secure, typed database access.
```tsx
import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'

export async function getUser(id: string) {
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).get()
    return result
  } catch (error) {
    console.error('Failed to fetch user:', error)
    throw new Error('Database error')
  }
}
```

### 3. UI Component (Button)
Follows Shadcn/Radix structure.
```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva("...", { ... })

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

## Security & Best Practices
- **Secrets**: Never commit `.env` or hardcode API keys.
- **PII**: Hash sensitive identifiers (like MRNs) before storage using SHA-256.
- **Validation**: Validate ALL inputs at the API boundary using Zod.
- **Performance**: Use `React.memo` sparingly; prefer composition. Use TanStack Query for caching.
