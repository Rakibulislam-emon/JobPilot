import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col md:h-dvh md:min-h-0 md:flex-row md:overflow-hidden">
      <Sidebar email={user.email ?? ""} />

      <main className="relative flex min-h-0 min-w-0 flex-1 md:overflow-y-auto">
        <div className="mx-auto w-full max-w-[1600px] px-4 pt-18 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:py-8 2xl:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
