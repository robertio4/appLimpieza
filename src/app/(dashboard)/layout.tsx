import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { GuestBanner } from "@/components/layout/guest-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-neutral-50">
        <GuestBanner />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto lg:pl-0 pt-16 lg:pt-0">
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
