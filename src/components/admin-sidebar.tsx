"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Calendar,
  UserCog,
  History,
  Menu,
  X,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";

const navGroups = [
  {
    label: "Operasional",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/anggota", label: "Data Anggota", icon: Users },
      { href: "/admin/inventaris", label: "Inventaris", icon: Package },
      { href: "/admin/kegiatan", label: "Kegiatan", icon: Calendar },
    ],
  },
  {
    label: "Administrasi",
    items: [
      { href: "/admin/petugas", label: "Kelola Petugas", icon: UserCog },
      { href: "/admin/logs", label: "Log Aktivitas", icon: History },
    ],
  },
];

interface AdminSidebarProps {
  user: {
    nama_lengkap: string;
    email: string;
    role: string;
  };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        mobileTriggerRef.current?.focus();
        wasOpenRef.current = false;
      }
      return;
    }

    wasOpenRef.current = true;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="flex h-16 items-center justify-between border-b bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="size-5" aria-hidden="true" />
          </div>
          <span>Kesekretariatan</span>
        </div>
        <Button
          ref={mobileTriggerRef}
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls="admin-sidebar"
          aria-label={isOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
          className="size-10"
        >
          {isOpen ? (
            <X className="size-4" aria-hidden="true" />
          ) : (
            <Menu className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="admin-sidebar"
        aria-label="Navigasi Admin"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-[width,transform] duration-200 lg:static lg:translate-x-0 ${
          isCollapsed ? "lg:w-20" : "lg:w-64"
        } ${
          isOpen
            ? "translate-x-0 visible"
            : "-translate-x-full invisible lg:visible"
        }`}
      >
        {/* Brand & Desktop Toggle */}
        <div
          className={`flex h-16 items-center border-b ${
            isCollapsed
              ? "justify-between px-4 lg:justify-center lg:px-2"
              : "justify-between px-4"
          }`}
        >
          <div
            className={`flex min-w-0 items-center gap-3 ${
              isCollapsed ? "lg:hidden" : ""
            }`}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">
              <Shield className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight">
                Admin HIMA
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Kesekretariatan
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup menu navigasi"
            className="size-10 shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-expanded={!isCollapsed}
            aria-controls="admin-sidebar-nav"
            aria-label={isCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            title={isCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            className="hidden size-10 shrink-0 text-muted-foreground hover:text-foreground lg:inline-flex"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Navigation Links */}
        <nav
          id="admin-sidebar-nav"
          aria-label="Menu utama"
          className={`flex-1 space-y-5 overflow-y-auto ${
            isCollapsed ? "p-4 lg:px-2.5 lg:py-4" : "p-4"
          }`}
        >
          {navGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {groupIndex > 0 && isCollapsed && (
                <div
                  className="my-2 hidden border-t border-border lg:block"
                  aria-hidden="true"
                />
              )}
              <p
                className={`mb-1.5 px-3 text-xs font-semibold text-muted-foreground ${
                  isCollapsed ? "lg:hidden" : ""
                }`}
              >
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      aria-label={item.label}
                      title={isCollapsed ? item.label : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex min-h-[40px] items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        isCollapsed
                          ? "lg:mx-auto lg:w-10 lg:justify-center lg:px-0"
                          : ""
                      } ${
                        isActive
                          ? "bg-primary font-semibold text-primary-foreground shadow-sm ring-2 ring-primary/20"
                          : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className="size-4 shrink-0"
                        strokeWidth={isActive ? 2.25 : 2}
                        aria-hidden="true"
                      />
                      <span
                        className={
                          isCollapsed ? "truncate lg:hidden" : "truncate"
                        }
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User profile & Logout */}
        <div
          className={`border-t bg-muted/20 ${
            isCollapsed ? "p-4 lg:px-2 lg:py-3" : "p-4"
          }`}
        >
          <div className={`mb-3 ${isCollapsed ? "lg:hidden" : ""}`}>
            <p className="truncate text-sm font-medium leading-none">
              {user.nama_lengkap}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {user.email}
            </p>
            <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Administrator
            </span>
          </div>
          <LogoutButton
            variant="outline"
            size="default"
            formClassName={
              isCollapsed ? "w-full lg:flex lg:justify-center" : "w-full"
            }
            textClassName={isCollapsed ? "lg:hidden" : undefined}
            className={
              isCollapsed
                ? "w-full min-h-[40px] justify-start border-border text-destructive hover:bg-destructive/10 hover:text-destructive lg:size-10 lg:w-10 lg:justify-center lg:px-0"
                : "w-full min-h-[40px] justify-start border-border text-destructive hover:bg-destructive/10 hover:text-destructive"
            }
          />
        </div>
      </aside>
    </>
  );
}
