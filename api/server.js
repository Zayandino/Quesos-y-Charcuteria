import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración Supabase (Servidor / Service Role)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://api.cohablosandes.cloud';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQyMjA4NDksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.OM8ePDG-yZwyT-vcGxB2ECMsHngThAEELd0tq7TY7eg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuración Mercado Pago
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'TEST-496f1c34-2801-4f8d-bca1-05c2e7788488';
const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'production-ready' });
});

// Endpoint: Crear Preferencia de Mercado Pago (Validación Server-Side)
app.post('/api/create-preference', async (req, res) => {
    try {
        const { items, customer, back_urls } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'El carrito no contiene productos válidos.' });
        }
        if (!customer || !customer.email || !customer.nombre) {
            return res.status(400).json({ error: 'Datos de cliente incompletos.' });
        }

        // 1. Obtener IDs de los productos requeridos
        const productIds = items.map(item => item.id);
        const { data: dbProducts, error: dbError } = await supabase
            .from('dcava_productos')
            .select('*')
            .in('id', productIds);

        if (dbError || !dbProducts) {
            console.error('Error obteniendo productos de Supabase:', dbError);
            return res.status(500).json({ error: 'Error al consultar catálogo en base de datos.' });
        }

        // 2. Validar precios y stock en servidor
        let calculatedSubtotal = 0;
        const mpItems = [];
        const orderItemsToInsert = [];
        const stockErrors = [];

        for (const reqItem of items) {
            const prod = dbProducts.find(p => p.id === reqItem.id);
            if (!prod || !prod.activo || !prod.visible_tienda) {
                stockErrors.push(`El producto ID ${reqItem.id} ya no está disponible.`);
                continue;
            }

            if (prod.stock < reqItem.quantity) {
                stockErrors.push(`El producto "${prod.nombre}" no cuenta con stock suficiente (Stock: ${prod.stock}, Solicitado: ${reqItem.quantity}).`);
                continue;
            }

            const realPrice = prod.precio_venta;
            const itemSubtotal = realPrice * reqItem.quantity;
            calculatedSubtotal += itemSubtotal;

            mpItems.push({
                id: String(prod.id),
                title: prod.nombre,
                description: prod.descripcion || `Quesos & Charcutería - ${prod.nombre}`,
                quantity: Number(reqItem.quantity),
                unit_price: Number(realPrice),
                currency_id: 'CLP'
            });

            orderItemsToInsert.push({
                producto_id: prod.id,
                producto_nombre: prod.nombre,
                cantidad: reqItem.quantity,
                precio_unitario: realPrice,
                subtotal: itemSubtotal
            });
        }

        if (stockErrors.length > 0) {
            return res.status(400).json({ error: 'Errores de validación de catálogo/stock', details: stockErrors });
        }

        // 3. Calcular Costo de Envío en Servidor
        let shippingCost = 0;
        if (calculatedSubtotal < 50000) {
            shippingCost = customer.comuna === 'Otro' ? 7000 : 5000;
        }

        const grandTotal = calculatedSubtotal + shippingCost;

        if (shippingCost > 0) {
            mpItems.push({
                id: 'shipping',
                title: 'Costo de Envío',
                quantity: 1,
                unit_price: Number(shippingCost),
                currency_id: 'CLP'
            });
        }

        // 4. Crear/Obtener Cliente en Supabase
        let clienteId = null;
        const { data: existingClient } = await supabase
            .from('dcava_clientes')
            .select('id')
            .eq('email', customer.email)
            .maybeSingle();

        if (existingClient) {
            clienteId = existingClient.id;
        } else {
            const { data: newClient } = await supabase
                .from('dcava_clientes')
                .insert([{
                    email: customer.email,
                    nombre: customer.nombre,
                    telefono: customer.telefono || '',
                    direccion: customer.direccion || '',
                    comuna: customer.comuna || ''
                }])
                .select('id')
                .single();
            if (newClient) clienteId = newClient.id;
        }

        // 5. Registrar Pedido Pendiente en BD
        const numeroPedido = 'DC-' + Math.floor(100000 + Math.random() * 900000);
        const { data: order, error: orderError } = await supabase
            .from('dcava_pedidos')
            .insert([{
                numero_pedido: numeroPedido,
                cliente_id: clienteId,
                subtotal: calculatedSubtotal,
                costo_envio: shippingCost,
                total: grandTotal,
                direccion_envio: customer.direccion,
                comuna: customer.comuna,
                estado: 'pendiente',
                estado_pago: 'pendiente'
            }])
            .select()
            .single();

        if (orderError || !order) {
            console.error('Error al crear pedido en BD:', orderError);
            return res.status(500).json({ error: 'Error al registrar pedido en servidor.' });
        }

        // Asociar items al pedido
        const finalItemsToInsert = orderItemsToInsert.map(item => ({
            ...item,
            pedido_id: order.id
        }));
        await supabase.from('dcava_pedido_items').insert(finalItemsToInsert);

        // 6. Crear Preferencia en Mercado Pago
        const hostUrl = req.headers.origin || req.headers.referer || 'http://localhost:8080';
        const notificationUrl = process.env.NOTIFICATION_URL || `${hostUrl}/api/webhooks/mercadopago`;

        const preferenceBody = {
            items: mpItems,
            payer: {
                name: customer.nombre,
                email: customer.email,
                phone: {
                    number: customer.telefono || ''
                }
            },
            external_reference: String(order.id),
            notification_url: notificationUrl,
            back_urls: back_urls || {
                success: `${hostUrl}/checkout.html?status=success&order_id=${order.id}`,
                pending: `${hostUrl}/checkout.html?status=pending&order_id=${order.id}`,
                failure: `${hostUrl}/checkout.html?status=failure&order_id=${order.id}`
            },
            auto_return: 'approved'
        };

        const mpPreference = await preferenceClient.create({ body: preferenceBody });

        // Guardar preference_id en la orden
        await supabase
            .from('dcava_pedidos')
            .update({ mercadopago_preference_id: mpPreference.id })
            .eq('id', order.id);

        res.json({
            success: true,
            preference_id: mpPreference.id,
            init_point: mpPreference.init_point,
            sandbox_init_point: mpPreference.sandbox_init_point,
            order_id: order.id,
            numero_pedido: numeroPedido,
            total: grandTotal
        });

    } catch (err) {
        console.error('Error interno al crear preferencia MP:', err);
        res.status(500).json({ error: 'Error del servidor procesando checkout.', message: err.message });
    }
});

// Endpoint: Webhook de Mercado Pago (IPN / Payments Notification)
app.post('/api/webhooks/mercadopago', async (req, res) => {
    try {
        const topic = req.query.topic || req.query.type || req.body?.type || req.body?.topic;
        const paymentId = req.query.id || req.body?.data?.id || req.body?.id;

        console.log(`📡 Webhook Mercado Pago recibido. Topic: ${topic}, PaymentID: ${paymentId}`);

        if ((topic === 'payment' || req.body?.action?.includes('payment')) && paymentId) {
            // Consultar el pago directamente a la API de Mercado Pago (Verificación Segura)
            const mpPayment = await paymentClient.get({ id: paymentId });

            if (mpPayment && mpPayment.status === 'approved') {
                const orderId = mpPayment.external_reference;
                console.log(`✅ Pago aprobado en Mercado Pago para pedido ID: ${orderId}`);

                if (orderId) {
                    // Obtener pedido actual
                    const { data: order } = await supabase
                        .from('dcava_pedidos')
                        .select('*, dcava_pedido_items(*)')
                        .eq('id', orderId)
                        .single();

                    if (order && order.estado_pago !== 'pagado') {
                        // 1. Actualizar estado del pedido a pagado
                        await supabase
                            .from('dcava_pedidos')
                            .update({
                                estado: 'preparando',
                                estado_pago: 'pagado',
                                mercadopago_payment_id: String(paymentId),
                                fecha_pago: new Date().toISOString()
                            })
                            .eq('id', orderId);

                        // 2. Descontar stock de productos
                        if (order.dcava_pedido_items && order.dcava_pedido_items.length > 0) {
                            for (const item of order.dcava_pedido_items) {
                                const { data: prod } = await supabase
                                    .from('dcava_productos')
                                    .select('stock')
                                    .eq('id', item.producto_id)
                                    .single();

                                if (prod) {
                                    const nuevoStock = Math.max(0, prod.stock - item.cantidad);
                                    await supabase
                                        .from('dcava_productos')
                                        .update({ stock: nuevoStock })
                                        .eq('id', item.producto_id);

                                    // Registrar movimiento en historial
                                    await supabase.from('dcava_inventario_movimientos').insert([{
                                        producto_id: item.producto_id,
                                        tipo: 'salida',
                                        cantidad: item.cantidad,
                                        stock_anterior: prod.stock,
                                        stock_nuevo: nuevoStock,
                                        motivo: `Venta Web Mercado Pago #${order.numero_pedido}`,
                                        pedido_id: order.id
                                    }]);
                                }
                            }
                        }

                        // 3. Registrar Log de Actividad
                        await supabase.from('dcava_logs_actividad').insert([{
                            accion: 'PAGO_CONFIRMADO_MERCADOPAGO',
                            tabla: 'dcava_pedidos',
                            registro_id: Number(orderId),
                            detalles: { payment_id: paymentId, total: mpPayment.transaction_amount }
                        }]);
                    }
                }
            }
        }

        // Siempre responder HTTP 200 / 201 a Mercado Pago para confirmar recepción
        res.status(200).send('OK');
    } catch (err) {
        console.error('Error procesando Webhook de Mercado Pago:', err);
        // Responder 200 de todos modos para prevenir reintentos infinitos si fue error de consulta
        res.status(200).send('OK with error handled');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 DCAVA Backend API corriendo en puerto ${PORT}`);
});
