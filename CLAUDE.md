@AGENTS.md

# KaloriTakip - AI-Powered Calorie Tracking PWA

## Project Overview

Turkish-language calorie tracking progressive web app. Users photograph food, Claude Vision analyzes it for nutritional info, and the app tracks daily intake against a configurable calorie target. Also provides AI-generated exercise suggestions (when over target) and recipe recommendations based on available ingredients.

## Tech Stack

- **Framework**: Next.js 16.2.9 (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: React 19, Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`) — used server-side only
- **PWA**: `next-pwa`, manifest at `public/manifest.json`
- **Font**: Geist Sans (via `next/font/google`)

## Commands

- `npm run dev` — start dev server on port 3000
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — run ESLint (flat config, `eslint.config.mjs`)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout (lang="tr", PWA metadata, Geist font)
│   ├── page.tsx            # Main page ("use client") — all app state lives here
│   ├── globals.css         # Tailwind v4 import + CSS custom properties + theme
│   ├── favicon.ico
│   └── api/
│       ├── analyze/route.ts         # POST: food photo → nutritional JSON (Claude Vision)
│       ├── suggest-exercise/route.ts # POST: excess calories → exercise suggestions
│       └── suggest-recipes/route.ts  # POST: ingredients → recipe suggestions
├── components/
│   ├── BottomNav.tsx        # Bottom tab bar (Home/Goal/+/Workout/Profile) + center add FAB
│   ├── SummaryCard.tsx      # Home "Özet" card: consumed total, target gauge ring, macro bars
│   ├── StorySection.tsx     # Home "Hikaye" curated recipe story cards
│   ├── GoalView.tsx         # Goal tab: edit calorie + macro targets (exports macrosFromCalories)
│   ├── WorkoutView.tsx      # Workout tab: AI exercise suggestions for a burn goal
│   ├── ProfileView.tsx      # Profile tab: stats + links to History/Recipes + reset
│   ├── DailyTimeline.tsx    # Home: today's meals grouped into a timeline
│   ├── HistoryView.tsx      # Past-day records (used inside ProfileView)
│   ├── FoodLog.tsx          # Exports the shared FoodItem type
│   └── RecipeSuggestions.tsx # Ingredient input → AI recipe cards (used inside ProfileView)
public/
├── manifest.json            # PWA manifest
└── icon-192.svg             # App icon
```

## Architecture

### Client-Side State

All app state is managed in `src/app/page.tsx` via `useState`. No state management library. Data persists to `localStorage` with daily auto-reset:

- `kalori-foods` — today's food items (JSON array)
- `kalori-target` — daily calorie target (number)
- `kalori-macros` — daily macro targets `{ protein, carbs, fat }` in grams (JSON)
- `kalori-date` — current date string (triggers reset on new day)
- `kalori-register-date` — first-launch date, drives the 7-day free-access countdown

Captured meal photos are persisted on-device in **IndexedDB** (`src/lib/photoStore.ts`,
DB `kalori-photos`, keyed by food-item id). This lets photos survive reloads and appear in
history even when Blob hosting is not configured (the DB stores only nutritional data, and
base64 images are stripped before sync). `HistoryView` and the home loader re-attach these
photos to any food whose `imageUrl` is missing.

Photos have a **7-day retention window** (`PHOTO_RETENTION_DAYS`). On app load the home page
calls `prunePhotos()` to drop on-device photos older than 7 days, and once per day it POSTs
to `/api/cleanup`, which nulls `image_url` and deletes the Blob files for food items in logs
older than the cutoff (nutritional history itself is kept). `kalori-cleanup-date` guards the
once-per-day server call.

### API Routes

All three API routes follow the same pattern:
1. Accept POST with JSON body
2. Call Claude API (`claude-sonnet-4-6`) with a Turkish-language prompt requesting structured JSON output
3. Extract JSON from response via regex (`/\{[\s\S]*\}/`)
4. Return parsed JSON to client

**Environment variable required**: `ANTHROPIC_API_KEY` (used by `@anthropic-ai/sdk` automatically)

### UI/UX

- Mobile-first, max-width `md` (448px), centered layout
- Persistent bottom navigation with four views — "Ana Sayfa" (home), "Hedef" (goal),
  "Egzersiz" (workout), "Profil" (profile) — plus a center "+" FAB that opens the add-food sheet
- Center "+" opens a bottom-sheet with Camera / Galeri options → food photo analysis
- Analysis results shown in bottom sheet modal for confirmation before adding to log
- All user-facing text is in Turkish

## Styling Conventions

- Tailwind CSS v4 with `@theme inline` block in `globals.css` for custom colors
- Custom color tokens: `primary` (emerald), `accent`/`accent-dark`/`accent-strong` (lime — the
  redesigned home & bottom-nav accent), `surface` (light-gray card), `danger`, `warning`,
  `card-bg`, `border`, `background`, `foreground`
- Use semantic color classes (`text-accent-strong`, `bg-accent`, `bg-surface`, `border-border`) not raw color values
- Rounded corners: `rounded-2xl`/`rounded-3xl` for cards, `rounded-full`/`rounded-xl` for buttons/pills
- Shadows: subtle borders preferred; `shadow-[...]` for the bottom nav and FAB

## Key Conventions

- All components use `"use client"` directive (client-side rendering)
- Path alias: `@/*` maps to `./src/*`
- No test framework configured
- No database — localStorage only
- No authentication
- Images are handled as base64 data URLs (captured via file input, sent to API, stored in state)
