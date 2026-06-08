import Link from "next/link";

export default function FiscalBookManualPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/fiscal-book"
        className="mb-8 inline-block text-sm text-accent hover:underline"
      >
        ← Volver al libro fiscal
      </Link>
      <h1 className="mb-6 text-3xl font-bold">
        Manual — Libro virtual de control
      </h1>
      <div className="prose prose-sm max-w-none space-y-6 text-card-foreground">
        <section>
          <h2 className="text-lg font-semibold">Propósito</h2>
          <p className="text-muted leading-relaxed">
            El libro virtual digitaliza el registro obligatorio de máquinas
            fiscales según la Providencia SENIAT 0141. Permite consultar el
            historial de cada equipo, sus servicios técnicos e inspecciones
            anuales, y exportar la información en PDF.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Acceso</h2>
          <p className="text-muted leading-relaxed">
            Disponible para administradores, técnicos y centros de servicio
            autenticados en el panel AEG. Use el menú <strong>Libro fiscal</strong>{" "}
            o el acceso directo desde el detalle de una impresora.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Búsqueda</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted">
            <li>
              <strong>Serial:</strong> 3 letras mayúsculas + 7 dígitos (ej.
              GRA0000123). Un único resultado abre el libro directamente.
            </li>
            <li>
              <strong>RIF:</strong> letra V/E/J/P/G + 7 a 9 dígitos del
              contribuyente; lista las impresoras asociadas a sus empresas en
              alcance.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Registros</h2>
          <p className="text-muted leading-relaxed">
            Las altas de servicios técnicos e inspecciones anuales se realizan
            desde los módulos homónimos del panel. Desde el libro, el botón{" "}
            <strong>+</strong> abre el formulario con la impresora preseleccionada.
          </p>
        </section>
      </div>
    </main>
  );
}
