import { fetchBranchById } from "@/lib/branches-api";
import { fetchClientById } from "@/lib/clients-api";
import { fetchCompanyById } from "@/lib/companies-api";
import {
  buildEnajenacionCommandContextFromClientData,
  type EnajenacionCommandContext,
} from "@/lib/enajenacion-mqtt-protocol";
import type { PrinterResponse } from "@/types/printer";

export async function loadEnajenacionCommandContext(
  printer: Pick<PrinterResponse, "clientId" | "fiscalSerial">,
): Promise<EnajenacionCommandContext> {
  const clientId = printer.clientId;
  const fiscalSerial = printer.fiscalSerial?.trim();
  if (!clientId || !fiscalSerial) {
    throw new Error("Impresora sin cliente o serial fiscal.");
  }

  const client = await fetchClientById(clientId);
  const branch = await fetchBranchById(client.branchId);
  const company = await fetchCompanyById(branch.companyId);

  return buildEnajenacionCommandContextFromClientData({
    fiscalSerial,
    rif: company.rif,
    businessName: company.businessName,
    contributorType: company.contributorType,
    address: branch.address,
    city: branch.city,
    state: branch.state,
  });
}
