# FuelLog

Webová aplikace pro evidenci tankování, statistiky spotřeby a sdílení mezi uživateli. Stavěná na Next.js 15, Supabase (Postgres + Auth + Storage) a Tailwind CSS. Plně zdarma na free tierech.

## Start (lokálně)

```bash
cd "FUEL LOG/fuellog"
npm install
cp .env.local.example .env.local  # hodnoty jsou už správně nastavené
npm run dev
```

App poběží na <http://localhost:3000>. Přihlaš se magic linkem (přijde ti e‑mail s odkazem).

## Co je hotové v MVP

- Autentizace magic linkem přes Supabase
- Garáž (seznam aut), vytvoření auta
- Tankování: seznam s odvozenými metrikami (km od minula, L/100 km, Kč/l), přidání nového tankování
- Statistiky: celkové metriky, grafy (cena, spotřeba), rozpady podle pumpy a státu, roční souhrn
- Import z xlsx (konkrétně tvůj formát z Google Sheets)
- PWA manifest + ikony — jde nainstalovat na mobil jako samostatná aplikace

## Co chybí (další fáze)

- Sdílení aut mezi uživateli (UI pro pozvánky, správa rolí) — DB podpora je hotová
- Editace/smazání existujícího tankování (UI; práva v DB jsou nastavena)
- Upload fotek účtenek a tachometru (Storage bucket je nachystaný, stačí dopsat UI)
- OCR účtenek
- Kniha jízd
- Export do xlsx
- Service worker pro offline

## Deploy na Vercel

1. Pushni tento adresář do GitHub repozitáře (např. `fuellog`).
2. Na <https://vercel.com/new> import toho repa.
3. V Environment Variables přidej to, co je v `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. V Supabase dashboardu → Auth → URL Configuration nastav Site URL na `https://<tvoje-vercel-url>` a přidej stejnou adresu do Redirect URLs (jinak se magic link nebude fungovat v produkci).
5. Deploy. Hotovo.

## Architektura

- **Next.js 15 App Router** s React Server Components pro datové listy a dashboardy (rychlé SSR).
- **Supabase**:
  - Postgres: tabulky `profiles`, `vehicles`, `vehicle_members`, `fill_ups`.
  - View `fill_up_stats_v` počítá odvozené metriky on‑the‑fly (km od minula, Kč/l, L/100 km).
  - RLS politiky na všech tabulkách — bezpečnost je vynucena na úrovni databáze, ne jen UI.
  - Storage bucket `photos` (privátní, RLS gated) pro fotky účtenek.
- **Recharts** pro grafy v dashboardu.
- **xlsx (SheetJS)** pro parsování importovaného souboru v prohlížeči.

## Struktura složek

```
app/
  layout.tsx        — root layout, PWA metadata
  page.tsx          — landing (redirect pokud přihlášený)
  login/            — magic link login
  auth/callback/    — route pro exchange OAuth code za session
  (app)/            — protected route group
    layout.tsx      — hlavička + auth redirect
    vehicles/       — garáž, nové auto
    v/[id]/         — vehicle-scoped stránky
      layout.tsx    — nav tabs
      fill-ups/     — seznam tankování + nové
      stats/        — dashboard statistik
      import/       — importér z xlsx
components/
  header.tsx        — hlavička s odhlášením
  stats-charts.tsx  — grafy (Recharts)
lib/
  supabase/         — client, server, middleware
  types/database.ts — TypeScript typy z Postgres schématu
  utils.ts          — formátování, mapování krajů
middleware.ts       — auth gate pro chráněné routy
public/
  manifest.json     — PWA manifest
  icons/            — PWA ikony
```
