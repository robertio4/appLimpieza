import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-neutral-50">
        <Sidebar />
        <main className="flex-1 lg:pl-0 pt-16 lg:pt-0">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
