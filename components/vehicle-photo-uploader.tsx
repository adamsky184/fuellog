/**
 * v2.9.0 — VehiclePhotoUploader
 *
 * Drop-in widget for the vehicle-settings page that uploads a single
 * thumbnail photo to the existing `photos` storage bucket (path
 * `{vehicle_id}/vehicle.jpg`) and persists `vehicles.photo_path`.
 *
 * The bucket already has RLS that lets vehicle writers upload — so
 * this component only needs to call Supabase storage + update one
 * column.
 */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PHOTO_NAME = "vehicle.jpg";

export function VehiclePhotoUploader({
  vehicleId,
  initialPath,
  onChange,
}: {
  vehicleId: string;
  initialPath: string | null;
  onChange?: (newPath: string | null) => void;
}) {
  const [path, setPath] = useState<string | null>(initialPath);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whenever path changes, refresh the signed URL so the preview shows
  // up. Photos bucket is private, so we need a signed URL.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!path) {
        setSignedUrl(null);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60);
      if (!cancelled) setSignedUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const newPath = `${vehicleId}/${PHOTO_NAME}`;
    const { error: upErr } = await supabase.storage
      .from("photos")
      .upload(newPath, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      return;
    }
    const { error: dbErr } = await supabase
      .from("vehicles")
      .update({ photo_path: newPath })
      .eq("id", vehicleId);
    if (dbErr) {
      setError(dbErr.message);
      setBusy(false);
      return;
    }
    setPath(newPath);
    onChange?.(newPath);
    setBusy(false);
  }

  async function handleRemove() {
    if (!path) return;
    if (!window.confirm("Smazat fotku vozidla?")) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    await supabase.storage.from("photos").remove([path]);
    const { error: dbErr } = await supabase
      .from("vehicles")
      .update({ photo_path: null })
      .eq("id", vehicleId);
    if (dbErr) setError(dbErr.message);
    setPath(null);
    onChange?.(null);
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <label className="label">Fotka / logo vozidla</label>
      <div className="flex items-center gap-3">
        {/* Preview circle */}
        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 grid place-items-center shrink-0">
          {signedUrl ? (
            <Image
              src={signedUrl}
              alt=""
              width={80}
              height={80}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <Camera className="w-7 h-7 text-slate-400" />
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-black/40">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-1.5">
          <label className="btn-secondary inline-flex items-center justify-center gap-1.5 cursor-pointer text-sm">
            <Upload className="h-4 w-4" />
            {path ? "Změnit" : "Nahrát"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {path && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="text-sm inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-4 w-4" />
              Smazat
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-slate-400">
        Tipy: čtvercový obrázek vychází nejlépe (logo nebo zorientovaná fotka). Formáty JPG/PNG/WebP.
      </p>
    </div>
  );
}
