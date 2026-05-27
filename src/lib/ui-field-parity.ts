export type FieldParityMapping = {
  /**
   * Textos esperados en el formulario (modal create/edit).
   * Basta con que aparezca alguno para considerar el campo cubierto en el form.
   */
  formLabels: string[];
  /**
   * Textos esperados en la vista detalle.
   * Basta con que aparezca alguno para considerar el campo cubierto en la view.
   */
  viewLabels: string[];
  /**
   * Tokens esperados en código del formulario para validar paridad semántica.
   * Si se define, al menos uno debe existir.
   */
  formBindings?: string[];
  /**
   * Tokens esperados en código de la vista para validar paridad semántica.
   * Si se define, al menos uno debe existir.
   */
  viewBindings?: string[];
};

export type ResourceFieldParitySpec = {
  resource: string;
  formPath: string | string[];
  viewPath: string;
  fields: FieldParityMapping[];
};

/**
 * Contrato mínimo de paridad UX:
 * si un dato se captura en modal, debe poder verse luego en la pantalla de detalle.
 */
export const RESOURCE_FIELD_PARITY_SPECS: ResourceFieldParitySpec[] = [
  {
    resource: "companies",
    formPath: "src/components/companies/company-form-dialog.tsx",
    viewPath: "src/components/companies/company-view.tsx",
    fields: [
      { formLabels: ["RIF"], viewLabels: ["RIF"] },
      { formLabels: ["Razón social"], viewLabels: ["Razón social"] },
      {
        formLabels: ["Tipo de contribuyente"],
        viewLabels: ["Tipo de contribuyente"],
      },
    ],
  },
  {
    resource: "branches",
    formPath: "src/components/branches/branch-form-dialog.tsx",
    viewPath: "src/components/branches/branch-view.tsx",
    fields: [
      { formLabels: ["Empresa"], viewLabels: ["Empresa"] },
      {
        formLabels: ["Ciudad"],
        viewLabels: ["Ciudad"],
        formBindings: ["form.city"],
        viewBindings: ["branch.city"],
      },
      {
        formLabels: ["Estado"],
        viewLabels: ["Estado"],
        formBindings: ["form.state"],
        viewBindings: ["branch.state"],
      },
      {
        formLabels: ["Dirección"],
        viewLabels: ["Dirección"],
        formBindings: ["form.address"],
        viewBindings: ["branch.address"],
      },
      {
        formLabels: ["Nombre persona de contacto", "Persona de contacto"],
        viewLabels: ["Persona de contacto"],
        formBindings: ["form.contactPersonName"],
        viewBindings: ["branch.contactPersonName"],
      },
      {
        formLabels: ["Teléfono"],
        viewLabels: ["Teléfono"],
        formBindings: ["form.phone"],
        viewBindings: ["branch.phone"],
      },
      {
        formLabels: ["Email", "Correo"],
        viewLabels: ["Correo"],
        formBindings: ["form.email"],
        viewBindings: ["branch.email"],
      },
      {
        formLabels: ["Distribuidor del cliente"],
        viewLabels: ["Distribuidor del cliente"],
      },
    ],
  },
  {
    resource: "clients",
    formPath: [
      "src/components/clients/client-form-fields.tsx",
      "src/components/clients/client-create-dialog.tsx",
    ],
    viewPath: "src/components/clients/client-view.tsx",
    fields: [
      {
        formLabels: ["Razón social"],
        viewLabels: ["Razón social"],
        formBindings: ["form.businessName"],
        viewBindings: ["company?.businessName", "client?.companyBusinessName"],
      },
      {
        formLabels: ["RIF"],
        viewLabels: ["RIF"],
        formBindings: ["form.rif"],
        viewBindings: ["company?.rif", "client?.companyRif"],
      },
      {
        formLabels: ["Tipo de contribuyente"],
        viewLabels: ["Tipo de contribuyente"],
        formBindings: ["form.contributorType"],
        viewBindings: ["company.contributorType"],
      },
      {
        formLabels: ["Estado"],
        viewLabels: ["Estado"],
        formBindings: ["form.state"],
        viewBindings: ["client?.branchState", "branch?.state"],
      },
      {
        formLabels: ["Ciudad"],
        viewLabels: ["Ciudad"],
        formBindings: ["form.city"],
        viewBindings: ["client?.branchCity", "branch?.city"],
      },
      {
        formLabels: ["Dirección"],
        viewLabels: ["Dirección"],
        formBindings: ["form.address"],
        viewBindings: ["branch?.address"],
      },
      {
        formLabels: ["Persona de contacto", "Nombre persona de contacto"],
        viewLabels: ["Persona de contacto"],
        formBindings: ["form.contactPersonName"],
        viewBindings: ["branch?.contactPersonName"],
      },
      {
        formLabels: ["Teléfono"],
        viewLabels: ["Teléfono"],
        formBindings: ["form.phone"],
        viewBindings: ["client.branchPhone", "branch?.phone"],
      },
      {
        formLabels: ["Correo"],
        viewLabels: ["Correo"],
        formBindings: ["form.email"],
        viewBindings: ["client.branchEmail", "branch?.email"],
      },
    ],
  },
  {
    resource: "users",
    formPath: "src/components/users/user-form-dialog.tsx",
    viewPath: "src/components/users/user-view.tsx",
    fields: [
      {
        formLabels: ["Nombre"],
        viewLabels: ["Nombre"],
        formBindings: ["form.name"],
        viewBindings: ["displayUserName(user)"],
      },
      {
        formLabels: ["Correo"],
        viewLabels: ["Correo"],
        formBindings: ["form.email"],
        viewBindings: ["user.email"],
      },
      {
        formLabels: ["Rol"],
        viewLabels: ["Rol"],
        formBindings: ["form.role"],
        viewBindings: ["user.role"],
      },
      {
        formLabels: ["Sucursal"],
        viewLabels: ["Sucursal"],
        formBindings: ["form.branchId"],
        viewBindings: ["user.branchId"],
      },
    ],
  },
  {
    resource: "printers",
    formPath: [
      "src/components/printers/printer-form-dialog.tsx",
      "src/components/printers/printer-wizard-fields.tsx",
    ],
    viewPath: "src/components/printers/printer-view.tsx",
    fields: [
      {
        formLabels: ["Modelo fiscal"],
        viewLabels: ["Modelo"],
        formBindings: ["form.modelId"],
        viewBindings: ["printer.modelId"],
      },
      {
        formLabels: ["Serial fiscal"],
        viewLabels: ["Serial fiscal"],
        formBindings: ["form.fiscalSerial"],
        viewBindings: ["printer.fiscalSerial"],
      },
      {
        formLabels: ["Estatus"],
        viewLabels: ["Estatus"],
        formBindings: ["form.status"],
        viewBindings: ["printer.status"],
      },
      {
        formLabels: ["Tipo de dispositivo"],
        viewLabels: ["Tipo de equipo"],
        formBindings: ["form.deviceType"],
        viewBindings: ["printer.deviceType"],
      },
      {
        formLabels: ["Precio venta final"],
        viewLabels: ["Precio venta"],
        formBindings: ["form.finalSalePrice"],
        viewBindings: ["printer.finalSalePrice"],
      },
      {
        formLabels: ["Estado de pago"],
        viewLabels: ["Pagada"],
        formBindings: ["form.paid"],
        viewBindings: ["printer.paid"],
      },
      {
        formLabels: ["Distribuidor"],
        viewLabels: ["Distribuidor"],
        formBindings: ["form.distributorId"],
        viewBindings: ["printer.distributorId"],
      },
      {
        formLabels: ["Cliente"],
        viewLabels: ["Cliente"],
        formBindings: ["form.clientId"],
        viewBindings: ["printer.clientId"],
      },
      {
        formLabels: ["Software"],
        viewLabels: ["Software"],
        formBindings: ["form.softwareId"],
        viewBindings: ["printer.softwareId"],
      },
      {
        formLabels: ["Fecha de instalación"],
        viewLabels: ["Instalación"],
        formBindings: ["form.installationDate"],
        viewBindings: ["printer.installationDate"],
      },
      {
        formLabels: ["Firmware"],
        viewLabels: ["Firmware"],
        formBindings: ["form.versionFirmware"],
        viewBindings: ["printer.versionFirmware"],
      },
      {
        formLabels: ["Dirección MAC"],
        viewLabels: ["MAC"],
        formBindings: ["form.macAddress"],
        viewBindings: ["printer.macAddress"],
      },
    ],
  },
  {
    resource: "seals",
    formPath: "src/components/seals/seal-form-dialog.tsx",
    viewPath: "src/components/seals/seal-view.tsx",
    fields: [
      { formLabels: ["Serial"], viewLabels: ["Serial"] },
      { formLabels: ["Impresora"], viewLabels: ["Impresora"] },
      { formLabels: ["Color"], viewLabels: ["Color"] },
      { formLabels: ["Estatus"], viewLabels: ["Estatus"] },
      { formLabels: ["Fecha de instalación"], viewLabels: ["Instalación"] },
      { formLabels: ["Fecha de retiro"], viewLabels: ["Retiro"] },
    ],
  },
  {
    resource: "technical-services",
    formPath: "src/components/technical-services/technical-service-form-dialog.tsx",
    viewPath: "src/components/technical-services/technical-service-view.tsx",
    fields: [
      {
        formLabels: ["Impresora"],
        viewLabels: ["Impresora"],
        formBindings: ["form.printerId"],
        viewBindings: ["service.printerId"],
      },
      {
        formLabels: ["Técnico"],
        viewLabels: ["Técnico"],
        formBindings: ["form.technicianId"],
        viewBindings: ["service.technicianId"],
      },
      {
        formLabels: ["Centro de servicio"],
        viewLabels: ["Centro de servicio"],
        formBindings: ["form.serviceCenterId"],
        viewBindings: ["service.serviceCenterId"],
      },
      {
        formLabels: ["Distribuidor"],
        viewLabels: ["Distribuidor"],
        formBindings: ["form.distributorId"],
        viewBindings: ["service.distributorId"],
      },
      {
        formLabels: ["Inicio"],
        viewLabels: ["Inicio"],
        formBindings: ["form.startAt"],
        viewBindings: ["service.startAt"],
      },
      {
        formLabels: ["Fin"],
        viewLabels: ["Fin"],
        formBindings: ["form.endAt"],
        viewBindings: ["service.endAt"],
      },
      {
        formLabels: ["Fecha solicitud"],
        viewLabels: ["Solicitud"],
        formBindings: ["form.requestDate"],
        viewBindings: ["service.requestDate"],
      },
      {
        formLabels: ["Costo"],
        viewLabels: ["Costo"],
        formBindings: ["form.cost"],
        viewBindings: ["service.cost"],
      },
      {
        formLabels: ["Falla reportada"],
        viewLabels: ["Falla reportada"],
        formBindings: ["form.reportedFailure"],
        viewBindings: ["service.reportedFailure"],
      },
      {
        formLabels: ["Observaciones"],
        viewLabels: ["Notas"],
        formBindings: ["form.notes"],
        viewBindings: ["service.notes"],
      },
      {
        formLabels: ["Precinto violentado"],
        viewLabels: ["Precinto violado"],
        formBindings: ["form.sealTampered"],
        viewBindings: ["service.sealTampered"],
      },
      {
        formLabels: ["Z inicial"],
        viewLabels: ["Z inicial"],
        formBindings: ["form.initialZReport"],
        viewBindings: ["service.initialZReport"],
      },
      {
        formLabels: ["Fecha Z inicial"],
        viewLabels: ["Fecha Z inicial"],
        formBindings: ["form.initialZDate"],
        viewBindings: ["service.initialZDate"],
      },
      {
        formLabels: ["Z final"],
        viewLabels: ["Z final"],
        formBindings: ["form.finalZReport"],
        viewBindings: ["service.finalZReport"],
      },
      {
        formLabels: ["Fecha Z final"],
        viewLabels: ["Fecha Z final"],
        formBindings: ["form.finalZDate"],
        viewBindings: ["service.finalZDate"],
      },
      {
        formLabels: ["Instalado"],
        viewLabels: ["Precinto instalado"],
        formBindings: ["form.installedSealId"],
        viewBindings: ["service.installedSealId"],
      },
      {
        formLabels: ["Retirado"],
        viewLabels: ["Precinto retirado"],
        formBindings: ["form.removedSealId"],
        viewBindings: ["service.removedSealId"],
      },
      {
        formLabels: ["Fotos"],
        viewLabels: ["Fotos"],
        formBindings: ["form.photoUrls"],
        viewBindings: ["service.photoUrls"],
      },
    ],
  },
  {
    resource: "annual-inspections",
    formPath: "src/components/annual-inspections/annual-inspection-form-dialog.tsx",
    viewPath: "src/components/annual-inspections/annual-inspection-view.tsx",
    fields: [
      { formLabels: ["Impresora"], viewLabels: ["Impresora"] },
      { formLabels: ["Empleado"], viewLabels: ["Empleado"] },
      { formLabels: ["Fecha de inspección"], viewLabels: ["Fecha inspección"] },
      { formLabels: ["Precinto violentado"], viewLabels: ["Precinto violado"] },
      { formLabels: ["Observaciones"], viewLabels: ["Notas"] },
      { formLabels: ["Fotos"], viewLabels: ["Fotos"] },
    ],
  },
  {
    resource: "contracts",
    formPath: "src/components/contracts/contract-form-dialog.tsx",
    viewPath: "src/components/contracts/contract-view.tsx",
    fields: [
      {
        formLabels: ["Distribuidora", "Centro de servicio"],
        viewLabels: ["Distribuidora", "Centro de servicio"],
      },
      { formLabels: ["Inicio"], viewLabels: ["Vigencia"] },
      { formLabels: ["Fin"], viewLabels: ["Vigencia"] },
      { formLabels: ["Documentos"], viewLabels: ["Documentos"] },
    ],
  },
  {
    resource: "printer-models",
    formPath: "src/components/printer-models/printer-model-form-dialog.tsx",
    viewPath: "src/components/printer-models/printer-model-view.tsx",
    fields: [
      { formLabels: ["Marca"], viewLabels: ["Marca"] },
      { formLabels: ["Código de modelo"], viewLabels: ["Modelo"] },
      { formLabels: ["Providencia"], viewLabels: ["Providencia"] },
      { formLabels: ["Fecha de homologación"], viewLabels: ["Fecha de homologación"] },
      { formLabels: ["Precio"], viewLabels: ["Precio"] },
    ],
  },
];
