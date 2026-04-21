"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { mapRegionCode, formatDate, formatNumber } from "@/lib/utils";

type Row = {
  date: string;
  odometer_km: number;
  liters: number | null;
  total_price: number | null;
  station_brand: string | null;
  city: string | null;
  region: string | null;
  country: string;
  address: string | null;
  is_baseline: boolean;
  is_highway: boolean;
};

export default function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: vehicleId } = use(params);
  const router = useRouter();
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError(null);
    setRows([]);

    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { cellDates: true });
      const sheetName = wb.SheetNames.includes("SPOTŘEBA") ? "SPOTŘEBA" : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      // Read as array of arrays, starting from row 5 (index 4) per Adam's format
      const all: unknown[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: true,
        blankrows: false,
      }) as unknown[][];

      // Data begins at Excel row 5 (index 4)
      const data = all.slice(4);

      const parsed: Row[] = [];
      for (const r of data) {
        const [date, stav, , tank, total, , firma, misto, address] = r as [
          unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown
        ];
        if (!date || !stav) continue;

        const odometer = Number(stav);
        if (!Number.isFinite(odometer)) continue;

        let dateStr: string | null = null;
        if (date instanceof Date) {
          dateStr = date.toISOString().slice(0, 10);
        } else if (typeof date === "number") {
          // Excel serial date
          const d = XLSX.SSF.parse_date_code(date);
          if (d) dateStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
        } else if (typeof date === "string") {
          const d = new Date(date);
          if (!isNaN(d.getTime())) dateStr = d.toISOString().slice(0, 10);
        }
        if (!dateStr) continue;

        const liters = typeof tank === "number" && Number.isFinite(tank) ? tank : null;
        const price = typeof total === "number" && Number.isFinite(total) ? total : null;
        const rawMisto = typeof misto === "string" ? misto.trim() : "";
        const isHighway = rawMisto === "D";
        const { region, country } = isHighway
          ? { region: null as string | null, country: "CZ" }
          : mapRegionCode(rawMisto || null);

        parsed.push({
          date: dateStr,
          odometer_km: Math.round(odometer),
          liters,
          total_price: price,
          station_brand: typeof firma === "string" ? firma : null,
          city: null,
          region,
          country,
          address: typeof address === "string" ? address : null,
          is_baseline: liters === null || liters === 0,
          is_highway: isHighway,
        });
      }

      setRows(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    setError(null);
    setImporting(true);
    setImported(0);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Nejsi přihlášený.");
      setImporting(false);
      return;
    }

    // Chunk upload in batches of 50 for safety
    const payload = rows.map((r) => ({
      vehicle_id: vehicleId,
      created_by: user.id,
      date: r.date,
      odometer_km: r.odometer_km,
      liters: r.liters,
      total_price: r.total_price,
      currency: "CZK",
      station_brand: r.station_brand,
      city: r.city,
      region: r.region,
      country: r.country,
      address: r.address,
      is_baseline: r.is_baseline,
      is_full_tank: !r.is_baseline,
      is_highway: r.is_highway,
    }));

    for (let i = 0; i < payload.length; i += 50) {
      const chunk = payload.slice(i, i + 50);
      const { error } = await supabase.from("fill_ups").insert(chunk);
      if (error) {
        setError(`Chyba při importu (řádek ${i + 1}): ${error.message}`);
        setImporting(false);
        return;
      }
      setImported((x) => x + chunk.length);
    }

    setImporting(false);
    router.push(`/v/${vehicleId}/fill-ups`);
    router.refresh();
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="card p-5 space-y-3">
        <h2 className="text-lg font-semibold">Import z Google Sheets (xlsx)</h2>
        <p className="text-sm text-slate-600">
          Očekávaný formát: list <code>SPOTŘEBA</code>, sloupce <em>A (datum) B (stav) C (ujeto) D (litry) E (Kč celkem) F (Kč/l) G (firma) H (místo) I (adresa)</em>,
          data začínají řádkem 5. První řádek s datem ale bez litrů je počáteční stav tachometru — označíme ho jako baseline a do statistik ho nezapočítáváme.
        </p>
        <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="block text-sm" />
        {parsing && <p className="text-sm text-slate-500">Čtu xlsx…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {rows.length > 0 && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Náhled ({rows.length} řádků)</div>
              <div className="text-xs text-slate-500">
                {formatDate(rows.at(-1)?.date)} → {formatDate(rows[0]?.date)}
              </div>
            </div>
            <button onClick={handleImport} disabled={importing} className="btn-primary">
              {importing ? `Importuji… (${imported}/${rows.length})` : `Importovat ${rows.length} záznamů`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left px-2 py-1">Datum</th>
                  <th className="text-right px-2 py-1">Stav</th>
                  <th className="text-right px-2 py-1">L</th>
                  <th className="text-right px-2 py-1">Kč</th>
                  <th className="text-left px-2 py-1">Firma</th>
                  <th className="text-left px-2 py-1">Místo</th>
                  <th className="text-left px-2 py-1">Stát</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-2 py-1">
                      {r.date}
                      {r.is_baseline && <span className="text-orange-600 ml-1">·baseline</span>}
                      {r.is_highway && <span className="text-blue-600 ml-1">·dálnice</span>}
                    </td>
                    <td className="px-2 py-1 text-right">{formatNumber(r.odometer_km, 0)}</td>
                    <td className="px-2 py-1 text-right">{r.liters ? formatNumber(r.liters, 2) : "—"}</td>
                    <td className="px-2 py-1 text-right">{r.total_price ? formatNumber(r.total_price, 0) : "—"}</td>
                    <td className="px-2 py-1">{r.station_brand ?? "—"}</td>
                    <td className="px-2 py-1">{r.region ?? (r.is_highway ? "D" : "—")}</td>
                    <td className="px-2 py-1">{r.country}</td>
                  </tr>
                ))}
                {rows.length > 20 && (
                  <tr><td colSpan={7} className="px-2 py-2 text-center text-slate-400">… a dalších {rows.length - 20} řádků</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
