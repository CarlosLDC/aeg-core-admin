import type { SearchableSelectOption } from "@/components/ui/searchable-select";

/** Estados de Venezuela (mayúsculas, sin tildes). */
export const VENEZUELAN_STATES = [
  "AMAZONAS",
  "ANZOATEGUI",
  "APURE",
  "ARAGUA",
  "BARINAS",
  "BOLIVAR",
  "CARABOBO",
  "COJEDES",
  "DELTA AMACURO",
  "DEPENDENCIAS FEDERALES",
  "DISTRITO CAPITAL",
  "FALCON",
  "GUARICO",
  "LA GUAIRA",
  "LARA",
  "MERIDA",
  "MIRANDA",
  "MONAGAS",
  "NUEVA ESPARTA",
  "PORTUGUESA",
  "SUCRE",
  "TACHIRA",
  "TRUJILLO",
  "YARACUY",
  "ZULIA",
] as const;

export type VenezuelanState = (typeof VENEZUELAN_STATES)[number];

const STATE_BY_KEY = new Map<string, VenezuelanState>(
  VENEZUELAN_STATES.map((state) => [toVenezuelanStateKey(state), state]),
);

/** Alias frecuentes en documentos y datos legacy. */
const STATE_ALIASES: Record<string, VenezuelanState> = {
  VARGAS: "LA GUAIRA",
  "DISTRITO FEDERAL": "DISTRITO CAPITAL",
  CAPITAL: "DISTRITO CAPITAL",
  "NUEVA ESPARTA (MARGARITA)": "NUEVA ESPARTA",
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
