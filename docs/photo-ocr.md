# Nahrávání tankování fotkou účtenky + tachometru

Poznámky k návrhu pro automatické plnění formuláře „Nové tankování" z fotek.
Adam uvažoval o dvou cestách: (a) PaddleOCR + pravidla + potvrzení, nebo (b) propojit appku s uživatelovou vlastní AI (Gemini / ChatGPT / Claude / Perplexity). Oba přístupy mají smysl, ale kloníme se k **hybridní fázovité strategii** — začít jednoduše, AI přidat jako volitelný „super režim".

## TL;DR doporučení

| Fáze | Co se postaví | Co to stojí | Pro koho |
| --- | --- | --- | --- |
| **1 (MVP)** | Tesseract.js v prohlížeči + regex pravidla + ruční potvrzení ve formuláři | 0 Kč, žádný backend | Každý uživatel bez setupu |
| **2 (Opt-in AI)** | Uživatel si v profilu vloží Gemini API klíč → volání `gemini-2.0-flash` s vision + JSON schema | 0 Kč na Adamově free tieru (1 500 req/den), navíc v profilu lze zvolit OpenAI/Claude/OpenRouter | Kdo chce vyšší přesnost |
| **3 (pokud poroste)** | Self-hosted PaddleOCR na Modal/Fly.io workeru, dotahuje tam, kde Tesseract selže | ~$0 na free tier, případně pár dolarů měsíčně | Pokud appka vyroste mimo osobní použití |

Důvod fázovitého přístupu: nejhorší UX je „musíš si zaregistrovat API klíč, ať můžeš nahrát fotku". Nejprve ať to funguje pro každého bez setupu — a kdo chce lepší výsledky, může si přepnout.

## Srovnání cest

### A) Tesseract.js v prohlížeči (Fáze 1)
- **Jak:** WASM port Tesseract OCR běží přímo v prohlížeči na obrázcích z `<input type="file" capture="environment">`. Parser v JS hledá regexy jako `(\d+[.,]\d{2}) *L`, `(\d+[.,]\d{2}) *Kč`, `\b(SHELL|ORLEN|MOL|OMV|…)\b` a vyplní pole formuláře. Uživatel pak před uložením zkontroluje a upraví.
- **Plusy:** Bez backendu. Offline-friendly (PWA už je offline-first). Žádný klíč, žádná registrace. Nulová provozní cena.
- **Mínusy:** Thermo účtenky po pár dnech v autě = nižší přesnost. Tesseract je pomalejší (2–5 s na mobilu pro jednu fotku). Čeština trochu trápí (zaměňuje Č/C, Ř/R), ale pro čísla a pár klíčových slov to stačí.
- **Realistická úspěšnost:** 60–75 % polí vyplněných správně u čisté účtenky, 30–50 % u zmuchlané / vybledlé. Tachometr — u digitálního displeje 80–90 %, u analogového hodně nízko.

### B) Bring-your-own-AI (Fáze 2)
- **Jak:** V `/profile` přidáme sekci „AI asistent tankování" s inputy na vložení klíče:
  - Google Gemini (doporučené — nejštědřejší free tier)
  - OpenAI (ChatGPT API)
  - Anthropic (Claude API)
  - OpenRouter (proxy pro vše, včetně free modelů)
  - Perplexity (má vision)
  Klíč se uloží v Supabase šifrovaný v `profiles.ai_api_key_encrypted` (Supabase Vault nebo KMS), nikdy se neposílá do frontendu po uložení. Při nahrání fotky edge funkce načte klíč, zavolá LLM s:
  - System prompt: „Extract fuel receipt fields as JSON: liters, price_czk, price_per_liter, station_brand, date, time."
  - User: fotka účtenky + fotka tachometru
  - `response_format: { type: "json_schema", schema: … }` pro Gemini/OpenAI, Claude řešíme přes `tool_use`.
- **Plusy:** Přesnost ~95 % i na těžkých účtenkách. LLM „rozumí" struktuře. Zero infra.
- **Mínusy:** User musí projít nastavením klíče (ale jen jednou, v profilu). Různé SDK = víc kódu k údržbě. Free tier se může změnit.

**Free tiery pro vision (stav 2026-04, orientačně):**
- **Gemini 2.0 Flash:** 1 500 req/den, 1M tokenů/den, multimodální → na pár tankování za měsíc **víc než dost**.
- **OpenRouter:** některé modely (Qwen-VL, Llama 3.2 Vision) zdarma s rate limit.
- **Groq:** zdarma, ale zatím bez vision.
- **Claude (free tier přes Anthropic):** omezené, není vhodné pro produkci.
- **ChatGPT (free tier přes OpenAI):** žádný free tier pro API.

**Z toho výběr pro MVP AI cesty: Gemini 2.0 Flash.** Má nejlepší poměr „štědrý free tier / vision kvalita / spolehlivost". Pokud nefunguje, fallback na OpenRouter Qwen-VL.

### C) PaddleOCR self-hosted (Fáze 3, až bude potřeba)
- **Jak:** Python worker (FastAPI + PaddleOCR) nasazený na Modal/Fly.io/Render free tier, volaný z edge funkce.
- **Plusy:** Nezávislost na third-party AI, lepší než Tesseract, specializovaný na účtenky.
- **Mínusy:** Infrastruktura. Studený start 3–10 s na free tieru. Údržba Python verzí, modelu, dependencies. Na free tier se vejde, ale není „zero ops".
- **Kdy má smysl:** Až Gemini/OpenRouter nestačí nebo je Adam chce úplně vyrazit ven.

## Praktický plán implementace

### Fáze 1 (~2–4 h)
1. Přidat na stránku „Nové tankování" tlačítko „📷 Naskenuj účtenku" + „📷 Naskenuj tachometr".
2. Uploader otevře fotoaparát (`capture="environment"`), po výběru:
   - Thumbnail + spinner.
   - Tesseract.js (`@tesseract.js/tesseract`) vrátí text.
   - Regex parser vyplní `liters`, `total_price`, `station_brand`, `date`.
   - Pro tachometr: parser čte největší souvislé číslo.
3. Uživatel vidí předvyplněný formulář, může opravit, pak uloží.
4. Fotky uložit do už existujícího bucketu `photos` (už to schéma podporuje přes `receipt_photo_path` a `odometer_photo_path`).

### Fáze 2 (~4–6 h)
1. Nová sekce v `/profile` → „AI asistent".
2. Supabase migrace: `profiles.ai_provider text`, `profiles.ai_api_key_encrypted bytea`, `profiles.ai_key_last4 text` (pro UI).
3. Edge funkce `ocr-parse-receipt` / `ocr-parse-odometer` v Supabase, která:
   - Načte klíč uživatele, dešifruje.
   - Volá Gemini s fotkou + promptem.
   - Vrátí JSON struktury.
4. Fallback: když AI selže nebo není nakonfigurovaná, použije se Fáze 1 (Tesseract).
5. UI: přepínač „Použít AI pro rozpoznání" v uploaderu, výchozí podle nastavení profilu.

### Fáze 3 (odložit)
Jen pokud bude potřeba. Pak:
1. Spustit PaddleOCR worker na Modal.
2. Přidat `ai_provider = 'paddle'` jako volbu.
3. Stejné rozhraní jako Fáze 2, jen jiný endpoint.

## Otázky, které ještě zůstávají otevřené

- **Šifrování API klíčů:** Supabase Vault vs. custom AES v edge funkci. Vault je jednodušší, ale vyžaduje enterprise plan; pro free tier si musíme napsat vlastní přes `pgcrypto`. Design otázka.
- **Rate limiting Gemini:** Pokud by Adam sdílel stejný klíč mezi víc uživateli (ne BYO-key, ale server-side klíč), nutný rate limiter — free tier je per-project, ne per-user.
- **Kvalita tachometr fotek:** Digitální displej vs. analogový ručičkový — analogový OCR neumí vůbec, i AI má problém. Pro analogové budky navrhnout jen ruční zadání.
- **GDPR:** Fotky účtenek mohou obsahovat lokalitu, SPZ, čas. Už jsou ve storage bucketu soukromé; dokument zmínit v ToS.

## Závěr

Jít **nejdřív fází 1** (Tesseract.js v prohlížeči) — dá to hmatatelný přínos bez jakékoliv konfigurace, fotky se už tak ukládají do bucketu a teď jen přidáme autofill. Pokud Adam zjistí, že chce přesnější parsing, zapneme **fázi 2** s Gemini jako BYO-AI — ideálně s jeho vlastním klíčem, který má v gratis kvótě spoustu prostoru pro pár tankování měsíčně.
