// ── Adaptador de almacenamiento ──────────────────────────────────────
// La app usa window.storage (API del entorno de Claude).
// Aquí lo implementamos con localStorage del navegador, así funciona
// en cualquier teléfono o PC sin configurar nada.
//
// NOTA: localStorage es POR DISPOSITIVO. La caja y tu teléfono tendrán
// datos separados. Para compartir datos en tiempo real entre equipos,
// el siguiente paso es reemplazar estas 3 funciones por llamadas a una
// base de datos en la nube (ej: Supabase). La app no necesita más cambios.

export const storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    return value == null ? null : { key, value };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
};

if (typeof window !== 'undefined') {
  window.storage = storage;
}
