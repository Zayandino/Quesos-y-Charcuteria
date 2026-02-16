/* ========================================
   CABRA & CURADO - DATA MANAGER
   Capa de abstracción de datos
   Soporta: localStorage y Supabase
   ======================================== */

// ===== CONFIGURACIÓN =====
const SUPABASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_URL : '';
const SUPABASE_ANON_KEY = typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_ANON_KEY : '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: No se han encontrado las credenciales de Supabase en config.js');
}

// ===== DATA MANAGER =====
const DataManager = {
    mode: 'supabase',
    supabase: null,

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
                options: { data: metadata }
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
            if (filters.activo !== undefined) {
                productores = productores.filter(p => p.activo === filters.activo);
            }
            return productores;
        } else {
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
            const { error } = await this.supabase.from('productores').delete().eq('id', id);
            if (error) throw error;
            return true;
        }
    },

    // ===== PRODUCTOS =====
    async getProductos(filters = {}) {
        if (this.mode === 'local') {
            let productos = JSON.parse(localStorage.getItem('productos') || '[]');
            const productores = JSON.parse(localStorage.getItem('productores') || '[]');
            productos = productos.map(p => ({
                ...p,
                productor_nombre: productores.find(prod => prod.id === p.productor_id)?.nombre || 'Desconocido'
            }));
            if (filters.categoria) productos = productos.filter(p => p.categoria === filters.categoria);
            if (filters.activo !== undefined) productos = productos.filter(p => p.activo === filters.activo);
            if (filters.visible_tienda !== undefined) productos = productos.filter(p => p.visible_tienda === filters.visible_tienda);
            return productos;
        } else {
            let query = this.supabase.from('productos').select('*, productores(nombre)');
            if (filters.categoria) query = query.eq('categoria', filters.categoria);
            if (filters.activo !== undefined) query = query.eq('activo', filters.activo);
            if (filters.visible_tienda !== undefined) query = query.eq('visible_tienda', filters.visible_tienda);
            const { data, error } = await query;
            if (error) throw error;
            return data.map(p => ({ ...p, productor_nombre: p.productores?.nombre || 'Desconocido' }));
        }
    },

    async getProductoById(id) {
        if (this.mode === 'local') {
            const productos = JSON.parse(localStorage.getItem('productos') || '[]');
            return productos.find(p => p.id === id);
        } else {
            const { data, error } = await this.supabase.from('productos').select('*').eq('id', id).single();
            if (error) throw error;
            return data;
        }
    },

    async createProducto(data) {
        if (this.mode === 'local') {
            const productos = JSON.parse(localStorage.getItem('productos') || '[]');
            const newP = { id: Date.now(), ...data, created_at: new Date().toISOString() };
            productos.push(newP);
            localStorage.setItem('productos', JSON.stringify(productos));
            return newP;
        } else {
            const { data: result, error } = await this.supabase.from('productos').insert([data]).select();
            if (error) throw error;
            return result[0];
        }
    },

    async updateProducto(id, data) {
        if (this.mode === 'local') {
            const productos = JSON.parse(localStorage.getItem('productos') || '[]');
            const idx = productos.findIndex(p => p.id === id);
            if (idx !== -1) {
                productos[idx] = { ...productos[idx], ...data, updated_at: new Date().toISOString() };
                localStorage.setItem('productos', JSON.stringify(productos));
                return productos[idx];
            }
            return null;
        } else {
            const { data: result, error } = await this.supabase.from('productos').update(data).eq('id', id).select();
            if (error) throw error;
            return result[0];
        }
    },

    // ===== CONFIGURACIÓN =====
    async getConfig(key) {
        if (this.mode === 'local') {
            const config = JSON.parse(localStorage.getItem('config') || '{}');
            return config[key];
        } else {
            const { data, error } = await this.supabase.from('configuracion').select('valor').eq('clave', key).maybeSingle();
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
            console.log(`📡 Guardando ${key}...`);
            // Intentamos el upsert directo primero
            const { error } = await this.supabase
                .from('configuracion')
                .upsert({ clave: key, valor: value }, { onConflict: 'clave' });

            if (error) {
                console.warn(`⚠️ Conflicto detectado en ${key}, reintentando limpieza manual...`);
                // Si el upsert falla por conflicto 409, borramos y reinsertamos
                await this.supabase.from('configuracion').delete().eq('clave', key);
                const { error: retryError } = await this.supabase
                    .from('configuracion')
                    .insert([{ clave: key, valor: value }]);

                if (retryError) throw retryError;
            }
            return true;
        }
    },

    // ===== STORAGE =====
    async uploadImagen(file) {
        if (this.mode === 'local') return 'https://via.placeholder.com/400';
        const fileName = `${Date.now()}-${file.name}`;
        const { error } = await this.supabase.storage.from('productos').upload(fileName, file);
        if (error) throw error;
        const { data: publicURL } = this.supabase.storage.from('productos').getPublicUrl(fileName);
        return publicURL.publicUrl;
    },

    // ===== SUSCRIPTORES =====
    async getSubscribers() {
        if (this.mode === 'local') return JSON.parse(localStorage.getItem('subscribers') || '[]');
        const { data, error } = await this.supabase
            .from('suscripciones')
            .select('*, clientes(nombre, email), packs_suscripcion(nombre)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(s => ({
            id: s.id,
            nombre: s.clientes?.nombre || 'Desconocido',
            email: s.clientes?.email || 'N/A',
            plan: s.packs_suscripcion?.nombre || 'N/A',
            fecha_inicio: s.fecha_inicio,
            estado: s.estado
        }));
    },

    // ===== CLIENTES =====
    async getOrCreateCliente(email, nombre) {
        if (this.mode === 'local') {
            const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
            let c = clientes.find(cli => cli.email === email);
            if (!c) {
                c = { id: Date.now(), email, nombre };
                clientes.push(c);
                localStorage.setItem('clientes', JSON.stringify(clientes));
            }
            return c;
        } else {
            const { data: existing } = await this.supabase.from('clientes').select('*').eq('email', email).maybeSingle();
            if (existing) return existing;
            const { data: created, error } = await this.supabase.from('clientes').insert([{ email, nombre }]).select().single();
            if (error) throw error;
            return created;
        }
    },

    // ===== PEDIDOS =====
    async getPedidosFull() {
        if (this.mode === 'local') return JSON.parse(localStorage.getItem('orders') || '[]');
        const { data, error } = await this.supabase
            .from('pedidos')
            .select('*, clientes(nombre)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(o => ({
            id: o.id,
            fecha: o.created_at,
            cliente: o.clientes?.nombre || 'Anónimo',
            total: o.total,
            estado: o.estado
        }));
    },

    async createPedido(orderData, items) {
        if (this.mode === 'local') {
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            const newO = { id: Date.now(), ...orderData, items, fecha: new Date().toISOString(), estado: 'Pendiente' };
            orders.push(newO);
            localStorage.setItem('orders', JSON.stringify(orders));
            return newO;
        } else {
            // Lógica simplificada de pedido para Supabase
            const cliente = await this.getOrCreateCliente(orderData.email, orderData.nombre);
            const numeroPedido = 'CC-' + Math.floor(1000 + Math.random() * 9000);

            const { data: order, error: orderError } = await this.supabase
                .from('pedidos')
                .insert([{
                    numero_pedido: numeroPedido,
                    cliente_id: cliente.id,
                    total: orderData.total,
                    direccion_envio: orderData.direccion,
                    comuna: orderData.comuna,
                    estado: 'pendiente'
                }])
                .select().single();
            if (orderError) throw orderError;

            const itemsToInsert = items.map(item => ({
                pedido_id: order.id,
                producto_id: item.id,
                producto_nombre: item.nombre,
                cantidad: item.quantity,
                precio_unitario: item.precio,
                subtotal: item.precio * item.quantity
            }));
            await this.supabase.from('pedido_items').insert(itemsToInsert);
            return order;
        }
    }
};

if (DataManager.mode === 'supabase') DataManager.initSupabase();
console.log(`📊 DataManager inicializado en modo: ${DataManager.mode}`);
