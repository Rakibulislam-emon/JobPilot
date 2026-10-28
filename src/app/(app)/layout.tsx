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
    <div className="md:flex md:h-screen md:overflow-hidden">
      <Sidebar email={user.email ?? ""} />
      <main className="flex-1 md:h-screen md:overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-9">
          {children}
        </div>
      </main>
    </div>
  );
}
