import {
  Building2,
  LayoutDashboard,
  Users,
  Settings,
  MapPin,
  Printer,
  FileDigit,
  Contact,
  FileText,
  Stamp,
  Wrench,
  ClipboardCheck,
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
        roles: ["ADMIN"],
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
    ],
  },
  {
    title: "Organización",
    items: [
      {
        title: "Empresas",
        href: "/companies",
        icon: Building2,
        roles: ["ADMIN", "DISTRIBUTOR"],
      },
      { title: "Sucursales", href: "/branches", icon: MapPin },
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
        disabled: true,
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
