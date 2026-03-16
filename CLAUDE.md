# CLAUDE.md — Aryan's Master Context & System Rules

> **System Directive for Claude:** Read this file at the start of every session. This document defines the user's identity, active projects, coding standards, and exact workflows. Adhere strictly to these rules to maximize productivity and minimize token waste.

---

## 👨‍💻 User Context

- **Name:** Aryan
- **Location:** Brampton, Ontario, Canada
- **Role:** Full-stack web developer & brand builder
- **Core Stack:** React, Vite, TypeScript, Tailwind CSS, Node.js
- **Preferred Architecture:** Decoupled/Headless, Mobile-first, Component-driven

---

## 🚀 Active Projects & State

### 1. CTRL Society (Streetwear Brand)

- **Type:** Headless E-commerce Storefront
- **Stack:** React + Vite + Shopify Storefront API
- **Shopify Store ID:** `hhysxm-pd`
- **Aesthetic:** Streetwear, bold, dark-first, high-contrast
- **Current Focus:** Active development (cart state, collections, product pages)

### 2. AFG Towing (Service Website)

- **Type:** Lead-generation / Landing page
- **Stack:** React + Vite + TypeScript + Tailwind
- **Context:** Local service business in the GTA (Greater Toronto Area)
- **Status:** Production-ready, maintenance mode
- **Key Features:** Mobile-first fluid typography, mobile drawer navigation

---

## 🔌 External Tools & MCP Integrations

> **System Directive:** I have integrated various online tools. Use them proactively based on these triggers without asking for permission first.

| Tool / Integration         | When & How Claude Should Use It                                                                                                                                       |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GitHub / Git**           | When asked to "commit" or "save", automatically stage, commit with conventional commit messages, and push.                                                            |
| **Context7 / Docs**        | ALWAYS fetch the latest documentation for Shopify Storefront API, Vite, or React Query before implementing complex features to prevent hallucinating outdated syntax. |
| **Figma**                  | When I provide a Figma link, extract the exact hex codes, border radii, and spacing variables to generate Tailwind config or CSS custom properties.                   |
| **Vercel / Netlify CLI**   | When asked to "deploy" or check build status, run the appropriate CLI commands and report errors.                                                                     |
| **Google Calendar / Mail** | Use to schedule dev sprints or read client feedback emails if I say "Check client notes."                                                                             |

---

## 🧠 Context Management & Workflow Rules

To ensure you use context wisely every time, follow these absolute rules:

1. **Check the Mistake Log:** Before writing ANY code, scan the "Running Log" at the bottom of this file. Do not repeat past mistakes.
2. **Think Step-by-Step:** For any task over 20 lines of code, write a 2-3 sentence implementation plan using a `<thinking>` block. Wait for my approval if the task is highly complex.
3. **Surgical Edits:** When modifying existing files, output ONLY the modified functions or components. Do not rewrite the entire 300-line file unless explicitly asked. Use `// ... existing code` to represent unchanged parts.
4. **Self-Updating:** If we solve a complex bug or establish a new architectural pattern, I will tell you to "Update CLAUDE.md". You will format the new rule and append it to the appropriate section.

---

## 💻 Coding Standards & Preferences

### React & TypeScript

- **Strictly Functional:** React functional components with hooks only. Zero class components.
- **Typing:** Strict TypeScript interfaces for all props and API responses. Avoid `any`.
- **Naming:** `PascalCase` for component files (e.g., `HeroSection.tsx`). `camelCase` for utilities/hooks (e.g., `useCart.ts`, `formatPrice.ts`).

### Styling & CSS

- **Mobile-First:** Always style for small screens first, then scale up using Tailwind breakpoints (`md:`, `lg:`).
- **Tailwind:** Primary styling method. Use utility classes.
- **Variables:** Use CSS custom properties (`var(--primary)`) for global theme colors, never hardcode hex values in components.
- **No Inline Styles:** Use the `style={{}}` prop ONLY for dynamic calculations (e.g., transform values based on scroll).

### Best Practices

- **Graceful Degradation:** Always implement Loading states (`<Skeleton />` or spinners) and Error states/boundaries.
- **Async Logic:** Prefer `async/await` and `try/catch` over `.then().catch()`.

---

## 🛠 Standard Operating Procedures (SOPs)

**SOP: Creating a New Component**

1. Define the TypeScript interface for props.
2. Build the mobile layout first with Tailwind.
3. Add responsive breakpoints.
4. Implement loading/error states if it fetches data.
5. Provide a usage example at the bottom of the response.

**SOP: Debugging**

1. Identify the file and line number of the error.
2. Explain _why_ it failed in 1 sentence.
3. Provide the exact code fix.
4. Suggest a preventative measure (e.g., adding a TS type or error boundary).

---

## 🗣 Communication Style

- **Zero Fluff:** No "Certainly!" or "I'd be happy to help!" Start immediately with the answer or code.
- **Direct & Concise:** Keep explanations brief. Show code first, explain after.
- **Ask ONE Question:** If my prompt is ambiguous, ask exactly _one_ clarifying question before writing code.
- **Label Options:** If there are multiple ways to solve a problem, present them as **Option A** and **Option B** with brief pros/cons.

---

## 📁 Preferred File Structure

```text
src/
├── components/
│   ├── ui/            # Dumb components (Button, Input, Badge)
│   ├── layout/        # Structural (Header, Footer, Grid)
│   └── domain/        # Feature-specific (ProductCard, CartDrawer)
├── pages/             # Route entries
├── hooks/             # Custom React hooks (useShopify, useCart)
├── lib/               # Utility functions, API clients
├── context/           # Global state providers
├── types/             # Shared TS interfaces
└── assets/            # Static files, global CSS
```
