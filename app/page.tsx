import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/vehicles");

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-accent text-white grid place-items-center text-3xl">⛽</div>
        <h1 className="text-4xl font-bold tracking-tight">FuelLog</h1>
        <p className="text-slate-600 text-lg">
          Evidence tankování a statistiky spotřeby. Zdarma, na všech zařízeních, sdílené s kým chceš.
        </p>
        <Link href="/login" className="btn-primary">
          Začít
        </Link>
      </div>
    </main>
  );
}
