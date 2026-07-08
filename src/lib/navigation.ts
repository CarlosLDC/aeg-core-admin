import {
  Building2,
  LayoutDashboard,
  Users,
  Settings,
  Printer,
  FileDigit,
  FileText,
  Stamp,
  Wrench,
  ClipboardCheck,
  BookOpen,
  Download,
  Boxes,
  Radio,
  ArrowRightLeft,
  type LucideIcon,
} from "lucide-react";
import { FISCAL_BOOK_ENTRY_PATH } from "@/lib/safe-redirect";
import type { Role } from "@/types/user";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Si se define, solo esos roles ven el enlace */
  roles?: Role[];
  /** Visible en el menú pero sin navegación */
  disabled?: boolean;
  /** Abre el enlace en una pestaña nueva (p. ej. handoff al libro fiscal). */
  openInNewTab?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "Inicio",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        roles: ["ADMIN", "DISTRIBUTOR"],
      },
    ],
  },
  {
    title: "Equipos fiscales",
    items: [
      {
        title: "Impresoras",
        href: "/printers",
        icon: Printer,
        roles: ["ADMIN", "DISTRIBUTOR"],
      },
      {
        title: "Modelos fiscales",
        href: "/printer-models",
        icon: FileDigit,
        roles: ["ADMIN"],
      },
      {
        title: "Precintos fiscales",
        href: "/seals",
        icon: Stamp,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    title: "Organización",
    items: [
      {
        title: "Empresas",
        href: "/branches",
        icon: Building2,
        roles: ["ADMIN", "DISTRIBUTOR"],
      },
      {
        title: "Contratos",
        href: "/contracts",
        icon: FileText,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    title: "Operaciones",
    items: [
      {
        title: "Servicio técnico",
        href: "/technical-services",
        icon: Wrench,
        roles: ["ADMIN"],
      },
      {
        title: "Inspección anual",
        href: "/annual-inspections",
        icon: ClipboardCheck,
        roles: ["ADMIN"],
      },
      {
        title: "Libro fiscal",
        href: FISCAL_BOOK_ENTRY_PATH,
        icon: BookOpen,
        roles: ["ADMIN", "DISTRIBUTOR"],
        openInNewTab: true,
      },
      {
        title: "Tools",
        href: "/tools",
        icon: Boxes,
      },
      {
        title: "Descargas",
        href: "/downloads",
        icon: Download,
        roles: ["DISTRIBUTOR"],
        disabled: true,
      },
    ],
  },
  {
    title: "Administración",
    items: [
      { title: "Usuarios", href: "/users", icon: Users, roles: ["ADMIN"] },
      {
        title: "Revisiones",
        href: "/reviews",
        icon: ClipboardCheck,
        roles: ["ADMIN"],
      },
      {
        title: "Transferir cliente",
        href: "/client-transfers",
        icon: ArrowRightLeft,
        roles: ["ADMIN"],
      },
      {
        title: "Herramientas Remoto",
        href: "/remoto",
        icon: Radio,
        roles: ["ADMIN"],
      },
      {
        title: "Configuración",
        href: "/settings",
        icon: Settings,
        roles: ["ADMIN"],
      },
    ],
  },
];

/** Lista plana (p. ej. tests o breadcrumbs). */
export const mainNav: NavItem[] = navSections.flatMap((s) => s.items);

function itemVisibleForRole(item: NavItem, role: Role): boolean {
  if (!item.roles) return true;
  return item.roles.includes(role);
}

export function navItemsForRole(role: Role): NavItem[] {
  return mainNav.filter((item) => itemVisibleForRole(item, role));
}

export function navSectionsForRole(role: Role): NavSection[] {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => itemVisibleForRole(item, role)),
    }))
    .filter((section) => section.items.length > 0);
}

/** True when pathname is exactly this item or a nested route under it. */
export function navItemMatchesPath(item: NavItem, pathname: string): boolean {
  if (item.disabled) return false;
  if (item.href.startsWith("http://") || item.href.startsWith("https://")) {
    return false;
  }
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Longest matching href wins (e.g. nested routes under /settings). */
export function activeNavHref(
  pathname: string,
  items: NavItem[],
): string | null {
  const match = items
    .filter((item) => navItemMatchesPath(item, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href ?? null;
}

export function isNavItemActive(
  item: NavItem,
  pathname: string,
  items: NavItem[],
): boolean {
  return activeNavHref(pathname, items) === item.href;
}
