# Guía de Despliegue en Hostinger VPS (CRM Just)

Esta guía detalla los pasos para desplegar la aplicación "CRM Just" en un entorno de Hostinger VPS (Ubuntu/Debian) usando Node.js y PM2.

## 1. Preparación del Build (Local)

Antes de subir los archivos, debemos generar una versión optimizada "standalone".

1.  **Verificar Configuración**: Asegúrate de que `next.config.ts` tiene `output: "standalone"`.
2.  **Generar Build**:
    Abre tu terminal en la carpeta del proyecto y ejecuta:
    ```bash
    npm run build
    ```

3.  **Preparar Carpeta para Subir**:
    Al finalizar, se creará una carpeta `.next/standalone`. 
    
    **¡IMPORTANTE!** El script `start.sh` incluido en este proyecto se encarga automáticamente de copiar las carpetas `public` y `.next/static` al lugar correcto al iniciar.
    
    Por lo tanto, solo necesitas subir:
    1. La carpeta `.next` completa.
    2. La carpeta `public` completa.
    3. La carpeta `prisma` completa.
    4. La carpeta `scripts` completa.
    5. El archivo `package.json`.
    6. El archivo `start.sh`.

    **Estructura ideal en el servidor (`/var/www/crm-just`):**
    ```text
    crm-just/
    ├── .next/         <-- (Carpeta generada por build)
    ├── public/        <-- (Activos públicos)
    ├── prisma/        <-- (Schema y migraciones)
    ├── scripts/       <-- (seed-admin.js)
    ├── package.json   
    └── start.sh       <-- (Script de arranque)
    ```

## 2. Configuración en Hostinger VPS

Conéctate por SSH a tu servidor.

1.  **Instalar Node.js y PM2**:
    ```bash
    # Instalar Node.js 18+ (o 20)
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Instalar PM2 (Gestor de procesos)
    sudo npm install -g pm2
    ```

2.  **Subir Archivos**:
    Usa FileZilla o SCP para subir los archivos listados arriba a `/var/www/crm-just`.

3.  **Permisos**:
    Dale permisos de ejecución al script de inicio:
    ```bash
    chmod +x /var/www/crm-just/start.sh
    ```

4.  **Variables de Entorno**:
    Crea un archivo `.env` en la carpeta (`/var/www/crm-just/.env`):
    ```env
    # Producción (SQLite file o URL de PostgreSQL)
    DATABASE_URL="file:./prod.db"
    
    # Clave secreta (Puede generarse sola, pero mejor definirla)
    AUTH_SECRET="tu-clave-super-secreta-larga-y-aleatoria"
    ```

5.  **Iniciar Aplicación con PM2**:
    Usaremos el script `start.sh` como punto de entrada. Este script se encarga de:
    - Optimizar memoria.
    - Copiar archivos estáticos necesarios para el modo standalone.
    - Ejecutar migraciones de base de datos (`prisma db push`).
    - Crear el usuario administrador inicial (`scripts/seed-admin.js`).
    - Iniciar el servidor Next.js.

    Ejecuta:
    ```bash
    cd /var/www/crm-just
    pm2 start ./start.sh --name "crm-just"
    pm2 save
    pm2 startup
    ```

## 3. Configuración Nginx (Reverse Proxy)

Para acceder mediante tu dominio (ej: `crm.tusitio.com`), configura Nginx para redirigir el tráfico al puerto 3000.

1.  Crear configuración:
    ```bash
    sudo nano /etc/nginx/sites-available/crm-just
    ```

2.  Pegar contenido (ajusta `server_name`):
    ```nginx
    server {
        listen 80;
        server_name crm.tusitio.com;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  Activar y reiniciar:
    ```bash
    sudo ln -s /etc/nginx/sites-available/crm-just /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

## 4. Usuario Administrador Inicial

Al arrancar por primera vez, el script `scripts/seed-admin.js` creará (o actualizará) un usuario administrador por defecto si no existe.

- **Email**: `admin@crm.com`
- **Password**: `admin`

**¡CAMBIA ESTA CONTRASEÑA INMEDIATAMENTE DESPUÉS DE INGRESAR!**

## Troubleshooting

Si la app no inicia:
1.  Revisar logs de PM2: `pm2 logs crm-just`
2.  Revisar si el puerto 3000 está ocupado.
3.  Asegurar que la carpeta tenga permisos de escritura para crear la base de datos SQLite (`prod.db`).
