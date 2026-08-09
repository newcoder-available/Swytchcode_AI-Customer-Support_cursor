"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/customers", label: "Customers", icon: UsersIcon },
  { href: "/tickets", label: "Tickets", icon: TicketIcon },
  { href: "/knowledge", label: "Knowledge", icon: BookIcon },
  { href: "/automations", label: "Automations", icon: BoltIcon },
  { href: "/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Primary">
        <Link href="/inbox" className="sidebar-brand">
          <span className="logo-mark" aria-hidden>
            R
          </span>
          <span className="logo-text">ResolveAI</span>
        </Link>

        <nav className="sidebar-nav">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="agent-status">
            <span className="pulse-dot" aria-hidden />
            <div>
              <strong>AI Agent Online</strong>
              <span>Resolving & escalating</span>
            </div>
          </div>
          <div className="user-chip">
            <span className="avatar sm" aria-hidden>
              AS
            </span>
            <div>
              <strong>Alex Stone</strong>
              <span>Support lead</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-left">
            <p className="product-tagline">
              AI-powered customer support that understands, resolves, and
              escalates issues automatically.
            </p>
          </div>
          <div className="topbar-right">
            <label className="search-field">
              <span className="sr-only">Search</span>
              <SearchIcon />
              <input
                type="search"
                placeholder="Search tickets, customers, knowledge…"
              />
            </label>
            <button type="button" className="icon-btn" aria-label="Notifications">
              <BellIcon />
            </button>
            <button type="button" className="icon-btn" aria-label="Help">
              <HelpIcon />
            </button>
            <span className="status-pill">
              <span className="pulse-dot" aria-hidden />
              AI Agent Online
            </span>
            <span className="avatar" aria-hidden>
              AS
            </span>
          </div>
        </header>
        <div className="shell-content">{children}</div>
      </div>
    </div>
  );
}

function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 12h-6l-2 3H10l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4z" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3v18h18" />
      <path d="M7 14v4" />
      <path d="M12 10v8" />
      <path d="M17 6v12" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 1 1 4.4 2.7c-.7.4-1.5 1-1.5 2.3" />
      <path d="M12 17h.01" />
    </svg>
  );
}
