"use client";

import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import type { NavPage } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Plane,
  LayoutDashboard,
  Briefcase,
  Users,
  Wallet,
  BarChart3,
  Settings,
  ChevronLeft,
  Hotel,
  FileText,
  Bus,
  Car,
  Ticket,
  Ship,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Building2,
  IdCard,
  ScrollText,
  Receipt,
  Coins,
  ArrowRightLeft,
  UserCog,
  Cog,
  LogOut,
} from "lucide-react";

interface NavItem {
  page: NavPage;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  key: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  /** if true: this is a single-page group (no expansion). */
  flat?: boolean;
  pages: NavItem[];
}

const groups: NavGroup[] = [
  {
    key: "dashboard",
    labelKey: "nav_dashboard",
    icon: LayoutDashboard,
    flat: true,
    pages: [{ page: "dashboard", labelKey: "nav_dashboard", icon: LayoutDashboard }],
  },
  {
    key: "services",
    labelKey: "nav_services",
    icon: Briefcase,
    pages: [
      { page: "hajj_program", labelKey: "nav_hajj_program", icon: Plane },
      { page: "hajj_regular", labelKey: "nav_hajj_regular", icon: Plane },
      { page: "umrah_program", labelKey: "nav_umrah_program", icon: Plane },
      { page: "umrah_regular", labelKey: "nav_umrah_regular", icon: Plane },
      { page: "passport_attendance", labelKey: "nav_passport_attendance", icon: IdCard },
      { page: "passport_without", labelKey: "nav_passport_without", icon: IdCard },
      { page: "flight_ticket", labelKey: "nav_flight_ticket", icon: Ticket },
      { page: "intl_bus", labelKey: "nav_intl_bus", icon: Bus },
      { page: "intl_car", labelKey: "nav_intl_car", icon: Car },
      { page: "local_bus", labelKey: "nav_local_bus", icon: Bus },
      { page: "local_car", labelKey: "nav_local_car", icon: Car },
      { page: "visa_medical", labelKey: "nav_visa_medical", icon: HeartPulse },
      { page: "visa_tourist", labelKey: "nav_visa_tourist", icon: Plane },
      { page: "visa_work", labelKey: "nav_visa_work", icon: Briefcase },
      { page: "visa_visit", labelKey: "nav_visa_visit", icon: FileText },
      { page: "shipping", labelKey: "nav_shipping", icon: Ship },
      { page: "customs", labelKey: "nav_customs", icon: ScrollText },
      { page: "security_approval", labelKey: "nav_security_approval", icon: ShieldCheck },
      { page: "medical_report", labelKey: "nav_medical_report", icon: Stethoscope },
      { page: "travel_insurance", labelKey: "nav_travel_insurance", icon: ShieldCheck },
      { page: "hotel_booking", labelKey: "nav_hotel_booking", icon: Hotel },
    ],
  },
  {
    key: "management",
    labelKey: "nav_management",
    icon: Users,
    pages: [
      { page: "customers", labelKey: "nav_customers", icon: Users },
      { page: "employees", labelKey: "nav_employees", icon: UserCog },
      { page: "agents_companies", labelKey: "nav_agents_companies", icon: Building2 },
    ],
  },
  {
    key: "finance",
    labelKey: "nav_finance",
    icon: Wallet,
    pages: [
      { page: "revenues_expenses", labelKey: "nav_revenues_expenses", icon: Coins },
      { page: "payments", labelKey: "nav_payments", icon: ArrowRightLeft },
      { page: "invoices", labelKey: "nav_invoices", icon: Receipt },
    ],
  },
  {
    key: "monitoring",
    labelKey: "nav_monitoring",
    icon: BarChart3,
    pages: [
      { page: "statistics", labelKey: "nav_statistics", icon: BarChart3 },
      { page: "audit_log", labelKey: "nav_audit_log", icon: ScrollText },
      { page: "visa_expiry", labelKey: "nav_visa_expiry", icon: ShieldCheck },
    ],
  },
  {
    key: "settings",
    labelKey: "nav_settings",
    icon: Settings,
    pages: [
      { page: "users_permissions", labelKey: "nav_users_permissions", icon: UserCog },
      { page: "system_settings", labelKey: "nav_system_settings", icon: Cog },
    ],
  },
];

export function Sidebar() {
  const lang = useAppStore((s) => s.lang);
  const currentPage = useAppStore((s) => s.currentPage);
  const expanded = useAppStore((s) => s.expandedSections);
  const setPage = useAppStore((s) => s.setPage);
  const toggleSection = useAppStore((s) => s.toggleSection);
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const mobileSidebarOpen = useAppStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);

  // الصلاحيات: الأقسام المسموح بها لكل دور
  const isManager = currentUser?.role === "manager";
  // المحاسب: المالية + المراقبة فقط (لا الخدمات، لا الإدارات، لا الإعدادات)
  const allowedGroups = (gKey: string): boolean => {
    if (isManager) return true;
    if (currentUser?.role === "accountant") {
      // المحاسب: لوحة التحكم + المالية فقط (لا المراقبة، لا الخدمات، لا الإدارات، لا الإعدادات)
      if (gKey === "services") return false;
      if (gKey === "management") return false;
      if (gKey === "settings") return false;
      if (gKey === "monitoring") return false;
      return true; // dashboard + finance فقط
    }
    // موظف الحجوزات: الخدمات + الإدارات + لوحة التحكم فقط
    if (gKey === "monitoring") return false;
    if (gKey === "settings") return false;
    if (gKey === "finance") return false;
    return true;
  };

  // فلترة العناصر الفرعية داخل الأقسام حسب الصلاحية
  const allowedPage = (page: NavPage): boolean => {
    if (isManager) return true;
    // موظف الحجوزات لا يرى إدارة الموظفين ولا صلاحيات المستخدمين
    if (page === "employees" || page === "users_permissions") return false;
    // المحاسب لا يرى العملاء ولا الوكلاء (فقط الوحدات المالية)
    if (currentUser?.role === "accountant") {
      if (page === "customers" || page === "agents_companies") return false;
    }
    return true;
  };

  const handleLogout = async () => {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من تسجيل الخروج؟" : "Are you sure you want to logout?")) return;
    await logout();
  };

  const filteredGroups = groups.filter((g) => allowedGroups(g.key));

  return (
    <>
      {/* Overlay للجوال — يغلق القائمة عند النقر خارجها */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        dir={lang === "ar" ? "rtl" : "ltr"}
        className={cn(
          "flex flex-col w-72 bg-sidebar border-s border-sidebar-border h-screen z-50 transition-transform duration-300",
          "fixed inset-y-0 right-0 lg:sticky lg:top-0 lg:w-64 lg:translate-x-0 lg:z-30",
          mobileSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
      {/* Brand */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-sm">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-base leading-tight">
              {tr(lang, "brand_name")}
            </h2>
            <p className="text-xs text-muted-foreground">{tr(lang, "brand_sub")}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {filteredGroups.map((g) => {
          const isExpanded = g.flat || expanded[g.key] || g.pages.some((p) => p.page === currentPage);
          const isGroupActive = g.pages.some((p) => p.page === currentPage);

          if (g.flat) {
            const item = g.pages[0];
            const isActive = currentPage === item.page;
            return (
              <div key={g.key} className="space-y-1">
                <button
                  onClick={() => setPage(item.page)}
                  className={cn(
                    "nav-item relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                    isActive ? "active" : "text-foreground/80 hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="nav-icon w-5 h-5" />
                  <span>{tr(lang, item.labelKey)}</span>
                </button>
              </div>
            );
          }

          // فلترة الصفحات الفرعية حسب الصلاحية
          const filteredPages = g.pages.filter((p) => allowedPage(p.page));
          if (filteredPages.length === 0) return null;

          return (
            <div key={g.key} className="space-y-1.5">
              {/* فاصل بصري فوق كل قسم رئيسي (ما عدا الأول) */}
              <div className="border-t border-sidebar-border mx-1" />
              <button
                onClick={() => toggleSection(g.key)}
                className={cn(
                  "nav-item relative w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold",
                  isGroupActive && !isExpanded ? "active" : "text-foreground hover:bg-sidebar-accent"
                )}
              >
                <span className="flex items-center gap-3">
                  <g.icon className="nav-icon w-5 h-5" />
                  {tr(lang, g.labelKey)}
                </span>
                <ChevronLeft
                  className={cn(
                    "w-4 h-4 transition-transform text-muted-foreground",
                    isExpanded && "-rotate-90"
                  )}
                />
              </button>

              {isExpanded && (
                <div className="space-y-0.5 ms-3 border-s border-sidebar-border ps-2 pt-1">
                  {filteredPages.map((item, idx) => {
                    const isActive = currentPage === item.page;
                    return (
                      <div key={item.page}>
                        {/* فاصل دقيق بين العناصر الفرعية داخل القسم */}
                        {idx > 0 && <div className="border-t border-sidebar-border/40 mx-2 my-0.5" />}
                        <button
                          onClick={() => setPage(item.page)}
                          className={cn(
                            "nav-item relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-all",
                            isActive ? "active" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <item.icon className="nav-icon w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{tr(lang, item.labelKey)}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer — زر تسجيل الخروج + حقوق النشر */}
      <div className="border-t border-sidebar-border">
        <button
          onClick={() => {
            if (window.confirm(lang === "ar" ? "هل أنت متأكد من تسجيل الخروج؟" : "Are you sure you want to logout?")) {
              logout();
            }
          }}
          className="nav-item relative w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/5 border-t border-sidebar-border"
        >
          <LogOut className="nav-icon w-5 h-5" />
          <span>{tr(lang, "logout")}</span>
        </button>
        <div className="px-4 py-2 text-[11px] text-muted-foreground text-center leading-relaxed border-t border-sidebar-border/50">
          {tr(lang, "footer_copyright")}
        </div>
      </div>
    </aside>
    </>
  );
}
