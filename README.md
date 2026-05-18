# lifeOS

Aplicación personal de productividad y finanzas: dashboard, módulo académico (materias y notas con pesos en porcentaje), finanzas (cuentas, movimientos, presupuesto, metas) e integración con **WhatsApp** para registrar gastos e ingresos por texto, audio o imagen usando **Meta Cloud API** y **Google Gemini**.

- **Repositorio:** [github.com/JoseBlandonDev/lifeOS](https://github.com/JoseBlandonDev/lifeOS)
- **Stack:** Next.js 16 (App Router), React 19, Supabase (Auth + Postgres + RLS), Tailwind CSS, Vercel

---

## Requisitos

- Node.js 20+
- Cuenta [Supabase](https://supabase.com)
- (Opcional) [Vercel](https://vercel.com) para despliegue
- (Opcional) App en [Meta for Developers](https://developers.facebook.com) + clave [Gemini API](https://aistudio.google.com) para el bot de WhatsApp

---

## Inicio rápido (desarrollo local)

```bash
git clone https://github.com/JoseBlandonDev/lifeOS.git
cd lifeOS
npm install
cp .env.example .env.local
# Completa .env.local (ver tabla abajo)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

**Importante:** nunca subas `.env`, `.env.local` ni claves al repositorio. Solo `.env.example` (sin secretos).

---

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores.

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave anon/public de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí (bot WhatsApp) | Clave `service_role` (solo servidor; webhook) |
| `NEXT_PUBLIC_APP_URL` | Sí | URL pública de la app (ej. `https://tu-app.vercel.app`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth calendario | Mismos valores que en Supabase Auth → Providers |
| `MICROSOFT_TENANT_ID` / `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | OAuth calendario | Opcional si usas Outlook |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Bot WhatsApp | Token que inventas; debe coincidir con Meta |
| `WHATSAPP_ACCESS_TOKEN` | Bot WhatsApp | Token de acceso de la app Meta (WhatsApp) |
| `WHATSAPP_PHONE_NUMBER_ID` | Bot WhatsApp | **Phone number ID** del número de negocio (no el WABA ID) |
| `WHATSAPP_APP_SECRET` | Bot WhatsApp | App Secret de Meta (firma del webhook) |
| `WHATSAPP_GRAPH_VERSION` | No | Por defecto `v21.0` |
| `GEMINI_API_KEY` | Bot WhatsApp | API key de Google AI / Gemini |
| `GEMINI_MODEL` | No | Por defecto `gemini-2.0-flash` |

En **Vercel** → Settings → Environment Variables: las mismas variables en **Production** (y Preview si aplica). Tras cambiar env, haz **Redeploy**.

---

## Base de datos (Supabase)

Aplica las migraciones en `supabase/migrations/` en orden (SQL Editor o CLI):

1. Migraciones base del proyecto (si aún no están aplicadas).
2. `20260513000000_academic_weight_percent_guardrails.sql` — pesos de notas entre 0 y 100 %.
3. `20260513010000_whatsapp_finance_bot.sql` — tablas `whatsapp_user_links` y `whatsapp_finance_events`.

Tablas del bot:

- **`whatsapp_user_links`:** vincula el **número personal** del usuario (quien escribe) con su cuenta de lifeOS y la cuenta financiera por defecto.
- **`whatsapp_finance_events`:** auditoría de mensajes procesados (estados: `received`, `pending_confirmation`, `saved`, etc.).

---

## Módulo académico

- Escala de notas: **0.0 – 5.0** (mínima típica 3.0).
- Pesos por materia en **porcentajes** que deben sumar **100 %**.
- Métricas: promedio actual, promedio proyectado, peso completado/pendiente.
- UI en `/academico`.

---

## Bot de WhatsApp (finanzas)

### Cómo funciona

1. El usuario escribe al **número de negocio** registrado en Meta (Cloud API).
2. Meta envía un POST al webhook: `{APP_URL}/api/whatsapp/webhook`.
3. El servidor valida la firma (`WHATSAPP_APP_SECRET`), parsea con Gemini y guarda o pide confirmación (modelo **híbrido**).
4. En la app, en **Finanzas → Movimientos**, el usuario debe vincular su **número personal** (el que envía mensajes), no el número de negocio.

### Configuración en Meta (resumen)

1. Crear app en [developers.facebook.com](https://developers.facebook.com) → caso de uso **WhatsApp**.
2. **API Setup:** generar **Access Token**, anotar **Phone Number ID** (debajo del teléfono de negocio).
3. **Webhook:**
   - URL: `https://TU_DOMINIO/api/whatsapp/webhook`
   - Verify token: igual que `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Suscribir campo **`messages`**
4. En la cuenta WhatsApp Business (WABA): **Registrar** el número y activar **Suscribir webhooks**.
5. Publicar la app (Live) y, si aplica, páginas legales:
   - `/legal/privacy`
   - `/legal/terms`
   - `/legal/data-deletion`

### Configuración en lifeOS

1. Variables de entorno en Vercel (o `.env.local`).
2. Migración `20260513010000_whatsapp_finance_bot.sql` aplicada.
3. Usuario logueado → **Finanzas → Movimientos** → formulario WhatsApp:
   - Número: **tu WhatsApp personal** en formato internacional (`+57…`, sin espacios raros).
   - Cuenta por defecto donde se registran movimientos.
4. Probar enviando, por ejemplo: `Gasté 15000 en mercado con Nequi`.

### IDs: no confundir

| En Meta | Variable en Vercel |
|---------|-------------------|
| **Phone number ID** (bajo el +57…) | `WHATSAPP_PHONE_NUMBER_ID` |
| **WhatsApp Business Account ID** (WABA) | No se usa en el código actual |

---

## Despliegue (Vercel)

1. Importar el repo desde GitHub.
2. Configurar todas las variables de entorno.
3. Deploy. El dominio de producción debe coincidir con `NEXT_PUBLIC_APP_URL` y con la URL del webhook en Meta.

```bash
npm run build
npm run start   # probar build local
```

---

## Estructura relevante

```
src/app/(shell)/          # Rutas autenticadas (dashboard, académico, finanzas…)
src/app/api/whatsapp/webhook/route.ts   # Webhook Meta
src/app/legal/              # Privacidad, términos, borrado de datos (Meta)
src/lib/whatsapp/           # Cloud API, Gemini, lógica financiera
src/components/finance/whatsapp-link-form.tsx
supabase/migrations/
```

---

## Pendiente / troubleshooting

Cosas que suelen quedar al terminar el código y dependen de configuración externa:

| Problema | Qué revisar |
|----------|-------------|
| No hay logs en Vercel al enviar mensajes | URL del webhook = `{NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`; campo `messages` suscrito; toggle **Suscribir webhooks** ON en el WABA; app en modo **Live**; redeploy tras cambiar env |
| Webhook 401 / `invalid signature` | `WHATSAPP_APP_SECRET` igual al App Secret de Meta |
| Bot no responde pero sí hay logs | `WHATSAPP_ACCESS_TOKEN` válido; `WHATSAPP_PHONE_NUMBER_ID` correcto; `SUPABASE_SERVICE_ROLE_KEY` en Vercel |
| Mensaje “número no vinculado” | En Movimientos vincular el **número personal** (remitente), no el de negocio |
| Un solo ✓ en WhatsApp, sin respuesta | Mensaje no entregado al extremo API; número de negocio distinto al registrado; token expirado |
| Celular dice “no tiene WhatsApp”, PC sí | Misma cuenta en móvil y Web; abrir `https://wa.me/57XXXXXXXXX` en el navegador del móvil |
| Mismo número personal y de negocio | Meta no permite chatear contigo mismo; usar **otra línea** para el Business o flujo de migración/coexistencia de Meta |
| Token temporal de Meta caducado | Generar token de sistema / permanente y actualizar `WHATSAPP_ACCESS_TOKEN` |
| Tabla `whatsapp_finance_events` vacía | El POST no llega o falla antes de insertar; revisar logs `[whatsapp]` |

### Comprobaciones útiles

- **Webhook vivo:** `GET https://TU_DOMINIO/api/whatsapp/webhook` sin parámetros → `403` (esperado).
- **Logs Vercel:** buscar `[whatsapp] webhook received` al enviar un mensaje.
- **Supabase:** filas nuevas en `whatsapp_finance_events` tras un mensaje exitoso.

### Mejoras futuras (código)

- [ ] Loguear respuesta de Graph API al enviar mensajes (`sendWhatsappText`) para depurar errores de token.
- [ ] Excluir `/api/whatsapp/webhook` del middleware de sesión (opcional; hoy no bloquea el POST).
- [ ] Token de WhatsApp de larga duración (System User) documentado en un runbook interno.
- [ ] Ventana de 24 h y plantillas de Meta para mensajes fuera de sesión (si se usa en producción con muchos usuarios).

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor tras build |
| `npm run lint` | ESLint |

---

## Seguridad

- No commitear `.env* excepto `.env.example`.
- `SUPABASE_SERVICE_ROLE_KEY` y tokens de WhatsApp/Gemini solo en servidor (Vercel env).
- El webhook valida `x-hub-signature-256` cuando `WHATSAPP_APP_SECRET` está definido.

---

## Licencia

Proyecto privado (`"private": true` en `package.json`). Uso personal del autor salvo que indique lo contrario.
