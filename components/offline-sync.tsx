"use client";

/**
 * Auto-sync for fill-ups that were queued while offline.
 *
 * Mounted once in the authenticated app shell.
 *
 * ONLINE DETECTION: `navigator.onLine` is notoriously unreliable on macOS
 * (often stuck on `false` even on a solid wifi, and Safari's `online` event
 * rarely fires). So we don't trust it alone — instead we fire an active
 * HEAD-style fetch against `/manifest.json` every 30 s and flip the badge
 * based on whether it resolves. `navigator.onLine` is still respected as a
 * hint: if the browser says offline, we show offline immediately, but we
 * never show offline just because the browser says so — we wait for a
 * failed heartbeat to confirm.
 *
 * On a successful heartbeat we also flush the IndexedDB queue.
 */

import { useEffect, useState } from "react";
import { CloudOff, Cloud, CloudUpload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listQueued, removeQueued, type QueuedFillUp } from "@/lib/offline-queue";
import { useRouter } from "next/navigation";

const HEARTBEAT_MS = 30_000;

async function heartbeatOk(): Promise<boolean> {
  try {
    // manifest.json is static and bypassed by middleware; cheap to hit.
    const res = await fetch("/manifest.json", {
      method: "GET",
      cache: "no-store",
      // Give up quickly so we flip to offline reasonably fast.
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function OfflineSync() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  // Start optimistically online — we'd rather show nothing than a false
  // OFFLINE badge during initial hydration.
  const [online, setOnline] = useState<boolean>(true);
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
      router.refresh();
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      const ok = await heartbeatOk();
      if (cancelled) return;
      setOnline((prev) => {
        if (ok && !prev) {
          // Came back online — flush pending.
          flush();
        }
        return ok;
      });
    }

    refreshCount();
    // Initial probe.
    tick();

    const onOnline = () => {
      // Browser hint — verify with a heartbeat.
      tick();
    };
    const onOffline = () => {
      // Browser hint says we're offline. Trust it only enough to stop
      // trying to sync; verify with a heartbeat before flipping the badge.
      tick();
    };
    const onQueued = () => refreshCount();
    const onVisible = () => {
      if (!document.hidden) tick();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("fuellog:queued", onQueued as EventListener);
    document.addEventListener("visibilitychange", onVisible);

    const interval = setInterval(tick, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("fuellog:queued", onQueued as EventListener);
      document.removeEventListener("visibilitychange", onVisible);
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
