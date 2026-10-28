export type SoftwareDistributor = {
  id: number;
  rif: string;
  businessName: string;
};

export type SoftwareResponse = {
  id: number;
  name: string;
  version: string;
  createdAt: string;
  programmingLanguages: string[];
  operatingSystems: string[];
  /** Empresa desarrolladora (Art. 46 h); null si aún no se ha registrado. */
  developerRif?: string | null;
  developerName?: string | null;
  external?: boolean;
  /** Distribuidores autorizados del software (Art. 46 h SENIAT). */
  distributors?: SoftwareDistributor[];
};

export type SoftwareRequest = {
  name: string;
  version: string;
  programmingLanguages?: string[];
  operatingSystems?: string[];
  developerName?: string | null;
  developerRif?: string | null;
  external?: boolean;
  distributorCompanyIds?: number[];
};
