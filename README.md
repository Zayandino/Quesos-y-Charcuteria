# 🧀 CABRA & CURADO - E-commerce de Curaduría Artesanal

**Curadores de quesos de cabra y embutidos artesanales premium**

## 📋 Descripción

Plataforma e-commerce que conecta productores artesanales chilenos con amantes de la buena comida. No producimos, seleccionamos lo mejor.

## 🚀 Inicio Rápido

### 1. Abrir el sitio localmente
```bash
# Opción 1: Doble click en index.html
# Opción 2: Usar Live Server en VS Code
# Opción 3: Python simple server
python -m http.server 8000
```

### 2. Configurar Supabase (cuando estés listo)
1. Crear cuenta en https://supabase.com
2. Crear nuevo proyecto
3. Ejecutar `database-schema.sql` en SQL Editor
4. Copiar URL y anon key
5. Pegar en `data-manager.js`

### 3. Configurar Mercado Pago
1. Crear cuenta en https://www.mercadopago.cl/developers
2. Crear aplicación
3. Obtener Access Token (Sandbox y Producción)
4. Pegar en `mercadopago-integration.js`

## 📁 Estructura del Proyecto

```
Quesos-y-Charcuteria/
├── index.html              # Sitio público
├── admin.html              # Panel de administración
├── styles.css              # Estilos sitio público
├── admin-styles.css        # Estilos panel admin
├── app.js                  # JavaScript sitio público
├── admin.js                # JavaScript panel admin
├── data-manager.js         # Capa de abstracción de datos
├── mercadopago-integration.js  # Integración pagos
├── database-schema.sql     # Schema PostgreSQL
├── README.md               # Este archivo
└── assets/
    ├── images/             # Imágenes de productos
    ├── fonts/              # Fuentes personalizadas
    └── icons/              # Iconos
```

## 🛠️ Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript Vanilla
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Pagos:** Mercado Pago API
- **Hosting:** Hostinger

## 📊 Fases de Implementación

### Fase 1: Desarrollo Local (Actual)
- ✅ Sitio funciona con localStorage
- ✅ Todos los CRUD funcionan (Productos y Productores)
- ✅ Carrito de compras
- ✅ Checkout Page con formulario de envío
- ✅ Integración WhatsApp para pedidos
- ✅ Panel admin completo

### Fase 2: Base de Datos 
- ✅ Crear proyecto Supabase
- ✅ Ejecutar schema SQL mejorado
- ✅ Cambiar `mode: 'supabase'` en data-manager.js
- ✅ Implementación de **Supabase Storage** (Carga real de fotos)
- ✅ Migración de **Suscripciones** a base de datos real
- ✅ Panel de **Configuración** centralizado (RRSS, MP, Parámetros)
- ✅ Autenticación de Admin mediante Supabase Auth
- ✅ Testing con datos reales (CRUD completo)

### Fase 3: Pagos
- [x] Habilitar campos de configuración Mercado Pago en Admin
- [ ] Integración de botón de pago (SDK Mercado Pago)
- [ ] Testing en Sandbox
- [ ] Webhooks para actualización automática de pedidos
- [ ] Producción

### Fase 4: Producción
- [ ] Subir a Hostinger
- [ ] Configurar dominio
- [ ] SSL
- [ ] Lanzamiento

## 🔑 Credenciales (Ejemplo)

Crear archivo `.env` (NO subir a Git):

```
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...

# Mercado Pago
MP_PUBLIC_KEY=TEST-xxxxx
MP_ACCESS_TOKEN=TEST-xxxxx

# Hostinger FTP
FTP_HOST=ftp.cabraycurado.cl
FTP_USER=usuario@cabraycurado.cl
FTP_PASS=xxxxx
```

## 📝 Uso del Panel Admin

1. Abrir `admin.html`
2. Login: Email y contraseña gestionados por **Supabase Auth** (se requiere rol 'admin' en la tabla `usuarios_sistema`).
3. Módulos disponibles:
   - Dashboard
   - Productores (CRUD)
   - Productos (CRUD)
   - Packs de Suscripción
   - Inventario
   - Pedidos
   - Configuración

## 🧪 Testing

### Sitio Público
1. Abrir `index.html`
2. Navegar por secciones
3. Agregar productos al carrito
4. Verificar cálculos de envío
5. Probar checkout (redirige a Mercado Pago)

### Panel Admin
1. Abrir `admin.html`
2. Crear productor nuevo
3. Crear producto nuevo
4. Verificar que aparece en sitio público
5. Ajustar stock
6. Configurar pack de suscripción

## 📦 Productos Incluidos

- 10 quesos artesanales
- 8 embutidos premium
- 6 productores reales chilenos
- 3 packs de suscripción

## 💰 Inversión Inicial

- Hosting Hostinger: ~$95.520 (4 años)
- Supabase Pro: ~$300.000/año
- Stock productos: $500.000 - $1.000.000
- **Total:** ~$895.520 - $1.395.520

## 📞 Soporte

- Email: hola@cabraycurado.cl
- WhatsApp: +569 1234 5678

## 📄 Licencia

Todos los derechos reservados © 2026 CABRA & CURADO
