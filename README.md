# SysJust - CRM & Sistema de Gestión para Revendedores Just

SysJust es una plataforma integral diseñada para optimizar la gestión de stock, ventas y finanzas de revendedores independientes de productos Just. El sistema permite un control total sobre el inventario (Lotes, Vencimientos), seguimiento de clientes, y un análisis financiero detallado para maximizar las ganancias reales.

## 📸 Capturas de Pantalla

![Panel Financiero](/Users/guillote/.gemini/antigravity/brain/00963ce9-7b2a-4b8d-b02e-de37d8935d51/uploaded_media_1770124597507.png)
*Tablero Financiero con KPIs de Ventas, Ganancia Real, Gastos de Stock y Flujo Neto.*

![Nueva Venta](/Users/guillote/.gemini/antigravity/brain/00963ce9-7b2a-4b8d-b02e-de37d8935d51/uploaded_media_1770118316999.png)
*Formulario de Nueva Venta con búsqueda inteligente de productos y control de stock.*

---

## 🚀 Características Principales

### 📦 Gestión de Stock Avanzada
- **Control de Lotes:** Seguimiento trazable por fecha de vencimiento (FIFO/LIFO).
- **Alertas de Vencimiento:** Notificaciones automáticas para productos próximos a vencer.
- **Cálculo de Costos:** Desglose automático de IVA, Impuestos Extra, Envíos y Descuentos prorrateados por unidad.
- **Stock Perdido/Roto:** Registro de mermas y su impacto financiero.

### 💰 Finanzas y KPIs
- **Ganancia Real:** Cálculo automático de la ganancia neta (Venta - Costo Reposición Real).
- **Flujo de Caja:** Visualización clara de Ingresos vs. Egresos (Compras).
- **Desglose de Gastos:** Identificación precisa de costos por Regalos, Pérdidas y Ayuda de Ventas.
- **Gráficos Interactivos:** Evolución mensual y composición porcentual de ingresos.

### 🛍️ Ventas y Clientes
- **Punto de Venta (POS):** Interfaz rápida para registrar ventas, regalos o autoconsumo.
- **Catálogo de Productos:** Base de datos completa con precios de lista y oferta.
- **Ayuda de Venta:** Gestión separada de materiales de apoyo (folletería, bolsas) como gastos operativos.

### 🛠️ Tecnología y Seguridad
- **Autenticación Segura:** Acceso protegido por contraseña.
- **Base de Datos Robusta:** SQLite con ORM Prisma para integridad de datos.
- **Diseño Responsivo:** Interfaz adaptada para escritorio, tablets y móviles.
- **Backup y Restauración:** Herramientas integradas para resguardo de la información.

## 💻 Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Lenguaje:** TypeScript
- **Base de Datos:** SQLite
- **ORM:** [Prisma](https://www.prisma.io/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes:** [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Deploy:** Docker / VPS (Dokploy)

## 🔧 Instalación y Despliegue

Consulte la [Guía de Despliegue](./deployment/GUIA_DOKPLOY.md) para instrucciones detalladas sobre cómo poner en marcha el sistema en un servidor VPS usando Dokploy.

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Inicializar base de datos
npx prisma migrate dev

# Correr servidor de desarrollo
npm run dev
```

---
**Desarrollado para optimizar tu negocio independiente.**
