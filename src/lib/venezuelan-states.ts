import type { SearchableSelectOption } from "@/components/ui/searchable-select";

/** Estados de Venezuela (capitalización estándar con tildes). */
export const VENEZUELAN_STATES = [
  "Amazonas",
  "Anzoátegui",
  "Apure",
  "Aragua",
  "Barinas",
  "Bolívar",
  "Carabobo",
  "Cojedes",
  "Delta Amacuro",
  "Dependencias Federales",
  "Distrito Capital",
  "Falcón",
  "Guárico",
  "La Guaira",
  "Lara",
  "Mérida",
  "Miranda",
  "Monagas",
  "Nueva Esparta",
  "Portuguesa",
  "Sucre",
  "Táchira",
  "Trujillo",
  "Yaracuy",
  "Zulia",
] as const;

export type VenezuelanState = (typeof VENEZUELAN_STATES)[number];

const STATE_BY_KEY = new Map<string, VenezuelanState>(
  VENEZUELAN_STATES.map((state) => [toVenezuelanStateKey(state), state]),
);

/** Alias frecuentes en documentos y datos legacy. */
const STATE_ALIASES: Record<string, VenezuelanState> = {
  VARGAS: "La Guaira",
  "DISTRITO FEDERAL": "Distrito Capital",
  CAPITAL: "Distrito Capital",
  "NUEVA ESPARTA (MARGARITA)": "Nueva Esparta",
};

export function stripStateAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

export function toVenezuelanStateKey(state: string): string {
  return stripStateAccents(state.trim()).toLocaleUpperCase("es");
}

/** Resuelve texto libre o catálogo al valor canónico del listado. */
export function resolveVenezuelanStateCatalogValue(
  state: string,
): VenezuelanState | "" {
  const key = toVenezuelanStateKey(state);
  if (!key) return "";
  const alias = STATE_ALIASES[key];
  if (alias) return alias;
  return STATE_BY_KEY.get(key) ?? "";
}

export function venezuelanStateSelectOptions(): SearchableSelectOption[] {
  return VENEZUELAN_STATES.map((state) => ({
    value: state,
    label: state,
    searchText: state,
  }));
}

