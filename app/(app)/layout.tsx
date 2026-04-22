import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { OfflineSync } from "@/components/offline-sync";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <>
      <Header userEmail={data.user.email ?? null} />
      <main className="max-w-5xl mx-auto p-4 sm:p-6">{children}</main>
      <OfflineSync />
    </>
  );
}
