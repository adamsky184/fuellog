import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Offline — FuelLog",
};

/**
 * Shown by the service worker when a navigation fails while offline and
 * no cached copy of the requested page is available. Keep it minimal —
 * this page itself must be cacheable without any data dependencies.
 */
export default function OfflinePage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="card max-w-md w-full p-8 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 text-slate-500 grid place-items-center">
          <WifiOff className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold">Jsi offline</h1>
        <p className="text-sm text-slate-500">
          Vypadá to, že jsi bez připojení. Zkus to prosím znovu, až se signál vrátí.
        </p>
        <p className="text-xs text-slate-400">
          Stránky, které už máš navštívené, zůstávají dostupné z cache.
        </p>
      </div>
    </main>
  );
}
