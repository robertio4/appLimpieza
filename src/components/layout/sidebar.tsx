"use client";

import { usePathname } from "next/navigation";
import { ViewTransitionLink } from "@/components/ui/view-transition-link";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  FileText,
  Receipt,
  Calendar,
  Menu,
  X,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/layout/user-nav";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Presupuestos", href: "/presupuestos", icon: FileCheck },
  { name: "Facturas", href: "/facturas", icon: FileText },
  { name: "Gastos", href: "/gastos", icon: Receipt },
  { name: "Calendario", href: "/calendario", icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-white border-r border-neutral-200 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-neutral-200 px-4">
            <h1 className="text-xl font-bold text-neutral-900">App Limpieza</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <ViewTransitionLink
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </ViewTransitionLink>
              );
            })}
          </nav>

          {/* Nueva Factura Button */}
          <div className="p-4">
            <ViewTransitionLink
              href="/facturas/nueva"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </ViewTransitionLink>
          </div>

          {/* Footer with User Nav */}
          <div className="border-t border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500">Gestión de Limpieza</p>
              <UserNav />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
