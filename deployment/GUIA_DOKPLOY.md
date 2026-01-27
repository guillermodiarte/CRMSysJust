# Guía de Despliegue en Dokploy (CRM Just)

Esta guía documenta la configuración recomendada para desplegar "CRM Just" en Dokploy usando GitHub, asegurando persistencia de datos (base de datos eterna) y estabilidad.

## ✅ Configuración Recomendada

Usa esta configuración en tu panel de Dokploy para tener un sistema estable.

### 1. General (Build Settings)
- **Build Type (Provider):** `Nixpacks`
- **Base Directory:** `/` (Raíz).
- **Repository:** Conecta tu repositorio de GitHub y selecciona la rama `main`.

### 2. Variables de Entorno (Environment)
Ve a la pestaña **Environment** y agrega las siguientes variables. Son críticas para que la base de datos se guarde en el volumen persistente.

```env
# Ruta interna donde la app guardará los datos
# IMPORTANTE: Debe coincidir con el Mount Path del volumen (ver paso 3)
DATABASE_URL="file:/app/database/prod.db"

# Clave de seguridad para sesiones (genera una larga y aleatoria)
AUTH_SECRET="tu_clave_secreta_super_segura_crm_just_2026"

# Necesario para que NextAuth confíe en el proxy de Dokploy (HTTPS)
AUTH_TRUST_HOST=true
```

### 3. Persistencia (Volúmenes) - ¡CRÍTICO!
Para evitar que la base de datos se borre cada vez que haces un nuevo despliegue (commit), debes configurar un volumen persistente.

Ve a la pestaña **Volumes** y agrega:

| Configuración | Valor | Nota |
| :--- | :--- | :--- |
| **Mount Type** | `VOLUME` | **Importante**: NO usar "BIND". Usar "VOLUME". |
| **Name (Host Path)** | `crm_just_data` | Nombre único para este volumen. |
| **Mount Path** | `/app/database` | Ruta interna. Debe coincidir con `DATABASE_URL`. |

### 4. Puertos
- **Port:** `3000` (El puerto donde escucha Next.js internamente).

**Nota sobre Puertos**: En Dokploy, cada aplicación corre aislada en su propio contenedor. Por lo tanto, **NO necesitas cambiar el puerto** aunque tengas otras aplicaciones usando el 3000. Dokploy maneja el enrutamiento automáticamente basado en el dominio.

---

## 🚀 Flujo de Despliegue (Cómo funciona)

1.  **Push a GitHub**: Al hacer cambios y subir tu código (`git push origin main`), Dokploy detectará el cambio.
2.  **Build Automático**: Dokploy descargará el código y usará `Nixpacks` para detectar que es una app Next.js.
3.  **Inicio Optimizado**: El proyecto incluye un archivo `start.sh` que Dokploy ejecutará automáticamente (o puedes forzarlo en el `Start Command` si es necesario, pero Nixpacks suele detectar `npm start`).
    *   *Nota*: Si Nixpacks usa `npm start` por defecto, nuestro `package.json` ejecuta `next start`.
    *   Para usar el script optimizado `start.sh` (recomendado para VPS pequeños), en Dokploy ve a **General** -> **Start Command** y pon:
        ```bash
        chmod +x start.sh && ./start.sh
        ```

## 🔒 Dominio y SSL (HTTPS)

1.  **DNS**: Apunta tu subdominio (ej: `crm.tusitio.com`) a la IP de tu VPS.
2.  **Dokploy UI**:
    - Pestaña **Domains**.
    - Agrega `crm.tusitio.com`.
    - Puerto `3000`.
    - HTTPS: **Enable**.
    - Dokploy generará el certificado SSL automáticamente.

---

## Solución de Problemas (Troubleshooting)

### Error: "No such container" o Reinicios constantes
- **Causa:** Permisos de volumen incorrectos.
- **Solución:** Asegúrate de usar **Mount Type: VOLUME**. Si usaste BIND, borra esa configuración y crea un Volumen nombrado.

### La base de datos está vacía tras deploy
- **Verifica:**
    1. Que `DATABASE_URL` empiece por `file:/app/database/...`
    2. Que el volumen esté montado en `/app/database`.
    3. Que no hayas cambiado el nombre del volumen recientemente.

### Error en Build
- Revisa los logs de "Build" en Dokploy.
- Asegúrate de que `npm run build` funciona en tu local (recuerda que excluimos carpetas extrañas en `tsconfig.json`).
