import {
  Building2,
  LayoutDashboard,
  Users,
  Settings,
  Printer,
  FileDigit,
  Contact,
  UserRound,
  FileText,
  Stamp,
  Wrench,
  ClipboardCheck,
  Download,
  Boxes,
  Radio,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types/user";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Si se define, solo esos roles ven el enlace */
  roles?: Role[];
  /** Visible en el menú pero sin navegación */
  disabled?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "Inicio",
    items: [{ title: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "Equipos fiscales",
    items: [
      {
        title: "Impresoras",
        href: "/printers",
        icon: Printer,
        roles: ["ADMIN", "DISTRIBUTOR", "TECHNICIAN"],
      },
      {
        title: "Modelos fiscales",
        href: "/printer-models",
        icon: FileDigit,
        roles: ["ADMIN", "TECHNICIAN"],
      },
      {
        title: "Precintos fiscales",
        href: "/seals",
        icon: Stamp,
        roles: ["ADMIN", "TECHNICIAN", "SERVICE_CENTER"],
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
        roles: ["ADMIN", "TECHNICIAN", "SERVICE_CENTER"],
      },
      {
        title: "Inspección anual",
        href: "/annual-inspections",
        icon: ClipboardCheck,
        roles: ["ADMIN", "TECHNICIAN", "SERVICE_CENTER"],
      },
      {
        title: "Inspecciones anuales",
        href: "/annual-inspections",
        icon: ClipboardCheck,
        roles: ["DISTRIBUTOR"],
        disabled: true,
      },
      {
        title: "Descargas",
        href: "/downloads",
        icon: Download,
        roles: ["DISTRIBUTOR"],
        disabled: true,
      },
      {
        title: "Tools",
        href: "/tools",
        icon: Boxes,
        roles: ["DISTRIBUTOR"],
        disabled: true,
      },
    ],
  },
  {
    title: "Organización",
    items: [
      {
        title: "Clientes",
        href: "/clients",
        icon: UserRound,
        roles: ["DISTRIBUTOR"],
      },
      {
        title: "Empresas",
        href: "/branches",
        icon: Building2,
        roles: ["ADMIN", "TECHNICIAN", "SERVICE_CENTER"],
      },
      { title: "Empleados", href: "/employees", icon: Contact },
      {
        title: "Contratos",
        href: "/contracts",
        icon: FileText,
        roles: ["ADMIN"],
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
        title: "Pruebas MQTT",
        href: "/mqtt-tests",
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

/** Orden del sidebar para distribuidores: Operaciones al final, tras Organización. */
const DISTRIBUTOR_NAV_SECTION_ORDER = [
  "Inicio",
  "Equipos fiscales",
  "Organización",
  "Operaciones",
] as const;

function orderNavSectionsForRole(
  sections: NavSection[],
  role: Role,
): NavSection[] {
  if (role !== "DISTRIBUTOR") return sections;

  const order = new Map(
    DISTRIBUTOR_NAV_SECTION_ORDER.map((title, index) => [title, index]),
  );
  return [...sections].sort((a, b) => {
    const aIndex = order.get(a.title) ?? DISTRIBUTOR_NAV_SECTION_ORDER.length;
    const bIndex = order.get(b.title) ?? DISTRIBUTOR_NAV_SECTION_ORDER.length;
    return aIndex - bIndex;
  });
}

export function navSectionsForRole(role: Role): NavSection[] {
  const sections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => itemVisibleForRole(item, role)),
    }))
    .filter((section) => section.items.length > 0);

  return orderNavSectionsForRole(sections, role);
}

/** True when pathname is exactly this item or a nested route under it. */
export function navItemMatchesPath(item: NavItem, pathname: string): boolean {
  if (item.disabled) return false;
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
