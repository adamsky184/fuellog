"use client";

/**
 * Auto-sync for fill-ups that were queued while offline.
 *
 * Mounted once in the authenticated app shell. When the browser reports
 * `online`, or every 60 s as a safety net, it reads pending records from
 * IndexedDB and inserts them via the authenticated Supabase client. On
 * success the record is removed and a cs-locale toast is fired through a
 * simple CustomEvent so the UI can announce "N tankování synchronizováno".
 */

import { useEffect, useState } from "react";
import { CloudOff, Cloud, CloudUpload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listQueued, removeQueued, type QueuedFillUp } from "@/lib/offline-queue";
import { useRouter } from "next/navigation";

export function OfflineSync() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const router = useRouter();

  async function refreshCount() {
    try {
      const items = await listQueued();
      setPending(items.length);
    } catch {
      /* ignore */
    }
  }

  async function flush() {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    let items: QueuedFillUp[] = [];
    try {
      items = await listQueued();
    } catch {
      return;
    }
    if (!items.length) return;
    setSyncing(true);
    const supabase = createClient();
    let synced = 0;
    for (const item of items) {
      const { id: _queuedId, _queuedAt: _at, ...payload } = item;
      void _queuedId;
      void _at;
      const { error } = await supabase.from("fill_ups").insert(payload);
      if (!error) {
        await removeQueued(item.id);
        synced++;
      }
    }
    setSyncing(false);
    await refreshCount();
    if (synced > 0) {
      // Let the current page pick up the newly-synced rows.
      router.refresh();
    }
  }

  useEffect(() => {
    refreshCount();
    const onOnline = () => {
      setOnline(true);
      flush();
    };
    const onOffline = () => setOnline(false);
    const onQueued = () => refreshCount();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("fuellog:queued", onQueued as EventListener);
    const interval = setInterval(flush, 60_000);
    // Attempt a flush on mount in case we loaded fresh online.
    if (navigator.onLine) flush();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("fuellog:queued", onQueued as EventListener);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nothing to say: online and nothing queued.
  if (online && pending === 0) return null;

  return (
    <div
      className={`fixed bottom-3 left-3 z-30 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow
        ${online
          ? "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-900"
          : "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900"}`}
      role="status"
      aria-live="polite"
    >
      {!online ? (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          <span>Offline{pending ? ` · ${pending} ve frontě` : ""}</span>
        </>
      ) : syncing ? (
        <>
          <CloudUpload className="h-3.5 w-3.5 animate-pulse" />
          <span>Synchronizuji ({pending})…</span>
        </>
      ) : (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>{pending} ve frontě</span>
        </>
      )}
    </div>
  );
}
