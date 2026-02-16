# 🗄️ GUÍA COMPLETA DE SUPABASE - CABRA & CURADO

Esta guía te llevará paso a paso para configurar Supabase como tu base de datos en la nube.

---

## 📋 ¿QUÉ ES SUPABASE?

Supabase es una alternativa open-source a Firebase que te da:
- ✅ Base de datos PostgreSQL completa
- ✅ API REST automática
- ✅ Autenticación de usuarios
- ✅ Almacenamiento de archivos
- ✅ Row Level Security (RLS)
- ✅ Realtime subscriptions

**Plan Gratis incluye:**
- 500 MB de base de datos
- 1 GB de almacenamiento
- 2 GB de transferencia
- Perfecto para empezar

---

## 🚀 PASO 1: CREAR CUENTA

### 1.1 Registrarse

1. Ir a https://supabase.com
2. Click en **"Start your project"**
3. Opciones de registro:
   - **GitHub** (recomendado - más rápido)
   - **Google**
   - **Email**

### 1.2 Verificar Email

Si usaste email:
1. Revisa tu bandeja de entrada
2. Click en el link de verificación
3. Completa tu perfil

---

## 🏗️ PASO 2: CREAR PROYECTO

### 2.1 Nuevo Proyecto

1. En el dashboard, click **"New Project"**
2. Completa el formulario:

```
Organization: [Tu nombre o empresa]
Project Name: cabra-curado-prod
Database Password: [IMPORTANTE: Guarda esto en lugar seguro]
Region: South America (São Paulo) - Más cercano a Chile
Pricing Plan: Free (para empezar)
```

3. Click **"Create new project"**
4. **Espera 2-3 minutos** mientras se crea el proyecto

### 2.2 Guardar Credenciales

Una vez creado el proyecto:

1. Ir a **Settings** (⚙️ en menú lateral)
2. Click en **API**
3. **COPIAR Y GUARDAR** estos datos:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **MUY IMPORTANTE:** Guarda estos datos en un lugar seguro. Los necesitarás después.

---

## 📊 PASO 3: CREAR TABLAS (EJECUTAR SQL)

### 3.1 Abrir SQL Editor

1. En el menú lateral, click **"SQL Editor"**
2. Click **"New query"**

### 3.2 Copiar el Schema

1. Abre el archivo `database-schema.sql` de tu proyecto
2. **Selecciona TODO el contenido** (Ctrl+A)
3. **Copia** (Ctrl+C)

### 3.3 Ejecutar SQL

1. **Pega** el contenido en el SQL Editor de Supabase (Ctrl+V)
2. Click en **"Run"** (o F5)
3. Espera a que termine (debería decir "Success")

### 3.4 Verificar Tablas

1. En el menú lateral, click **"Table Editor"**
2. Deberías ver todas las tablas:
   - ✅ usuarios_sistema
   - ✅ productores
   - ✅ productos
   - ✅ packs_suscripcion
   - ✅ clientes
   - ✅ suscripciones
   - ✅ pedidos
   - ✅ pedido_items
   - ✅ inventario_movimientos
   - ✅ cupones
   - ✅ configuracion
   - ✅ logs_actividad

---

## 🔧 PASO 4: CONFIGURAR EL CÓDIGO

### 4.1 Abrir data-manager.js

1. Abre el archivo `data-manager.js` en tu editor
2. Busca las líneas 7-8 (al inicio del archivo)

### 4.2 Pegar Credenciales

Reemplaza esto:

```javascript
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';
```

Por tus credenciales reales:

```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co'; // Tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Tu key
```

### 4.3 Cambiar Modo

Busca la línea 12:

```javascript
mode: 'local',
```

Cámbiala a:

```javascript
mode: 'supabase',
```

### 4.4 Guardar Archivo

- Guarda el archivo (Ctrl+S)

---

## 📦 PASO 5: AGREGAR LIBRERÍA SUPABASE

### 5.1 Abrir index.html

1. Abre `index.html`
2. Busca la línea `<link rel="stylesheet" href="styles.css">`

### 5.2 Agregar Script de Supabase

**ANTES** de la línea `<script src="data-manager.js"></script>`, agrega:

```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Debería quedar así:

```html
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    ...
    
    <!-- Al final, antes de cerrar </body> -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="data-manager.js"></script>
    <script src="app.js"></script>
</body>
</html>
```

### 5.3 Guardar

- Guarda el archivo (Ctrl+S)

---

## ✅ PASO 6: PROBAR LA CONEXIÓN

### 6.1 Abrir el Sitio

1. Abre `index.html` en tu navegador
2. Abre la **Consola del Navegador** (F12)

### 6.2 Verificar Mensajes

Deberías ver:

```
✅ Supabase inicializado
📊 DataManager inicializado en modo: supabase
🧀 CABRA & CURADO iniciando...
📦 Cargando productos de ejemplo...
✅ Productos de ejemplo cargados
✅ Sitio cargado correctamente
```

### 6.3 Verificar en Supabase

1. Vuelve a Supabase
2. Click en **"Table Editor"**
3. Click en tabla **"productos"**
4. Deberías ver **18 productos** cargados

---

## 🎯 PASO 7: VERIFICAR QUE FUNCIONA

### 7.1 Sitio Público

1. Navega por el sitio
2. Los productos deberían cargarse
3. Agrega productos al carrito
4. Todo debería funcionar igual que antes

### 7.2 Verificar Base de Datos

En Supabase:

1. **Tabla productores**: Debería tener 6 productores
2. **Tabla productos**: Debería tener 18 productos
3. **Tabla configuracion**: Debería tener configuraciones iniciales

### 7.3 Probar CRUD

1. En Supabase, click en tabla **"productos"**
2. Click en un producto
3. Cambia el **precio_venta**
4. Guarda
5. Recarga tu sitio web
6. El precio debería actualizarse ✅

---

## 🔒 PASO 8: SEGURIDAD (ROW LEVEL SECURITY)

### 8.1 Verificar RLS

Las políticas de seguridad ya están configuradas en el SQL que ejecutaste.

Para verificar:

1. En Supabase, ir a **Authentication** > **Policies**
2. Deberías ver políticas para cada tabla

### 8.2 Políticas Activas

**Productos:**
- ✅ Público puede ver productos activos y visibles
- ✅ Solo admins pueden crear/editar/eliminar

**Productores:**
- ✅ Público puede ver productores activos
- ✅ Solo admins pueden gestionar

**Pedidos:**
- ✅ Clientes solo ven sus propios pedidos
- ✅ Admins ven todos los pedidos

---

## 📈 PASO 9: MONITOREO

### 9.1 Dashboard de Supabase

En el dashboard principal verás:

- **Database Size**: Espacio usado
- **API Requests**: Llamadas a la API
- **Bandwidth**: Transferencia de datos
- **Active Users**: Usuarios conectados

### 9.2 Logs

1. Click en **"Logs"** en menú lateral
2. Puedes ver:
   - Queries ejecutadas
   - Errores
   - Tiempos de respuesta

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Problema 1: "Supabase is not defined"

**Solución:**
1. Verifica que agregaste el script de Supabase en `index.html`
2. Debe estar ANTES de `data-manager.js`
3. Recarga con Ctrl+F5

### Problema 2: Productos no se cargan

**Solución:**
1. Abre consola (F12)
2. Busca errores en rojo
3. Verifica credenciales en `data-manager.js`
4. Verifica que `mode: 'supabase'`

### Problema 3: "Invalid API key"

**Solución:**
1. Vuelve a Supabase > Settings > API
2. Copia nuevamente la **anon public key**
3. Pégala en `data-manager.js`
4. Asegúrate de copiar la key completa

### Problema 4: Tablas no existen

**Solución:**
1. Vuelve a SQL Editor
2. Ejecuta nuevamente `database-schema.sql`
3. Verifica en Table Editor que se crearon

---

## 💰 PASO 10: PLANES Y COSTOS

### Plan Free (Actual)

```
✅ 500 MB base de datos
✅ 1 GB almacenamiento
✅ 2 GB transferencia/mes
✅ Perfecto para testing y primeros clientes
```

### Cuándo Actualizar a Pro ($25 USD/mes)

Actualiza cuando:
- Tengas más de 100 pedidos/mes
- Necesites más de 500 MB de datos
- Quieras soporte prioritario
- Necesites backups automáticos

### Plan Pro Incluye

```
✅ 8 GB base de datos
✅ 100 GB almacenamiento
✅ 250 GB transferencia
✅ Backups diarios
✅ Soporte prioritario
```

---

## 🎓 PASO 11: PRÓXIMOS PASOS

### 11.1 Panel Admin

El panel admin (`admin.html`) también funciona con Supabase automáticamente.

1. Abre `admin.html`
2. Password: `admin123`
3. Puedes crear/editar productos
4. Los cambios se guardan en Supabase

### 11.2 Autenticación Real

Para producción, implementa Supabase Auth:

1. En Supabase, ir a **Authentication**
2. Configurar proveedores (Email, Google, etc.)
3. Actualizar `admin.js` para usar Supabase Auth

### 11.3 Almacenamiento de Imágenes

Para subir fotos de productos:

1. En Supabase, ir a **Storage**
2. Crear bucket "productos"
3. Configurar políticas de acceso
4. Usar Supabase Storage API

---

## 📚 RECURSOS ADICIONALES

### Documentación Oficial

- **Supabase Docs**: https://supabase.com/docs
- **JavaScript Client**: https://supabase.com/docs/reference/javascript
- **SQL Reference**: https://supabase.com/docs/guides/database

### Tutoriales

- **Getting Started**: https://supabase.com/docs/guides/getting-started
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security
- **Realtime**: https://supabase.com/docs/guides/realtime

### Comunidad

- **Discord**: https://discord.supabase.com
- **GitHub**: https://github.com/supabase/supabase
- **Twitter**: @supabase

---

## ✅ CHECKLIST FINAL

Antes de ir a producción, verifica:

```
□ Supabase proyecto creado
□ Credenciales guardadas en lugar seguro
□ SQL schema ejecutado correctamente
□ Todas las tablas creadas (12 tablas)
□ Credenciales en data-manager.js actualizadas
□ Mode cambiado a 'supabase'
□ Script de Supabase agregado a index.html
□ Sitio funciona correctamente
□ Productos se cargan desde Supabase
□ Panel admin funciona
□ RLS policies activas
□ Datos de prueba cargados
```

---

## 🎉 ¡LISTO!

Tu e-commerce ahora usa Supabase como base de datos en la nube.

**Ventajas:**
- ✅ Datos persistentes (no se borran al limpiar navegador)
- ✅ Accesibles desde cualquier dispositivo
- ✅ Backups automáticos
- ✅ Escalable
- ✅ Seguro (RLS)
- ✅ API REST automática

**Próximo paso:**
Integrar Mercado Pago para procesar pagos reales.

---

**¿Necesitas ayuda?**

1. Revisa la sección "Solución de Problemas"
2. Consulta la documentación de Supabase
3. Revisa la consola del navegador (F12)

¡Éxito con CABRA & CURADO! 🧀🥓
