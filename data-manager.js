/* ========================================
   CABRA & CURADO - DATA MANAGER
   Capa de abstracción de datos
   Soporta: localStorage y Supabase
   ======================================== */

// ===== CONFIGURACIÓN =====
// Las claves se cargan desde config.js (archivo no rastreado por Git)
const SUPABASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_URL : '';
const SUPABASE_ANON_KEY = typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_ANON_KEY : '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: No se han encontrado las credenciales de Supabase en config.js');
}

// ===== DATA MANAGER =====
const DataManager = {
    // Modo: 'local' para localStorage, 'supabase' para producción
    mode: 'supabase',

    supabase: null,

    // Inicializar Supabase
    initSupabase() {
        if (this.mode === 'supabase' && typeof supabase !== 'undefined') {
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase inicializado');
        }
    },

    // ===== AUTENTICACIÓN =====
    async signUp(email, password, metadata) {
        if (this.mode === 'supabase') {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });
            if (error) throw error;
            return data;
        } else {
            return { user: { email, user_metadata: metadata } };
        }
    },

    async signIn(email, password) {
        if (this.mode === 'supabase') {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return data;
        } else {
            if (password === 'admin123') {
                return { user: { email, role: 'admin' } };
            }
            return { user: { email } };
        }
    },

    async signOut() {
        if (this.mode === 'supabase') {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
        }
        sessionStorage.removeItem('admin_authenticated');
    },

    async getCurrentUser() {
        if (this.mode === 'supabase') {
            const { data: { user } } = await this.supabase.auth.getUser();
            return user;
        }
        return null;
    },


    // ===== PRODUCTORES =====
    async getProductores(filters = {}) {
        if (this.mode === 'local') {
            let productores = JSON.parse(localStorage.getItem('productores') || '[]');

            // Aplicar filtros
            if (filters.activo !== undefined) {
                productores = productores.filter(p => p.activo === filters.activo);
            }

            return productores;
        } else {
            // Supabase
            let query = this.supabase.from('productores').select('*');

            if (filters.activo !== undefined) {
                query = query.eq('activo', filters.activo);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        }
    },

    async createProductor(data) {
        if (this.mode === 'local') {
            const productores = JSON.parse(localStorage.getItem('productores') || '[]');
            const newProductor = {
                id: productores.length > 0 ? Math.max(...productores.map(p => p.id)) + 1 : 1,
                ...data,
                created_at: new Date().toISOString()
            };
            productores.push(newProductor);
            localStorage.setItem('productores', JSON.stringify(productores));
            return newProductor;
        } else {
            const { data: result, error } = await this.supabase
                .from('productores')
                .insert([data])
                .select();
            if (error) throw error;
            return result[0];
        }
    },

    async updateProductor(id, data) {
        if (this.mode === 'local') {
            const productores = JSON.parse(localStorage.getItem('productores') || '[]');
            const index = productores.findIndex(p => p.id === id);
            if (index !== -1) {
                productores[index] = { ...productores[index], ...data, updated_at: new Date().toISOString() };
                localStorage.setItem('productores', JSON.stringify(productores));
                return productores[index];
            }
            return null;
        } else {
            const { data: result, error } = await this.supabase
                .from('productores')
                .update(data)
                .eq('id', id)
                .select();
            if (error) throw error;
            return result[0];
        }
    },

    async deleteProductor(id) {
        if (this.mode === 'local') {
            let productores = JSON.parse(localStorage.getItem('productores') || '[]');
            productores = productores.filter(p => p.id !== id);
            localStorage.setItem('productores', JSON.stringify(productores));
            return true;
        } else {
            const { error } = await this.supabase
                .from('productores')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        }
    },

    async getProductoById(id) {
        if (this.mode === 'local') {
            const productos = JSON.parse(localStorage.getItem('productos') || '[]');
            return productos.find(p => p.id === id);
        } else {
            const { data, error } = await this.supabase
                .from('productos')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        }
    },

    // ===== PRODUCTOS =====
    async getProductos(filters = {}) {
        if (this.mode === 'local') {
            let productos = JSON.parse(localStorage.getItem('productos') || '[]');
            const productores = JSON.parse(localStorage.getItem('productores') || '[]');

            // Enriquecer con nombre del productor
            productos = productos.map(p => {
                const productor = productores.find(prod => prod.id === p.productor_id);
                return {
                    ...p,
                    productor_nombre: productor ? productor.nombre : 'Desconocido'
                };
            });

            // Aplicar filtros
            if (filters.categoria) {
                productos = productos.filter(p => p.categoria === filters.categoria);
            }
            if (filters.activo !== undefined) {
                productos = productos.filter(p => p.activo === filters.activo);
            }
            if (filters.visible_tienda !== undefined) {
                productos = productos.filter(p => p.visible_tienda === filters.visible_tienda);
            }
            if (filters.productor_id) {
                productos = productos.filter(p => p.productor_id === filters.productor_id);
            }

            return productos;
        } else {
            let query = this.supabase
                .from('productos')
                .select(`
          *,
          productores (
            nombre
          )
        `);

            if (filters.categoria) {
                query = query.eq('categoria', filters.categoria);
            }
            if (filters.activo !== undefined) {
                query = query.eq('activo', filters.activo);
            }
            if (filters.visible_tienda !== undefined) {
                query = query.eq('visible_tienda', filters.visible_tienda);
            }
            if (filters.productor_id) {
                query = query.eq('productor_id', filters.productor_id);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Aplanar estructura
            return data.map(p => ({
                ...p,
                productor_nombre: p.productores?.nombre || 'Desconocido'
            }));
        }
    },

    async createProducto(data) {
        if (this.mode === 'local') {
            const productos = JSON.parse(localStorage.getItem('productos') || '[]');
            const newProducto = {
                id: productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1,
                ...data,
                created_at: new Date().toISOString()
            };
            productos.push(newProducto);
            localStorage.setItem('productos', JSON.stringify(productos));
            return newProducto;
        } else {
            const { data: result, error } = await this.supabase
                .from('productos')
                .insert([data])
                .select();
            if (error) throw error;
            return result[0];
        }
    },

    async updateProducto(id, data) {
        if (this.mode === 'local') {
            const productos = JSON.parse(localStorage.getItem('productos') || '[]');
            const index = productos.findIndex(p => p.id === id);
            if (index !== -1) {
                productos[index] = { ...productos[index], ...data, updated_at: new Date().toISOString() };
                localStorage.setItem('productos', JSON.stringify(productos));
                return productos[index];
            }
            return null;
        } else {
            const { data: result, error } = await this.supabase
                .from('productos')
                .update(data)
                .eq('id', id)
                .select();
            if (error) throw error;
            return result[0];
        }
    },

    async deleteProducto(id) {
        if (this.mode === 'local') {
            let productos = JSON.parse(localStorage.getItem('productos') || '[]');
            productos = productos.filter(p => p.id !== id);
            localStorage.setItem('productos', JSON.stringify(productos));
            return true;
        } else {
            const { error } = await this.supabase
                .from('productos')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        }
    },

    // ===== PACKS DE SUSCRIPCIÓN =====
    async getPacks(filters = {}) {
        if (this.mode === 'local') {
            let packs = JSON.parse(localStorage.getItem('packs_suscripcion') || '[]');

            if (filters.activo !== undefined) {
                packs = packs.filter(p => p.activo === filters.activo);
            }

            return packs;
        } else {
            let query = this.supabase.from('packs_suscripcion').select('*');

            if (filters.activo !== undefined) {
                query = query.eq('activo', filters.activo);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        }
    },

    async createPack(data) {
        if (this.mode === 'local') {
            const packs = JSON.parse(localStorage.getItem('packs_suscripcion') || '[]');
            const newPack = {
                id: packs.length > 0 ? Math.max(...packs.map(p => p.id)) + 1 : 1,
                ...data,
                created_at: new Date().toISOString()
            };
            packs.push(newPack);
            localStorage.setItem('packs_suscripcion', JSON.stringify(packs));
            return newPack;
        } else {
            const { data: result, error } = await this.supabase
                .from('packs_suscripcion')
                .insert([data])
                .select();
            if (error) throw error;
            return result[0];
        }
    },

    async updatePack(id, data) {
        if (this.mode === 'local') {
            const packs = JSON.parse(localStorage.getItem('packs_suscripcion') || '[]');
            const index = packs.findIndex(p => p.id === id);
            if (index !== -1) {
                packs[index] = { ...packs[index], ...data, updated_at: new Date().toISOString() };
                localStorage.setItem('packs_suscripcion', JSON.stringify(packs));
                return packs[index];
            }
            return null;
        } else {
            const { data: result, error } = await this.supabase
                .from('packs_suscripcion')
                .update(data)
                .eq('id', id)
                .select();
            if (error) throw error;
            return result[0];
        }
    },

    async deletePack(id) {
        if (this.mode === 'local') {
            let packs = JSON.parse(localStorage.getItem('packs_suscripcion') || '[]');
            packs = packs.filter(p => p.id !== id);
            localStorage.setItem('packs_suscripcion', JSON.stringify(packs));
            return true;
        } else {
            const { error } = await this.supabase
                .from('packs_suscripcion')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        }
    },

    // ===== CONFIGURACIÓN =====
    async getConfig(key) {
        if (this.mode === 'local') {
            const config = JSON.parse(localStorage.getItem('config') || '{}');
            return config[key];
        } else {
            const { data, error } = await this.supabase
                .from('configuracion')
                .select('valor')
                .eq('clave', key)
                .single();
            if (error) throw error;
            return data?.valor;
        }
    },

    async setConfig(key, value) {
        if (this.mode === 'local') {
            const config = JSON.parse(localStorage.getItem('config') || '{}');
            config[key] = value;
            localStorage.setItem('config', JSON.stringify(config));
            return true;
        } else {
            console.log(`📡 Intentando guardar config: ${key}...`);

            // 1. Intentar actualizar el registro existente
            const { data, error: updateError } = await this.supabase
                .from('configuracion')
                .update({ valor: value, updated_at: new Date().toISOString() })
                .eq('clave', key)
                .select();

            // 2. Si no se actualizó nada (o no existía), insertarlo
            if (updateError || !data || data.length === 0) {
                console.log(`📝 No existe '${key}', creando nuevo registro...`);
                const { error: insertError } = await this.supabase
                    .from('configuracion')
                    .insert([{ clave: key, valor: value }]);

                if (insertError) {
                    console.error(`❌ Error final al insertar ${key}:`, insertError);
                    throw insertError;
                }
            }
            return true;
        }
    },

    // ===== STORAGE (IMÁGENES) =====
    async uploadImagen(file) {
        if (this.mode === 'local') return 'https://via.placeholder.com/400';

        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await this.supabase.storage
            .from('productos')
            .upload(fileName, file);

        if (error) throw error;

        // Obtener URL pública
        const { data: publicURL } = this.supabase.storage
            .from('productos')
            .getPublicUrl(fileName);

        return publicURL.publicUrl;
    },

    // ===== SUSCRIPTORES =====
    async getSubscribers() {
        if (this.mode === 'local') {
            return JSON.parse(localStorage.getItem('subscribers') || '[]');
        } else {
            const { data, error } = await this.supabase
                .from('suscripciones')
                .select(`
                    *,
                    clientes (nombre, email),
                    packs_suscripcion (nombre)
                `);
            if (error) throw error;
            return data.map(s => ({
                id: s.id,
                nombre: s.clientes?.nombre || 'Desconocido',
                email: s.clientes?.email || 'N/A',
                plan: s.packs_suscripcion?.nombre || 'N/A',
                fecha_inicio: s.fecha_inicio,
                estado: s.estado
            }));
        }
    },

    async getOrCreateCliente(email, nombre) {
        if (this.mode === 'local') {
            const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
            let cliente = clientes.find(c => c.email === email);
            if (!cliente) {
                cliente = { id: Date.now(), email, nombre };
                clientes.push(cliente);
                localStorage.setItem('clientes', JSON.stringify(clientes));
            }
            return cliente;
        } else {
            // Buscar cliente
            const { data: existing, error: searchError } = await this.supabase
                .from('clientes')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (existing) return existing;

            // Crear cliente si no existe
            const { data: created, error } = await this.supabase
                .from('clientes')
                .insert([{ email, nombre }])
                .select()
                .single();

            if (error) {
                console.error("Error creating client:", error);
                throw new Error("No pudimos vincular tu cuenta con nuestro sistema de clientes.");
            }
            return created;
        }
    },

    async createSuscripcion(clienteId, packId) {
        if (this.mode === 'local') {
            const subs = JSON.parse(localStorage.getItem('subscribers') || '[]');
            const newSub = {
                id: Date.now(),
                cliente_id: clienteId,
                pack_id: packId,
                estado: 'activa',
                fecha_inicio: new Date().toISOString()
            };
            subs.push(newSub);
            localStorage.setItem('subscribers', JSON.stringify(subs));
            return newSub;
        } else {
            const { data, error } = await this.supabase
                .from('suscripciones')
                .insert([{
                    cliente_id: clienteId,
                    pack_id: packId,
                    estado: 'activa',
                    fecha_inicio: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    // ===== PEDIDOS (ADMIN) =====
    async getPedidosFull() {
        if (this.mode === 'local') {
            return JSON.parse(localStorage.getItem('orders') || '[]');
        } else {
            const { data, error } = await this.supabase
                .from('pedidos')
                .select(`
                    *,
                    clientes (nombre)
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(o => ({
                id: o.id,
                fecha: o.created_at,
                cliente: o.clientes?.nombre || 'Anonimo',
                total: o.total,
                estado: o.estado,
                productos: 'Ver detalle' // Se carga al ver detalle
            }));
        }
    },

    // ===== CONFIGURACIÓN =====
    async createPedido(orderData, items) {
        if (this.mode === 'local') {
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            const newOrder = {
                id: orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1001,
                ...orderData,
                items: items,
                fecha: new Date().toISOString(),
                estado: 'Pendiente'
            };
            orders.push(newOrder);
            localStorage.setItem('orders', JSON.stringify(orders));
            return newOrder;
        } else {
            try {
                // 1. Manejar el Cliente (Buscar o Crear)
                let clienteId = null;
                const { data: existingClient } = await this.supabase
                    .from('clientes')
                    .select('id')
                    .eq('email', orderData.email)
                    .single();

                if (existingClient) {
                    clienteId = existingClient.id;
                } else {
                    const { data: newClient, error: clientError } = await this.supabase
                        .from('clientes')
                        .insert([{
                            email: orderData.email,
                            nombre: orderData.nombre,
                            telefono: orderData.telefono,
                            direccion: orderData.direccion,
                            comuna: orderData.comuna
                        }])
                        .select()
                        .single();
                    if (clientError) throw clientError;
                    clienteId = newClient.id;
                }

                // 2. Insertar el pedido
                const subtotal = items.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
                const numeroPedido = 'CC-' + Math.floor(1000 + Math.random() * 9000);

                const { data: order, error: orderError } = await this.supabase
                    .from('pedidos')
                    .insert([{
                        numero_pedido: numeroPedido,
                        cliente_id: clienteId,
                        subtotal: subtotal,
                        costo_envio: orderData.total - subtotal,
                        total: orderData.total,
                        direccion_envio: orderData.direccion,
                        comuna: orderData.comuna,
                        estado: 'pendiente',
                        fecha_pago: null
                    }])
                    .select()
                    .single();

                if (orderError) throw orderError;

                // 3. Insertar los items del pedido
                const itemsToInsert = items.map(item => ({
                    pedido_id: order.id,
                    producto_id: item.id,
                    producto_nombre: item.nombre,
                    cantidad: item.quantity,
                    precio_unitario: item.precio,
                    subtotal: item.precio * item.quantity
                }));

                const { error: itemsError } = await this.supabase
                    .from('pedido_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;

                return order;
            } catch (error) {
                console.error("Error en createPedido:", error);
                throw error;
            }
        }
    }
};

// Inicializar al cargar
if (DataManager.mode === 'supabase') {
    DataManager.initSupabase();
}

console.log(`📊 DataManager inicializado en modo: ${DataManager.mode}`);
