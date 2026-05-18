import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Condiciones del servicio | lifeOS",
  description: "Condiciones del servicio de lifeOS.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12 text-zinc-200">
      <div>
        <p className="text-sm uppercase tracking-widest text-violet-300">
          lifeOS
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Condiciones del servicio
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Ultima actualizacion: 13 de mayo de 2026
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Uso de la aplicacion</h2>
        <p>
          lifeOS se ofrece como una herramienta personal para organizar finanzas,
          calendario, notas, productividad y datos academicos. El usuario es
          responsable de la informacion que registra y de verificar que los
          movimientos guardados sean correctos.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Bot de WhatsApp</h2>
        <p>
          El bot de WhatsApp puede interpretar mensajes, audios o imagenes para
          sugerir o registrar gastos e ingresos. Aunque el sistema intenta ser
          preciso, el usuario debe revisar los datos creados automaticamente o
          confirmados desde WhatsApp.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Disponibilidad</h2>
        <p>
          La aplicacion depende de servicios externos como Supabase, Vercel,
          Meta WhatsApp Cloud API y proveedores de IA. Por eso, algunas
          funciones pueden verse afectadas por interrupciones, limites o cambios
          de esos servicios.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Uso permitido</h2>
        <p>
          El usuario no debe usar la aplicacion para actividades ilegales,
          abusivas, fraudulentas o que violen politicas de terceros, incluyendo
          las politicas de Meta WhatsApp Business Platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Cambios</h2>
        <p>
          Estas condiciones pueden actualizarse cuando cambien las funciones de
          la aplicacion. El uso continuo de lifeOS implica aceptacion de las
          condiciones vigentes.
        </p>
      </section>
    </main>
  );
}
