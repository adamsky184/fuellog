import { APP_VERSION, APP_BUILD_DATE } from "@/lib/version";
import { formatDate } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="mt-10 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
      © Adamsky184 · v{APP_VERSION} · {formatDate(APP_BUILD_DATE)}
    </footer>
  );
}
