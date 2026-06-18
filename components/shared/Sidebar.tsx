"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { LayoutDashboard, GitBranch, PenSquare, Settings, Zap } from "lucide-react"

const sidebarLinks = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Branches",
    href: "/branches",
    icon: GitBranch,
  },
  {
    name: "Composer",
    href: "/composer",
    icon: PenSquare,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  // If isMobile is true, collapse sidebar to icon-only.
  // During initial client hydration, isMobile might be undefined,
  // we default to false (expanded) to avoid shift or handle it cleanly.
  const collapsed = isMobile === true

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out shrink-0 h-screen sticky top-0",
        collapsed ? "w-16" : "w-[220px]"
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex items-center h-[52px] border-b border-border px-4 shrink-0",
          collapsed ? "justify-center" : "gap-2.5"
        )}
      >
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-[11px] tracking-tighter shrink-0 select-none shadow-sm">
          SC
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0 leading-none">
            <span className="font-semibold text-[13px] tracking-tight text-foreground">
              Social Copilot
            </span>
            <span className="text-[10px] text-muted-foreground/80 mt-0.5 font-normal">
              IRC USA
            </span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
        {sidebarLinks.map((link) => {
          const Icon = link.icon
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href))

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group flex items-center rounded-md py-2 px-2.5 text-[13px] transition-all duration-150 relative",
                collapsed ? "justify-center" : "gap-3.5",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground/95 hover:bg-black/4 hover:text-foreground dark:hover:bg-white/4"
              )}
              title={collapsed ? link.name : undefined}
            >
              {/* Left active indicator bar */}
              {!collapsed && (
                <div
                  className={cn(
                    "w-0.5 h-3.5 rounded-full transition-all duration-150 shrink-0 -ml-1",
                    isActive ? "bg-ring" : "bg-transparent"
                  )}
                />
              )}
              
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                  isActive
                    ? "text-accent-foreground"
                    : "text-muted-foreground/70 group-hover:text-foreground"
                )}
              />
              {!collapsed && <span className="truncate">{link.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className={cn("p-4 border-t border-border shrink-0 text-[10px] text-muted-foreground/60 text-center", collapsed && "hidden")}>
        © 2026 Co-Pilot
      </div>
    </aside>
  )
}
