
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Banknote,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import Image from "next/image";

const sidebarItems = [
  { name: "Panel Principal", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-600", bgColor: "bg-blue-50" },
  { name: "Productos (Stock)", href: "/dashboard/products", icon: Package, color: "text-orange-600", bgColor: "bg-orange-50" },
  { name: "Ayuda de Venta", href: "/dashboard/sales-help", icon: Briefcase, color: "text-purple-600", bgColor: "bg-purple-50" },
  { name: "Precio de Lista", href: "/dashboard/prices", icon: Tags, color: "text-pink-600", bgColor: "bg-pink-50" },
  { name: "Ventas", href: "/dashboard/sales", icon: ShoppingCart, color: "text-green-600", bgColor: "bg-green-50" },
  { name: "Finanzas", href: "/dashboard/finance", icon: Banknote, color: "text-emerald-600", bgColor: "bg-emerald-50" },
  { name: "Usuarios", href: "/dashboard/users", icon: Users, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings, color: "text-slate-600", bgColor: "bg-slate-50" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transition-transform duration-300 md:static md:translate-x-0 dark:bg-gray-800",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-center gap-2 px-4 shadow-sm">
          <div className="relative w-8 h-8">
            <Image src="/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          <h1 className="text-xl font-bold text-primary">SysJust</h1>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden absolute right-2"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-gray-100 text-gray-900 shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className={cn("p-2 rounded-lg transition-colors duration-200", isActive ? "bg-white shadow-sm" : item.bgColor + "/50 group-hover:" + item.bgColor)}>
                  <Icon className={cn("h-5 w-5", item.color)} />
                </div>
                <span className={cn(isActive && "font-bold")}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4 dark:border-gray-700">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center bg-white px-4 shadow-sm md:hidden dark:bg-gray-800">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="ml-4 flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className="text-lg font-semibold">CRM Just</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
