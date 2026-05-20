"use client";
/**
 * AppShell — estructura común a todos los perfiles autenticados.
 * Sidebar colapsable en móvil, skip link de accesibilidad, modo discreto.
 */
import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@safework/ui-kit";
import { DiscreetModeToggle } from "./DiscreetModeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface AppShellProps {
  nav: NavItem[];
  children: React.ReactNode;
  perfil: string;
}

export function AppShell({ nav, children, perfil }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Skip link — accesibilidad WCAG 2.1 AA */}
      <a
        href="#main-content"
        className={cn(
          "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50",
          "focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        )}
      >
        Ir al contenido principal
      </a>

      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <aside
          aria-label="Navegación principal"
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card",
            "transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b px-4">
            <span className="text-lg font-bold text-brand-700">SafeWork AI</span>
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setSidebarOpen(false)}
              className="ml-auto rounded-md p-1 lg:hidden focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X size={20} aria-hidden />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul role="list" className="space-y-1">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={cn(
                      "flex min-h-tap items-center gap-3 rounded-lg px-3 text-sm font-medium",
                      "text-muted-foreground transition-colors",
                      "hover:bg-brand-50 hover:text-brand-700",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                      "dark:hover:bg-brand-950 dark:hover:text-brand-300"
                    )}
                  >
                    <span aria-hidden="true" className="shrink-0">{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer del sidebar */}
          <div className="border-t p-4 space-y-2">
            <DiscreetModeToggle />
            <p className="text-xs text-muted-foreground capitalize">{perfil.replace("_", " ")}</p>
          </div>
        </aside>

        {/* Overlay móvil */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Contenido principal */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar móvil */}
          <header className="flex h-16 items-center border-b bg-card px-4 lg:hidden">
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Menu size={22} aria-hidden />
            </button>
            <span className="ml-3 font-semibold text-brand-700">SafeWork AI</span>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
