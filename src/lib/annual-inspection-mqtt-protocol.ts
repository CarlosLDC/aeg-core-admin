/** Referencia del ritual Remoto de inspección anual obligatoria (libro fiscal + pruebas admin). */

export type AnnualInspectionStateVariable = {
  name: string;
  obtainedIn: string;
  usedIn: string;
};

export type AnnualInspectionFlowStep = {
  id: string;
  step: string;
  name: string;
  direction: "Servidor → impresora";
  topic: "Comando";
  responseTopic: "Respuesta";
  purpose: string;
  successCriteria: string[];
  /** Qué debe hacer el técnico en aeg-core-fiscalbooks. */
  libroFiscalAction: string;
  /** Qué hace esta pestaña del panel admin (misma API, sin guardar en BD). */
  adminPanelAction: string;
};

export const ANNUAL_INSPECTION_GLOBAL_INTRO =
  "La inspección anual obligatoria registra en la impresora fiscal el estado del precinto, etiqueta, factura, nota de crédito y sensor de papel. AEG Core publica comandos en Comando y espera respuestas en Respuesta (mismo patrón que la enajenación, pasos 2–7).";

export const ANNUAL_INSPECTION_LIBRO_FISCAL_INTRO =
  "En producción el ritual se ejecuta desde el libro fiscal (aeg-core-fiscalbooks), en la ruta «Nueva inspección anual» de cada equipo. El formulario del libro no se puede guardar hasta que SetDateRevO responda con code = 0 en la impresora.";

export const ANNUAL_INSPECTION_ADMIN_PANEL_INTRO =
  "Esta pestaña del panel admin usa los mismos endpoints Remoto que el libro fiscal. Sirve para diagnosticar la impresora sin crear un registro en inspecciones_anuales. Tras SetDateRevO exitoso aquí solo se muestra confirmación; la persistencia ocurre en el libro fiscal.";

export const ANNUAL_INSPECTION_GLOBAL_RULES = [
  "El orden de los comandos en cada arreglo (factura y nota de crédito) es obligatorio: la impresora los ejecuta secuencialmente.",
  "Si cualquier respuesta llega con code distinto de 0, el flujo se detiene y se muestra error; no se avanza al paso siguiente.",
  "«Enviar Nota de Crédito de Prueba» requiere registroImpresora (paso 1) y numeroFacturaPrueba (paso 3); el botón permanece deshabilitado hasta tener ambos.",
  "«Enviar Inspección Anual Obligatoria» (SetDateRevO) solo depende del estado actual de los cinco checkboxes; no exige haber impreso factura ni NC de prueba.",
  "Los checkboxes pueden marcarse manualmente o quedar marcados automáticamente tras una prueba exitosa (factura → chkFactura; NC → chkNotaCredito).",
  "Solo impresoras enajenadas con cliente, serial fiscal y MAC configurados pueden iniciar el flujo.",
] as const;

export const ANNUAL_INSPECTION_STATE_VARIABLES: AnnualInspectionStateVariable[] = [
  {
    name: "registroImpresora",
    obtainedIn: "Paso 1 — campo dataS de StaInf",
    usedIn: "Paso 4 — campo data de conSerNC",
  },
  {
    name: "numeroFacturaPrueba",
    obtainedIn: "Paso 3 — campo dataD de endFac",
    usedIn: "Paso 4 — campo data de nroFacNC",
  },
  {
    name: "chkPrecinto",
    obtainedIn: "Checklist del modal",
    usedIn: "Paso 5 — campo precinto de inspAO",
  },
  {
    name: "chkEtiquetaFiscal",
    obtainedIn: "Checklist del modal",
    usedIn: "Paso 5 — campo etiqFisc de inspAO",
  },
  {
    name: "chkFactura",
    obtainedIn: "Checklist del modal",
    usedIn: "Paso 5 — campo impFact de inspAO",
  },
  {
    name: "chkNotaCredito",
    obtainedIn: "Checklist del modal",
    usedIn: "Paso 5 — campo impNC de inspAO",
  },
  {
    name: "chkSensorPapel",
    obtainedIn: "Checklist del modal",
    usedIn: "Paso 5 — campo sensPapel de inspAO",
  },
];

export const LIBRO_FISCAL_INSPECTION_WORKFLOW = [
  {
    order: 1,
    title: "Abrir el libro fiscal del equipo",
    detail:
      "Desde el panel admin use «Libro fiscal» en la ficha de la impresora, o acceda directamente a aeg-core-fiscalbooks. Entre al libro de la sucursal y elija el equipo a inspeccionar.",
  },
  {
    order: 2,
    title: "Iniciar «Nueva inspección anual»",
    detail:
      "Complete fecha, técnico responsable y observaciones del formulario reglamentario. La sección Remoto aparece al inicio: debe completarse antes de guardar.",
  },
  {
    order: 3,
    title: "Paso 1 Remoto — Inspección Anual Obligatoria",
    detail:
      "Pulse el botón de ancho completo. AEG Core envía StaInf con status NroRegMa, guarda registroImpresora y abre el modal de checklist.",
  },
  {
    order: 4,
    title: "Pasos 2–4 en el modal (opcionales pero recomendados)",
    detail:
      "Marque el checklist manualmente o use «Enviar Factura de Prueba» y «Enviar Nota de Crédito de Prueba» para validar impresión. Cada prueba exitosa marca su checkbox; un fallo detiene el paso y muestra el error.",
  },
  {
    order: 5,
    title: "Paso 5 Remoto — Enviar inspección",
    detail:
      "Pulse «Enviar Inspección Anual Obligatoria». AEG Core publica SetDateRevO con inspAO según los checkboxes y timestamp Venezuela (UTC−4 naive). Debe responder code = 0.",
  },
  {
    order: 6,
    title: "Guardar en el libro fiscal",
    detail:
      "Solo tras SetDateRevO exitoso se habilita el guardado. El registro persiste registro Remoto, timestamp SetDateRevO y número de factura de prueba (si hubo) junto a la inspección anual.",
  },
] as const;

export const ANNUAL_INSPECTION_INSP_AO_MAPPING = [
  { field: "precinto", checklist: "Estado del Precinto", checked: "Bien", unchecked: "Violentado" },
  { field: "etiqFisc", checklist: "Estado de la Etiqueta Fiscal", checked: "Bien", unchecked: "Violentado" },
  { field: "impFact", checklist: "Estado de la Factura", checked: "Bien", unchecked: "Defectuoso" },
  { field: "impNC", checklist: "Estado de la Nota de Crédito", checked: "Bien", unchecked: "Defectuoso" },
  { field: "sensPapel", checklist: "Estado Sensor de Papel", checked: "Bien", unchecked: "Defectuoso" },
] as const;

export const ANNUAL_INSPECTION_FLOW_STEPS: AnnualInspectionFlowStep[] = [
  {
    id: "sta-inf",
    step: "1",
    name: "Consulta de registro (StaInf)",
    direction: "Servidor → impresora",
    topic: "Comando",
    responseTopic: "Respuesta",
    purpose:
      "Obtener el número de registro de la impresora fiscal (dataS) antes de abrir el modal de inspección. Comando: {\"cmd\":\"StaInf\",\"data\":{\"status\":\"NroRegMa\"}}.",
    successCriteria: [
      "Respuesta única con cmd StaInf y code = 0.",
      "dataS no vacío (ej. GRA0000017) → se guarda como registroImpresora.",
      "Tras éxito se abre el modal con checklist y botones de prueba.",
    ],
    libroFiscalAction:
      "Pulsar «Inspección Anual Obligatoria» en la sección Remoto del formulario de nueva inspección.",
    adminPanelAction:
      "Seleccionar impresora enajenada y pulsar «Inspección Anual Obligatoria» en esta pestaña.",
  },
  {
    id: "modal",
    step: "2",
    name: "Modal de inspección (checklist)",
    direction: "Servidor → impresora",
    topic: "Comando",
    responseTopic: "Respuesta",
    purpose:
      "El modal muestra registro de impresora, botón Actualizar (repite StaInf), descripción de producto para pruebas, cinco filas de checklist y el botón final SetDateRevO. Los checkboxes solo actualizan variables booleanas; no envían Remoto por sí solos.",
    successCriteria: [
      "Cinco filas: Precinto, Etiqueta Fiscal, Factura (+ botón factura prueba), Nota de Crédito (+ botón NC prueba), Sensor de Papel.",
      "Actualizar vuelve a consultar StaInf y refresca registroImpresora.",
    ],
    libroFiscalAction:
      "Revisar visualmente el equipo y marcar cada ítem del checklist, o dejar que las pruebas Remoto marquen Factura y NC.",
    adminPanelAction: "Mismo modal; «Actualizar» llama de nuevo a StaInf.",
  },
  {
    id: "test-invoice",
    step: "3",
    name: "Factura de prueba",
    direction: "Servidor → impresora",
    topic: "Comando",
    responseTopic: "Respuesta",
    purpose:
      "Arreglo en orden: proF (pre 100, cant 1000, imp 1, des01), subToF, fpaF, endFac. Producto por defecto COLGATE TOTAL (editable en el modal).",
    successCriteria: [
      "Cuatro respuestas con code = 0 en orden proF → subToF → fpaF → endFac.",
      "endFac.dataD es el número de factura impresa → numeroFacturaPrueba.",
      "Tras éxito se marca chkFactura y se habilita la NC de prueba.",
      "Cualquier code ≠ 0: error, se limpia numeroFacturaPrueba y se desmarcan Factura y NC.",
    ],
    libroFiscalAction: "En el modal, «Enviar Factura de Prueba» en la fila Estado de la Factura.",
    adminPanelAction: "Mismo botón en el modal de esta pestaña.",
  },
  {
    id: "test-credit-note",
    step: "4",
    name: "Nota de crédito de prueba",
    direction: "Servidor → impresora",
    topic: "Comando",
    responseTopic: "Respuesta",
    purpose:
      "Arreglo en orden: nroFacNC (numeroFacturaPrueba), fechFacNC (fecha sistema DD/MM/AAAA), conSerNC (registroImpresora), rifCiNC V00000000, razSocNC fijo, prodNC, endPoNC, fpaNC, endNC.",
    successCriteria: [
      "Requiere registroImpresora y numeroFacturaPrueba; botón deshabilitado si faltan.",
      "Nueve respuestas con code = 0; endNC debe ser el cierre exitoso.",
      "Tras éxito se marca chkNotaCredito.",
    ],
    libroFiscalAction: "«Enviar Nota de Crédito de Prueba» (solo habilitado tras factura OK).",
    adminPanelAction: "Mismo comportamiento y validaciones.",
  },
  {
    id: "set-date-rev-o",
    step: "5",
    name: "Registro de inspección (SetDateRevO)",
    direction: "Servidor → impresora",
    topic: "Comando",
    responseTopic: "Respuesta",
    purpose:
      "Comando único SetDateRevO: data = timestamp Unix en segundos menos 4 h (hora Venezuela naive); inspAO con Bien / Violentado / Defectuoso según cada checkbox.",
    successCriteria: [
      "Respuesta SetDateRevO con code = 0.",
      "En libro fiscal: habilita guardado y persiste mqttRegistroImpresora, mqttSetDateRevOAt y mqttNumeroFacturaPrueba.",
      "En panel admin: solo confirma éxito (no crea fila en inspecciones_anuales).",
    ],
    libroFiscalAction:
      "«Enviar Inspección Anual Obligatoria» al pie del modal; luego «Guardar» el formulario del libro.",
    adminPanelAction:
      "Mismo botón al pie del modal; cierra el modal tras éxito sin persistir inspección.",
  },
];

export function annualInspectionFlowStepById(
  id: string,
): AnnualInspectionFlowStep | undefined {
  return ANNUAL_INSPECTION_FLOW_STEPS.find((step) => step.id === id);
}
