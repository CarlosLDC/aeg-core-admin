import {
  compactMac,
  fiscalCmdServerTopic,
  fiscalComandoTopic,
  fiscalRespuestaTopic,
} from "@/lib/enajenacion-mqtt-protocol";

export const FISCALIZACION_FLOW_STEPS = [
  {
    id: "request",
    step: "1",
    name: "Enviar solicitud",
    isRequest: true,
  },
  {
    id: "ack",
    step: "2",
    name: "ACK del servidor",
    isRequest: false,
  },
  {
    id: "result",
    step: "3",
    name: "Resultado",
    isRequest: false,
  },
  {
    id: "config_spiffs",
    step: "4",
    name: "Configuración impuestos",
    isRequest: false,
  },
] as const;

export type FiscalizacionFormValues = {
  ptrReg: string;
  mac: string;
  precintoNro: string;
  precintoColor: string;
  firmwareVersion: string;
  model: string;
};

export function fiscalizacionTopics(mac: string) {
  const compact = compactMac(mac);
  return {
    mac: compact,
    cmdServer: fiscalCmdServerTopic(compact),
    comando: fiscalComandoTopic(compact),
    respuesta: fiscalRespuestaTopic(compact),
  };
}

export function buildPtrFiscalizarPayload(values: FiscalizacionFormValues) {
  return {
    cmd: "ptrFiscalizar",
    data: {
      ptrReg: values.ptrReg.trim().toUpperCase(),
      macAddr: normalizeColonMac(values.mac),
      PrecintoNro: values.precintoNro.trim(),
      PrecintoColor: values.precintoColor.trim(),
      firmwareVersion: values.firmwareVersion.trim(),
      model: values.model.trim(),
    },
  };
}

export function buildPtrFiscalizarRemotoPayload(values: FiscalizacionFormValues) {
  return {
    cmd: "ptrFiscalizarRemoto",
    data: {
      nroRegistro: values.ptrReg.trim().toUpperCase(),
      PrecintoNro: values.precintoNro.trim(),
      PrecintoColor: values.precintoColor.trim(),
      NroMemFis: 1,
      Access: "AA ",
    },
  };
}

export function buildFiscalizacionResultSuccessPayload() {
  return {
    cmd: "RxPtrFiscalizarRemoto",
    code: 0,
    dataS: { error: "Impresora Fiscalizando" },
  };
}

export function buildFiscalizacionResultErrorPayload() {
  return {
    cmd: "RxPtrFiscalizarRemoto",
    code: 1,
    dataS: { error: "ERROR Fiscalizando" },
  };
}

export function buildFiscalizacionSpiffsSuccessPayload() {
  return {
    cmd: "wFileSPIFF",
    code: 0,
    dataD: 0,
  };
}

export function buildFiscalizacionSpiffsErrorPayload() {
  return {
    cmd: "wFileSPIFF",
    code: 1,
    dataD: 0,
  };
}

export function colorLabelForSeal(color: string): string {
  switch (color) {
    case "azul":
      return "Azul";
    case "morado":
      return "Morado";
    case "verde":
      return "Verde";
    case "verde_neon":
      return "Verde neon";
    default:
      return color;
  }
}

function normalizeColonMac(mac: string): string {
  const compact = compactMac(mac);
  if (compact.length !== 12) {
    return mac.trim().toUpperCase();
  }
  return compact.match(/.{1,2}/g)?.join(":") ?? mac;
}
