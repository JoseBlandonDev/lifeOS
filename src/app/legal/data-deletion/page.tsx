import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eliminacion de datos | lifeOS",
  description: "Instrucciones para solicitar la eliminacion de datos en lifeOS.",
};

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12 text-zinc-200">
      <div>
        <p className="text-sm uppercase tracking-widest text-violet-300">
          lifeOS
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Instrucciones para la eliminacion de datos
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Ultima actualizacion: 13 de mayo de 2026
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Como solicitarlo</h2>
        <p>
          Para solicitar la eliminacion de datos asociados a lifeOS, abre una
          solicitud en el repositorio oficial del proyecto o contacta al
          responsable de la aplicacion indicando el correo de tu cuenta y que
          deseas eliminar tus datos.
        </p>
        <p>
          Repositorio:
          {" "}
          <a
            href="https://github.com/JoseBlandonDev/lifeOS/issues"
            className="text-violet-300 underline hover:text-violet-200"
          >
            https://github.com/JoseBlandonDev/lifeOS/issues
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Que datos se eliminan</h2>
        <p>
          La solicitud puede incluir datos de cuenta, movimientos financieros,
          registros procesados desde WhatsApp, notas, tareas, calendario,
          informacion academica y otros datos creados dentro de lifeOS.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Plazo</h2>
        <p>
          Las solicitudes validas se procesaran en un plazo razonable. Puede
          conservarse informacion limitada si es necesaria para seguridad,
          prevencion de abuso, obligaciones legales o copias de respaldo por un
          periodo tecnico limitado.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Desconexion de WhatsApp</h2>
        <p>
          Si solo deseas dejar de usar el bot de WhatsApp, puedes desactivar la
          vinculacion del numero desde la seccion de Finanzas y Movimientos de
          la aplicacion.
        </p>
      </section>
    </main>
  );
}
