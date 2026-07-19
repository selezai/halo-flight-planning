# Halo Flight Planning - Quick Start

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)

## Quick Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Get API Keys

You need two free API keys:

**OpenAIP** (for aviation data):
- Sign up at [openaip.net](https://www.openaip.net)
- Go to Profile → API Keys → Create new key
- Enable: Vector Tiles + REST API access

**MapTiler** (for map fonts):
- Sign up at [maptiler.com](https://www.maptiler.com)
- Copy your default API key from Account → Keys

### 3. Configure Environment

Edit `.env.local` and add your keys:

```env
OPENAIP_API_KEY=your_openaip_key
NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_key
NOTAM_PROVIDER=south-africa-manual
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional account sync:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=server_only_after_migration_verification
```

### 4. Build Sprites (One-Time Setup)

Run the automated sprite builder:

```bash
./scripts/build-sprites.sh
```

This will:
- Clone OpenAIP's public map resources repository
- Build the sprite files
- Copy them to the correct location

**Alternative manual method:** See [SETUP.md](./SETUP.md) for detailed instructions.

### 5. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## What You Should See

✅ Interactive aviation map centered on South Africa  
✅ Airports, navaids, and airspaces visible  
✅ Click on features to see details in sidebar  
✅ Briefing NOTAM state points to South Africa official manual briefing  
✅ Aircraft W&B shows “Needs POH setup” until POH/AFM data is entered  
✅ No console errors about missing sprites  

## Troubleshooting

**Map loads but no aviation data?**
- Check your OpenAIP API key in `.env.local`
- Restart the dev server after changing environment variables

**"Missing sprite image" warnings?**
- Run `./scripts/build-sprites.sh` again
- Verify files exist in `public/sprites/`

**Port 3000 in use?**
```bash
pnpm dev -- -p 3001
```

## Next Steps

- Explore the map and click on airports/navaids
- Check out the [PRD](../halo-flight-planning-prd.md) for planned features
- Read [SETUP.md](./SETUP.md) for detailed documentation

## Project Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript checks
pnpm test         # Run Vitest unit tests
```

## Need Help?

See the full [SETUP.md](./SETUP.md) guide for detailed troubleshooting and explanations.
