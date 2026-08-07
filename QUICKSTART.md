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
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For test-pilot auth, add Supabase email/password env vars:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

After Neon is approved/provisioned through Vercel Marketplace, pull env vars and migrate account-sync storage:

```bash
vercel env pull .env.local --yes
pnpm db:migrate
```

If Vercel pulls empty placeholders for sensitive Neon values, local account sync needs the real values added to `.env.local` from Neon. Deployed Vercel functions still receive the real integration values and create the account-sync table on the first authenticated save if needed.

### 4. Build Sprites (One-Time Setup)

Run the automated sprite builder:

```bash
./scripts/build-sprites.sh
```

This will:
- Clone OpenAIP's mapstyles repository
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
- Use the Account Sync panel after Supabase auth and Neon storage are configured
- Read [SETUP.md](./SETUP.md) for detailed documentation

## Project Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test         # Run unit tests
pnpm db:migrate   # Apply Neon account-sync migration
```

## Need Help?

See the full [SETUP.md](./SETUP.md) guide for detailed troubleshooting and explanations.
