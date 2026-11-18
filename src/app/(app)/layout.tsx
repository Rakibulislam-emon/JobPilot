import { AddJobProvider } from "@/components/AddJobModal";
import { Sidebar } from "@/components/Sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <AddJobProvider>
      <TooltipProvider>
        <SidebarProvider
          className="min-h-dvh md:h-dvh md:min-h-0"
          style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
        >
          <Sidebar email={user.email ?? ""} />

          <SidebarInset className="min-h-0 min-w-0 md:overflow-y-auto">
            <div className="mx-auto w-full max-w-[1600px] px-4 pt-18 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:py-8 2xl:px-10">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </AddJobProvider>
  );
}
