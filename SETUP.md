# Halo Flight Planning - Setup Guide

This guide will walk you through setting up the Halo flight planning application from scratch.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js 18+** installed ([download here](https://nodejs.org/))
2. **pnpm** installed (or npm/yarn)
   ```bash
   npm install -g pnpm
   ```

## Step 1: Install Dependencies

```bash
cd halo-scaffold
pnpm install
```

## Step 2: Get API Keys

### OpenAIP API Key (Required)

1. Go to [openaip.net](https://www.openaip.net)
2. Create a free account
3. Navigate to your profile → API Keys
4. Create a new API key with access to:
   - Vector Tiles
   - REST API (airports, navaids, airspaces)
5. Copy your API key

### MapTiler API Key (Required)

1. Go to [maptiler.com](https://www.maptiler.com)
2. Sign up for a free account
3. Go to Account → Keys
4. Copy your default API key (free tier is sufficient)

### Supabase Auth (Optional for account sync)

1. Create or select a Supabase project.
2. Enable email magic links.
3. Configure Google OAuth in Supabase and Google Cloud if Google sign-in is needed.
4. Add the production and local callback URL to Supabase redirect allow-list:
   - `http://localhost:3000/auth/callback`
   - `https://halo-flight-planning.vercel.app/auth/callback`
5. Apply `supabase/migrations/20260719163343_launch_readiness_account_sync.sql` only after inspecting the live schema/RLS target.
6. Configure `SUPABASE_SERVICE_ROLE_KEY` server-side only after the migration is applied and verified. This lets `/api/account/snapshot` own validated writes while browser clients have no direct table DML grants.

Account sync stays disabled if the public Supabase environment variables are absent. Never expose a service-role key to the browser.

### NOTAM Provider

Halo launches in South Africa with manual official briefing mode:

- ATNS File2Fly: https://file2fly.atns.co.za/aes/login.jsp
- SACAA NOTAM summaries: https://www.caa.co.za/industry-information/aeronautical-information-notam-summaries/

Do not scrape or fake live SACAA/ATNS NOTAM data. FAA NOTAM API credentials are only needed later when `NOTAM_PROVIDER=faa` is selected for international rollout.

## Step 3: Configure Environment Variables

Open `.env.local` and add your API keys:

```env
# OpenAIP API
OPENAIP_API_KEY=your_actual_openaip_key_here

# MapTiler (for glyphs/fonts)
NEXT_PUBLIC_MAPTILER_KEY=your_actual_maptiler_key_here

# Supabase account sync (public browser keys only)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# NOTAM launch provider
NOTAM_PROVIDER=south-africa-manual

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**⚠️ Important:** Replace `your_actual_*_key_here` with your real API keys!

## Step 4: Build OpenAIP Sprites

The repository includes generated OpenAIP sprite files. Regenerate them after OpenAIP map-resource changes or before validating visual parity:

```bash
pnpm build:sprites
```

The script clones OpenAIP's public map resources into temporary storage, downloads the `spreet` sprite generator, writes the four MapLibre sprite files into `public/sprites/`, and fails if any output is empty.

### 4.1 Verify Sprites

Check that the files exist:

```bash
ls -lh /Users/selezmassozi/CascadeProjects/halo/halo-scaffold/public/sprites/
```

You should see:
- `openaip.json`
- `openaip.png`
- `openaip@2x.json`
- `openaip@2x.png`

Current generated sprites contain 128 OpenAIP icon/pattern entries.

License note: OpenAIP's current public map resources are CC BY-NC-SA 4.0. See `public/sprites/ATTRIBUTION.md` and obtain permission or replace the assets before commercial use.

## Step 5: Run Development Server

```bash
cd /Users/selezmassozi/CascadeProjects/halo/halo-scaffold
pnpm dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

## Step 6: Verify Everything Works

1. **Map loads**: You should see an interactive map centered on South Africa
2. **Aviation data visible**: Airports, navaids, and airspaces should be visible
3. **No sprite warnings**: Check browser console - there should be no "missing sprite image" warnings
4. **Click functionality**: Click on an airport/navaid - sidebar should show details
5. **NOTAM state**: Build a route and open Briefing. Halo should show South Africa official manual NOTAM briefing required, preserve route locations, and link the official source.
6. **W&B state**: Open Aircraft. Presets should show W&B as “Needs POH setup” until real POH/AFM data is entered.
7. **Account state**: If Supabase env vars are absent, the account panel should say sync is disabled. If configured, magic link and Google sign-in should be available.

## Troubleshooting

### "Missing sprite image" warnings

**Problem:** Sprites not built or not in the right location.

**Solution:** Follow Step 4 again carefully. Make sure files are in `public/sprites/` with exact names.

### Map shows but no aviation data

**Problem:** OpenAIP API key is incorrect or doesn't have tile access.

**Solution:** 
- Verify your API key in `.env.local`
- Check that your OpenAIP API key has "Vector Tiles" access enabled
- Restart the dev server after changing `.env.local`

### CORS errors

**Problem:** Browser blocking requests.

**Solution:** Make sure you're accessing via `localhost:3000`, not `127.0.0.1:3000`

### Style conversion errors

**Problem:** OpenAIP style has changed.

**Solution:** Check browser console for specific layer issues. May need to update `lib/openaip/styleConverter.ts`

### Port 3000 already in use

**Problem:** Another process is using port 3000.

**Solution:** 
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or run on a different port
pnpm dev -- -p 3001
```

## Development Tips

### Hot Reload

The app uses Next.js hot reload. Changes to code will automatically refresh the browser.

### Browser DevTools

Open browser console (F12) to see:
- Map loading progress
- Feature click events
- API request logs
- Any errors

### State Persistence

Map viewport and layer visibility are saved to localStorage. Clear it if needed:

```javascript
// In browser console
localStorage.clear()
```

## Next Steps

Once the app is running:

1. **Explore the map**: Pan, zoom, click on features
2. **Test different locations**: Try airports like KJFK, EGLL, LFPG
3. **Check the sidebar**: Click airports, navaids, airspaces
4. **Review the code**: Understand how the proxy layer works

## Project Structure

```
halo-scaffold/
├── app/
│   ├── (dashboard)/          # Main dashboard pages
│   │   ├── layout.tsx        # Dashboard layout
│   │   └── page.tsx          # Map view
│   ├── api/openaip/          # Proxy API routes
│   │   ├── style/            # Style transformation
│   │   ├── tiles/            # Tile proxy
│   │   ├── sprites/          # Sprite serving
│   │   ├── airports/         # Airport REST API
│   │   ├── navaids/          # Navaid REST API
│   │   └── airspaces/        # Airspace REST API
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── map/Map.tsx           # MapLibre map component
│   └── sidebar/Sidebar.tsx   # Feature display sidebar
├── lib/openaip/
│   ├── styleConverter.ts     # Mapbox → MapLibre conversion
│   └── featureParser.ts      # Vector tile parsing
├── stores/
│   └── mapStore.ts           # Zustand state management
├── types/
│   └── openaip.ts            # TypeScript types
└── public/sprites/           # Built sprite files
```

## Additional Resources

- [OpenAIP Documentation](https://www.openaip.net/docs)
- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js-docs/)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Zustand Docs](https://docs.pmnd.rs/zustand/)

## Getting Help

If you encounter issues:

1. Check the browser console for errors
2. Verify all environment variables are set correctly
3. Ensure sprites are built and in the correct location
4. Check that API keys have the correct permissions

## License

MIT
