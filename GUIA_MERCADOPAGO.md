# 💳 GUÍA DE INTEGRACIÓN MERCADO PAGO - CABRA & CURADO

Esta guía te permitirá recibir pagos reales con tarjetas de crédito, débito y transferencias en Chile.

---

## 🚀 PASO 1: CREAR CUENTA

1. Ir a [Mercado Pago Chile](https://www.mercadopago.cl)
2. **Crear una cuenta de empresa** o usar tu cuenta personal existente.
3. Verificar tu identidad (subir carnet/RUT empresa).

---

## 🔑 PASO 2: OBTENER CREDENCIALES (API KEYS)

Para conectar tu sitio web, necesitas dos llaves especiales.

1. Ir a [Tus Credenciales](https://www.mercadopago.cl/developers/panel/credentials)
2. Posiblemente te pida crear una "Aplicación".
   - Nombre: `Cabra y Curado Web`
   - Tipo: `Checkout transparente` o `Checkout Pro`
   - Plataforma: `Otras` > `Sitio propio`
3. Una vez creada, verás dos tipos de credenciales:
   - **Modo Sandbox (Pruebas):** Para hacer compras falsas y verificar que todo funciona.
   - **Modo Producción (Real):** Para recibir dinero de verdad.

**Copia estos datos:**
- `Public Key` (ej: `TEST-860...` o `APP_USR-860...`)
- `Access Token` (ej: `TEST-642...` o `APP_USR-642...`)

---

## 💻 PASO 3: INSTALAR SDK EN TU PROYECTO

Ya he preparado el terreno. Solo necesitas agregar el script oficial en `index.html`.

**Abrir `index.html` y pegar esto antes de cerrar `</body>`:**

```html
<script src="https://sdk.mercadopago.com/js/v2"></script>
```

---

## ⚙️ PASO 4: CONFIGURAR EL BOTÓN DE PAGO

En `app.js`, busca la función `checkout()`. Actualmente solo muestra una alerta. Vamos a cambiarla por la integración real.

**Reemplaza la función `checkout()` actual con este código:**

```javascript
/* ===== INTEGRACIÓN MERCADO PAGO ===== */
const mp = new MercadoPago('TU_PUBLIC_KEY', {
  locale: 'es-CL'
});

async function checkout() {
  const subtotal = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
  
  if (subtotal < 15000) {
    alert('⚠️ Pedido mínimo: $15.000');
    return;
  }

  // 1. Crear preferencia de pago (Petición al Backend)
  // Nota: Por seguridad, esto debería hacerse en una Edge Function de Supabase.
  // Para este MVP frontend-only, simularemos el proceso o usaremos un link de pago directo si prefieres no programar backend.
  
  // OPCIÓN A (Link de Pago Simple - Sin Backend):
  // Crea links de pago en tu panel de Mercado Pago por montos fijos ($20k, $30k, etc) o usa un link genérico.
  window.open('https://link.mercadopago.cl/cabraycurado', '_blank');
  
  /* 
  // OPCIÓN B (Profesional - Con Backend Supabase Functions):
  try {
    const orderData = {
      items: cart.map(item => ({
        title: item.nombre,
        description: item.categoria,
        quantity: item.quantity,
        currency_id: 'CLP',
        unit_price: item.precio
      }))
    };

    const response = await fetch('/api/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    const preference = await response.json();
    
    // Abrir Checkout
    mp.checkout({
      preference: {
        id: preference.id
      },
      autoOpen: true
    });
  } catch (error) {
    console.error(error);
    alert('Error al iniciar el pago');
  }
  */
}
```

---

## 🔒 PASO 5: SEGURIDAD (IMPORTANTE)

Para evitar que alguien manipule los precios desde el navegador (Frontend), **Mercado Pago EXIGE que la creación del pago ("Preferencia") se haga desde un servidor.**

**Como usas Supabase, la solución es usar "Supabase Edge Functions".**

### ¿Cómo hacerlo? (Nivel Intermedio)

1. Instalar CLI de Supabase.
2. Crear una función: `supabase functions new mercado-pago`
3. Pegar el código de servidor (Node.js) que recibe el carrito y habla con Mercado Pago.
4. Desplegar: `supabase functions deploy mercado-pago`

**Si esto es muy complejo por ahora:**
Usa la **Opción A (Link de Pago)**. Genera un link de pago abierto en tu cuenta de Mercado Pago y ponlo en el botón. El cliente ingresará el monto total manualmente. Es menos automático, pero funciona inmediatamente sin código de servidor.

---

## ✅ CHECKLIST FINAL

1. Cuenta Mercado Pago validada (identidad verificada).
2. Credenciales de Producción obtenidas.
3. Script SDK agregado en `index.html`.
4. Decisión tomada: ¿Link simple o Integración API completa?

¡Listo para vender! 💸
