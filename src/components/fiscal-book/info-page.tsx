import { Info } from "lucide-react";
import { NoData } from "@/components/fiscal-book/no-data";
import {
  getActiveSealSerial,
  truncateVersion,
} from "@/lib/fiscal-book/fiscal-helpers";
import type { FiscalPrinter } from "@/lib/fiscal-book/types";
import { formatDate } from "@/lib/datetime-form";

export function FiscalBookInfoPage({ printer }: { printer: FiscalPrinter }) {
  const installDate = printer.installationDate || printer.createdAt;

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          1. DATOS DEL FABRICANTE
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel>Razón Social</FieldLabel>
              <p className="text-lg font-black uppercase">
                ALPHA ENGINEER GROUP, C.A.
              </p>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>RIF</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">J504594369</p>
            </div>
            <div>
              <FieldLabel>Estado</FieldLabel>
              <p className="text-xs font-black uppercase">MIRANDA</p>
            </div>
            <div>
              <FieldLabel>Ciudad</FieldLabel>
              <p className="text-xs font-black uppercase">LOS TEQUES</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          2. DATOS DEL ENAJENADOR
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          {printer.distributor?.branch ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel>Razón Social</FieldLabel>
                <p className="text-lg font-black uppercase">
                  {printer.distributor.branch.company.businessName || <NoData />}
                </p>
              </div>
              <div className="md:col-span-2">
                <FieldLabel>RIF</FieldLabel>
                <p className="font-mono text-xs font-black uppercase">
                  {printer.distributor.branch.company.rif || <NoData />}
                </p>
              </div>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <p className="text-xs font-black uppercase">
                  {printer.distributor.branch.state || <NoData />}
                </p>
              </div>
              <div>
                <FieldLabel>Ciudad</FieldLabel>
                <p className="text-xs font-black uppercase">
                  {printer.distributor.branch.city || <NoData />}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm italic text-muted">Sin enajenador registrado.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          3. DATOS DEL CONTRIBUYENTE/USUARIO
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel>Razón Social</FieldLabel>
              <p className="text-lg font-black uppercase">
                {printer.businessName || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>RIF</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {printer.rif || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Tipo de Contribuyente</FieldLabel>
              <p className="text-xs font-black uppercase">
                {printer.taxpayerType || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Estado</FieldLabel>
              <p className="text-xs font-black uppercase">
                {printer.branch?.state || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Ciudad</FieldLabel>
              <p className="text-xs font-black uppercase">
                {printer.branch?.city || <NoData />}
              </p>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Domicilio Fiscal</FieldLabel>
              <p className="text-sm font-medium uppercase leading-relaxed">
                {printer.address || <NoData />}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          4. DATOS DEL LUGAR DE INSTALACIÓN
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          <p className="text-sm italic text-muted">
            El lugar de instalación es el domicilio fiscal del contribuyente.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          5. DATOS DE LA MÁQUINA FISCAL
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <FieldLabel>Número de Registro (serial)</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {printer.fiscalSerial || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Tipo de Dispositivo Fiscal</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {printer.deviceType || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Marca</FieldLabel>
              <p className="text-xs font-black uppercase">
                {printer.model?.brand || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Modelo</FieldLabel>
              <p className="text-xs font-black uppercase">
                {printer.model?.modelCode || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Serial del Precinto</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {getActiveSealSerial(printer) || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Fecha de Instalación</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {installDate ? formatDate(installDate) : <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Versión del Firmware</FieldLabel>
              <div className="group relative inline-flex cursor-help items-center gap-1.5">
                <p className="m-0 font-mono text-sm font-black">
                  {truncateVersion(printer.versionFirmware) || <NoData />}
                </p>
                {printer.versionFirmware ? (
                  <>
                    <Info className="size-3.5 text-muted" />
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md border border-border bg-card px-3 py-2 text-xs opacity-0 shadow-xl transition-all group-hover:translate-y-0 group-hover:opacity-100">
                      Versión completa:{" "}
                      <span className="font-mono font-bold text-accent">
                        {printer.versionFirmware}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 border-b border-border pb-2 text-[11px] font-black uppercase tracking-widest">
          6. DATOS DEL SOFTWARE
        </h2>
        <div className="border border-border bg-foreground/[0.02] p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <FieldLabel>Nombre</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {printer.software?.name || <NoData />}
              </p>
            </div>
            <div>
              <FieldLabel>Versión</FieldLabel>
              <p className="font-mono text-xs font-black uppercase">
                {printer.software?.version || <NoData />}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[9px] font-bold uppercase tracking-tighter text-muted">
      {children}
    </label>
  );
}
