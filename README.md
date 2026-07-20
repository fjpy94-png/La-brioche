# 🥐 La Brioche — Sistema de Gestión de Panadería

Sistema completo: ventas (POS), inventario, producción, fórmulas, empleados,
cuadre de caja por turnos con doble moneda (USD billetes / Bolívares), clientes,
gastos, reportes y usuarios con login.

---

## 🚀 Opción A — Publicar GRATIS en internet con Vercel (recomendada)

Al final tendrás un link tipo `labrioche.vercel.app` que abre en **cualquier
teléfono o PC** con solo escribir la dirección en el navegador.

**Necesitas:** una cuenta gratis en [github.com](https://github.com) y otra en [vercel.com](https://vercel.com) (regístrate en Vercel usando tu cuenta de GitHub).

1. Entra a GitHub → botón **"New repository"** → nómbralo `labrioche` → **Create repository**.
2. En la página del repositorio nuevo, usa **"uploading an existing file"** y arrastra
   TODO el contenido de esta carpeta (los archivos `package.json`, `index.html`,
   `vite.config.js`, `.gitignore`, `README.md` y la carpeta `src` completa).
   → **Commit changes**.
3. Entra a [vercel.com](https://vercel.com) → **Add New → Project** → selecciona el
   repositorio `labrioche` → **Deploy** (Vercel detecta Vite solo, no cambies nada).
4. En 1-2 minutos te da tu link. ¡Listo! Ábrelo en el teléfono y en la caja.

**Actualizaciones futuras:** cuando te entregue una nueva versión de `App.jsx`,
solo reemplaza ese archivo en GitHub (carpeta `src`) y Vercel republica solo.

---

## 💻 Opción B — Probar en tu PC (requiere Node.js)

1. Instala [Node.js](https://nodejs.org) (versión LTS).
2. Abre una terminal en esta carpeta y ejecuta:

```bash
npm install
npm run dev
```

3. Abre `http://localhost:5173` en el navegador.

Para generar la versión publicable: `npm run build` (queda en la carpeta `dist/`,
que puedes arrastrar a [netlify.com/drop](https://app.netlify.com/drop) como
alternativa a Vercel).

---

## 🔑 Primer acceso

- Usuario: **Administrador** · Contraseña: **admin123**
- Cámbiala de inmediato en **Configuración → 🔐 Usuarios**, y crea ahí los
  usuarios de cajeros y producción con sus propias claves.

## ⚠️ Cosas importantes que debes saber

**Los datos se guardan EN CADA DISPOSITIVO (localStorage del navegador).**
La caja tendrá sus datos y tu teléfono los suyos — no se sincronizan entre sí.
Para el uso diario real se recomienda: **un solo equipo en la caja** como
sistema principal, y usar **Configuración → 💾 Backup** para descargar el
respaldo JSON todos los días (y poder restaurarlo en otro equipo si hace falta).

- No borres los datos del navegador (historial/caché) del equipo de la caja
  sin haber descargado el backup primero.
- La función 🤖 de sugerencia con IA solo funciona dentro del entorno de
  Claude; en esta versión web muestra un aviso y no afecta nada más.
- Las tasas en tiempo real (🌐 en Configuración → Tasas) sí funcionan
  (usa un servicio gratuito de tipos de cambio).

**¿Siguiente nivel?** Si más adelante quieres que caja, teléfono y oficina
vean los mismos datos en tiempo real, el paso es conectar una base de datos
gratuita (Supabase). Solo hay que reemplazar el archivo `src/storage.js` —
la aplicación no necesita más cambios.
