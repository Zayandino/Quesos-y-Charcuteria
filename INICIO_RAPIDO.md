# 🚀 INICIO RÁPIDO - CABRA & CURADO

## ✅ ARCHIVOS CREADOS

Ya tienes todos los archivos necesarios en `C:\Users\eduar\Quesos-y-Charcuteria\`:

```
✓ index.html          - Sitio público
✓ styles.css          - Estilos
✓ app.js              - JavaScript principal
✓ data-manager.js     - Capa de datos
✓ database-schema.sql - Schema PostgreSQL
✓ README.md           - Documentación
```

## 🎯 PROBAR AHORA MISMO (3 pasos)

### 1. Abrir el sitio
```
Opción A: Doble click en index.html
Opción B: Arrastra index.html a tu navegador
```

### 2. Explorar funcionalidades
- ✅ Ver catálogo de productos
- ✅ Filtrar por quesos/embutidos
- ✅ Agregar productos al carrito
- ✅ Ver carrito y calcular totales
- ✅ Ver productores

### 3. Verificar que funciona
- Abre la consola del navegador (F12)
- Deberías ver: "🧀 CABRA & CURADO iniciando..."
- Los productos se cargan automáticamente

## 📦 PRODUCTOS INCLUIDOS

**10 Quesos:**
- Queso de Cabra Fresco Cremoso ($5.990)
- Queso de Cabra Clásico Maduro ($5.000)
- Feta de Cabra ($5.849)
- Queso de Cabra Untable Natural ($3.790)
- Queso de Cabra Ahumado Finas Hierbas ($3.999)
- Queso de Cabra Maduro Suave Premium ($7.490)
- Queso de Cabra con Merkén ($6.990)
- Queso de Cabra Artesanal Premium 500g ($9.000)
- Queso de Cabra Ahumado 1kg ($8.990)
- Queso de Cabra Edición Limitada ($17.999)

**8 Embutidos:**
- Longaniza Parrillera Artesanal ($4.990)
- Longaniza de Campo Tradicional ($5.500)
- Chorizo Argentino ($5.990)
- Butifarra Premium ($6.490)
- Lomo Kassler Ahumado ($7.990)
- Salame Italiano Artesanal ($8.990)
- Jamón Serrano Artesanal ($8.990)
- Prieta Artesanal Premium ($4.990)

## 🎨 CARACTERÍSTICAS

✅ **Diseño Premium**
- Colores terracota, oliva y crema
- Tipografía elegante (Playfair Display + Outfit)
- Responsive mobile-first

✅ **Funcionalidad Completa**
- Carrito de compras funcional
- Cálculo automático de envío
- Validación de compra mínima ($15.000)
- Envío gratis sobre $50.000
- Filtros de productos

✅ **Datos Persistentes**
- Todo se guarda en localStorage
- No necesitas base de datos para probar
- Los datos persisten al recargar

## 🔧 PRÓXIMOS PASOS

### Cuando quieras conectar a Supabase:

1. **Crear cuenta en Supabase**
   - Ir a https://supabase.com
   - Crear proyecto gratis

2. **Ejecutar SQL**
   - Copiar todo el contenido de `database-schema.sql`
   - Pegar en Supabase SQL Editor
   - Ejecutar

3. **Configurar credenciales**
   - Abrir `data-manager.js`
   - Cambiar líneas 7-8:
   ```javascript
   const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
   const SUPABASE_ANON_KEY = 'tu-key-aqui';
   ```
   - Cambiar línea 12:
   ```javascript
   mode: 'supabase',  // Cambiar de 'local' a 'supabase'
   ```

4. **Recargar sitio**
   - Ahora usa base de datos real
   - Los datos se sincronizan en la nube

### Cuando quieras integrar Mercado Pago:

1. Ver archivo `walkthrough.md` sección "PASO 5"
2. Crear cuenta en Mercado Pago Developers
3. Obtener credenciales
4. Configurar en el código

## 🐛 SOLUCIÓN DE PROBLEMAS

### Productos no se cargan
- Abre consola (F12)
- Limpia localStorage: `localStorage.clear()`
- Recarga página

### Carrito no funciona
- Verifica que `data-manager.js` y `app.js` estén cargados
- Revisa consola por errores

### Estilos no se ven
- Verifica que `styles.css` esté en la misma carpeta
- Recarga con Ctrl+F5 (forzar recarga)

## 📚 DOCUMENTACIÓN COMPLETA

- **walkthrough.md** - Guía paso a paso completa
- **implementation_plan.md** - Plan de 8 semanas
- **platform_analysis.md** - Análisis de plataformas
- **product_catalog.md** - Catálogo detallado

## 🎉 ¡LISTO!

Tu e-commerce está funcionando. Abre `index.html` y empieza a explorar.

**Próximos pasos sugeridos:**
1. ✅ Probar todas las funcionalidades
2. ✅ Personalizar colores/textos
3. ✅ Agregar tus propios productos
4. ✅ Conectar a Supabase
5. ✅ Integrar Mercado Pago
6. ✅ Subir a Hostinger

---

**¿Necesitas ayuda?**
Revisa los archivos de documentación o la consola del navegador para ver mensajes de error.

¡Éxito con CABRA & CURADO! 🧀🥓
