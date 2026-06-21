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
│   ├── CalorieRing.tsx      # SVG circular progress ring (consumed vs target)
│   ├── CameraCapture.tsx    # File input (camera) → base64 image data
│   ├── ExerciseSuggestions.tsx # Fetches and displays exercise suggestions
│   ├── FoodLog.tsx          # List of logged food items (exports FoodItem type)
│   └── RecipeSuggestions.tsx # Ingredient input → AI recipe cards
public/
├── manifest.json            # PWA manifest
└── icon-192.svg             # App icon
```

## Architecture

### Client-Side State

All app state is managed in `src/app/page.tsx` via `useState`. No state management library. Data persists to `localStorage` with daily auto-reset:

- `kalori-foods` — today's food items (JSON array)
- `kalori-target` — daily calorie target (number)
- `kalori-date` — current date string (triggers reset on new day)

### API Routes

All three API routes follow the same pattern:
1. Accept POST with JSON body
2. Call Claude API (`claude-sonnet-4-20250514`) with a Turkish-language prompt requesting structured JSON output
3. Extract JSON from response via regex (`/\{[\s\S]*\}/`)
4. Return parsed JSON to client

**Environment variable required**: `ANTHROPIC_API_KEY` (used by `@anthropic-ai/sdk` automatically)

### UI/UX

- Mobile-first, max-width `md` (448px), centered layout
- Two tabs: "Kalori Takip" (tracker) and "Yemek Onerisi" (recipes)
- Camera FAB button (bottom center) triggers food photo analysis
- Analysis results shown in bottom sheet modal for confirmation before adding to log
- All user-facing text is in Turkish

## Styling Conventions

- Tailwind CSS v4 with `@theme inline` block in `globals.css` for custom colors
- Custom color tokens: `primary` (#10b981 emerald), `danger` (#ef4444 red), `warning` (#f59e0b amber), `card-bg`, `border`, `background`, `foreground`
- Use semantic color classes (`text-primary`, `bg-danger`, `border-border`) not raw color values
- Rounded corners: `rounded-xl` for cards, `rounded-full` for buttons/pills
- Shadows: `shadow-sm` for cards, `shadow-lg` for FAB

## Key Conventions

- All components use `"use client"` directive (client-side rendering)
- Path alias: `@/*` maps to `./src/*`
- No test framework configured
- No database — localStorage only
- No authentication
- Images are handled as base64 data URLs (captured via file input, sent to API, stored in state)
