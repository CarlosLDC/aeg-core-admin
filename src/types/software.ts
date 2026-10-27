export type SoftwareResponse = {
  id: number;
  name: string;
  version: string;
  createdAt: string;
  programmingLanguages: string[];
  operatingSystems: string[];
  /** Empresa desarrolladora (Art. 46 h); null si aún no se ha registrado. */
  developerCompanyId?: number | null;
  developerRif?: string | null;
  developerName?: string | null;
  external?: boolean;
};
