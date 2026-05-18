import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de privacidad | lifeOS",
  description: "Politica de privacidad de lifeOS.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12 text-zinc-200">
      <div>
        <p className="text-sm uppercase tracking-widest text-violet-300">
          lifeOS
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Politica de privacidad
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Ultima actualizacion: 13 de mayo de 2026
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Informacion que usamos</h2>
        <p>
          lifeOS es una aplicacion personal para registrar finanzas, tareas,
          calendario, notas y datos academicos. Para operar el servicio podemos
          procesar datos que el usuario registra voluntariamente, como
          movimientos financieros, categorias, cuentas, notas, tareas,
          asignaturas y mensajes enviados al bot de WhatsApp.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Uso de WhatsApp</h2>
        <p>
          Si el usuario conecta el bot de WhatsApp, los mensajes enviados al
          numero configurado pueden procesarse para identificar gastos o
          ingresos. Tambien se pueden procesar audios o imagenes de recibos para
          extraer la informacion necesaria. Estos datos se usan solo para crear
          registros dentro de la cuenta del usuario.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Servicios externos</h2>
        <p>
          La aplicacion puede usar Supabase para autenticacion y base de datos,
          Vercel para alojamiento, Meta WhatsApp Cloud API para mensajeria y
          Gemini para interpretar mensajes, audios o imagenes cuando el usuario
          utiliza el bot.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">No venta de datos</h2>
        <p>
          lifeOS no vende datos personales. Los datos se usan para prestar las
          funciones de la aplicacion y mantener la cuenta del usuario.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Eliminacion de datos</h2>
        <p>
          El usuario puede solicitar la eliminacion de sus datos siguiendo las
          instrucciones publicadas en la pagina de eliminacion de datos de esta
          aplicacion.
        </p>
      </section>
    </main>
  );
}
