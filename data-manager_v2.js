/* ========================================
   DCAVA - DATA MANAGER
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
        if (this.mode === 'supabase' && this.supabase) {
            try {
                await this.supabase.auth.signOut();
            } catch (err) {
                console.warn('Supabase signOut error, force clearing local session:', err);
                // Forzar limpieza local si la API falla
                await this.supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            }
        }
        sessionStorage.removeItem('admin_authenticated');
        localStorage.removeItem('supabase.auth.token'); // Limpieza forzada de fallback
    },

    async getCurrentUser() {
        if (this.mode === 'supabase') {
            const { data: { user } } = await this.supabase.auth.getUser();
            return user;
        }
        return null;
    },

    // Helper para limpiar mojibakes y URLs incorrectas de la base de datos
    sanitizeText(text) {
        if (!text) return text;
        return text.replace(/CHILL\?\?N/g, 'Chillán')
            .replace(/Chill\?\?n/g, 'Chillán')
            .replace(/\?\?UBLE/g, 'Ñuble')
            .replace(/\?\?uble/g, 'Ñuble')
            .replace(/L\?\?cteos/g, 'Lácteos')
            .replace(/R\?\?OS/g, 'Ríos')
            .replace(/R\?\?os/g, 'Ríos')
            .replace(/REGI\?\?N/g, 'Región')
            .replace(/Regi\?\?n/g, 'Región')
            .replace(/tradici\?\?n/g, 'tradición')
            .replace(/Maduraci\?\?n/g, 'Maduración')
            .replace(/maduraci\?\?n/g, 'maduración')
            .replace(/m\?\?s/g, 'más')
            .replace(/est\?\?ndares/g, 'estándares')
            .replace(/queser\?\?a/g, 'quesería')
            .replace(/adici\?\?n/g, 'adición')
            .replace(/coraz\?\?n/g, 'corazón')
            .replace(/\?\?nicos/g, 'únicos')
            .replace(/mediterr\?\?neas/g, 'mediterráneas')
            .replace(/creaci\?\?n/g, 'creación')
            .replace(/aut\?\?ntico/g, 'auténtico')
            .replace(/\?\?cida/g, 'ácida')
            .replace(/\?\?cidos/g, 'ácidos')
            .replace(/\?\?cido/g, 'ácido');
    },

    sanitizeItem(item) {
        if (!item) return item;
        const result = { ...item };
        if (result.nombre) result.nombre = this.sanitizeText(result.nombre);
        if (result.descripcion) result.descripcion = this.sanitizeText(result.descripcion);
        if (result.ubicacion) result.ubicacion = this.sanitizeText(result.ubicacion);
        if (result.especialidad) result.especialidad = this.sanitizeText(result.especialidad);
        if (result.historia) result.historia = this.sanitizeText(result.historia);
        if (result.productor_nombre) result.productor_nombre = this.sanitizeText(result.productor_nombre);
        
        // Bloquear explícitamente las URLs de imágenes inválidas de la BD (como Bender o bolsas)
        if (result.imagen_url && result.imagen_url.includes('unsplash.com')) {
            result.imagen_url = null;
        }
        return result;
    },

    // ===== PRODUCTORES =====
    async getProductores(filters = {}) {
        if (this.mode === 'local') {
            let productores = JSON.parse(localStorage.getItem('productores') || '[]');
            if (filters.activo !== undefined) {
                productores = productores.filter(p => p.activo === filters.activo);
            }
            return productores.map(p => this.sanitizeItem(p));
        } else {
            let query = this.supabase.from('dcava_productores').select('*');
            if (filters.activo !== undefined) {
                query = query.eq('activo', filters.activo);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data.map(p => this.sanitizeItem(p));
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
                .from('dcava_productores')
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
                .from('dcava_productores')
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
            const { error } = await this.supabase.from('dcava_productores').delete().eq('id', id);
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
            return productos.map(p => this.sanitizeItem(p));
        } else {
            let query = this.supabase.from('dcava_productos').select('*, dcava_productores(nombre)');
            if (filters.categoria) query = query.eq('categoria', filters.categoria);
            if (filters.activo !== undefined) query = query.eq('activo', filters.activo);
            if (filters.visible_tienda !== undefined) query = query.eq('visible_tienda', filters.visible_tienda);
            const { data, error } = await query;
            if (error) throw error;
            return data.map(p => this.sanitizeItem({ ...p, productor_nombre: p.dcava_productores?.nombre || 'Desconocido' }));
        }
    },

    async getProductoById(id) {
        if (this.mode === 'local') {
            const productos = JSON.parse(localStorage.getItem('productos') || '[]');
            return productos.find(p => p.id === id);
        } else {
            const { data, error } = await this.supabase.from('dcava_productos').select('*').eq('id', id).single();
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
            const { data: result, error } = await this.supabase.from('dcava_productos').insert([data]).select();
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
            const { data: result, error } = await this.supabase.from('dcava_productos').update(data).eq('id', id).select();
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
            const { error } = await this.supabase.from('dcava_productos').delete().eq('id', id);
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
            const { data, error } = await this.supabase.from('dcava_configuracion').select('valor').eq('clave', key).maybeSingle();
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
            const { error } = await this.supabase
                .from('dcava_configuracion')
                .upsert({ clave: key, valor: value }, { onConflict: 'clave' });

            if (error) {
                console.warn(`⚠️ Conflicto detectado en ${key}, reintentando limpieza manual...`);
                await this.supabase.from('dcava_configuracion').delete().eq('clave', key);
                const { error: retryError } = await this.supabase
                    .from('dcava_configuracion')
                    .insert([{ clave: key, valor: value }]);

                if (retryError) throw retryError;
            }
            return true;
        }
    },

    // ===== CATEGORIAS =====
    async getCategorias() {
        if (this.mode === 'local') {
            const defaultCats = [
                { id: 1, nombre: 'Queso', slug: 'queso', icono: '🧀' },
                { id: 2, nombre: 'Embutido', slug: 'embutido', icono: '🥓' }
            ];
            const cats = localStorage.getItem('categorias');
            if (!cats) {
                localStorage.setItem('categorias', JSON.stringify(defaultCats));
                return defaultCats;
            }
            return JSON.parse(cats);
        } else {
            const { data, error } = await this.supabase
                .from('dcava_categorias')
                .select('*')
                .order('nombre', { ascending: true });
            if (error) throw error;
            return data;
        }
    },

    async createCategoria(data) {
        if (this.mode === 'local') {
            const cats = await this.getCategorias();
            const newC = { id: Date.now(), ...data };
            cats.push(newC);
            localStorage.setItem('categorias', JSON.stringify(cats));
            return newC;
        } else {
            const { data: result, error } = await this.supabase
                .from('dcava_categorias')
                .insert([data])
                .select();
            if (error) throw error;
            return result[0];
        }
    },

    async updateCategoria(id, data) {
        if (this.mode === 'local') {
            const cats = await this.getCategorias();
            const idx = cats.findIndex(c => c.id === id);
            if (idx !== -1) {
                cats[idx] = { ...cats[idx], ...data };
                localStorage.setItem('categorias', JSON.stringify(cats));
                return cats[idx];
            }
            return null;
        } else {
            const { data: result, error } = await this.supabase
                .from('dcava_categorias')
                .update(data)
                .eq('id', id)
                .select();
            if (error) throw error;
            return result[0];
        }
    },

    async deleteCategoria(id) {
        if (this.mode === 'local') {
            let cats = await this.getCategorias();
            cats = cats.filter(c => c.id !== id);
            localStorage.setItem('categorias', JSON.stringify(cats));
            return true;
        } else {
            const { error } = await this.supabase
                .from('dcava_categorias')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        }
    },

    // ===== STORAGE =====
    async uploadImagen(file) {
        if (this.mode === 'local') return 'https://via.placeholder.com/400';
        const fileName = `${Date.now()}-${file.name}`;
        const { error } = await this.supabase.storage.from('dcava_productos').upload(fileName, file);
        if (error) throw error;
        const { data: publicURL } = this.supabase.storage.from('dcava_productos').getPublicUrl(fileName);
        return publicURL.publicUrl;
    },

    // ===== SUSCRIPTORES =====
    async getSubscribers() {
        if (this.mode === 'local') return JSON.parse(localStorage.getItem('subscribers') || '[]');
        const { data, error } = await this.supabase
            .from('dcava_suscripciones')
            .select('*, dcava_clientes(nombre, email), dcava_packs_suscripcion(nombre)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(s => ({
            id: s.id,
            nombre: s.dcava_clientes?.nombre || 'Desconocido',
            email: s.dcava_clientes?.email || 'N/A',
            plan: s.dcava_packs_suscripcion?.nombre || 'N/A',
            fecha_inicio: s.fecha_inicio,
            estado: s.estado
        }));
    },

    async createSuscripcion(clienteId, packId) {
        if (this.mode === 'local') {
            const subs = JSON.parse(localStorage.getItem('subscribers') || '[]');
            const newSub = {
                id: Date.now(),
                cliente_id: clienteId,
                pack_id: packId,
                fecha_inicio: new Date().toISOString(),
                estado: 'activa',
                created_at: new Date().toISOString()
            };
            subs.push(newSub);
            localStorage.setItem('subscribers', JSON.stringify(subs));
            return newSub;
        } else {
            const { data, error } = await this.supabase
                .from('dcava_suscripciones')
                .insert([{
                    cliente_id: clienteId,
                    pack_id: packId,
                    estado: 'activa',
                    fecha_inicio: new Date().toISOString().split('T')[0]
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    async updateSuscripcion(id, data) {
        if (this.mode === 'local') {
            const subs = JSON.parse(localStorage.getItem('subscribers') || '[]');
            const idx = subs.findIndex(s => s.id === id);
            if (idx !== -1) {
                subs[idx] = { ...subs[idx], ...data };
                localStorage.setItem('subscribers', JSON.stringify(subs));
                return subs[idx];
            }
            return null;
        } else {
            const { data: result, error } = await this.supabase
                .from('dcava_suscripciones')
                .update(data)
                .eq('id', id)
                .select();
            if (error) throw error;
            return result[0];
        }
    },

    async deleteSuscripcion(id) {
        if (this.mode === 'local') {
            let subs = JSON.parse(localStorage.getItem('subscribers') || '[]');
            subs = subs.filter(s => s.id !== id);
            localStorage.setItem('subscribers', JSON.stringify(subs));
            return true;
        } else {
            const { error } = await this.supabase.from('dcava_suscripciones').delete().eq('id', id);
            if (error) throw error;
            return true;
        }
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
            const { data: existing } = await this.supabase.from('dcava_clientes').select('*').eq('email', email).maybeSingle();
            if (existing) return existing;
            const { data: created, error } = await this.supabase.from('dcava_clientes').insert([{ email, nombre }]).select().single();
            if (error) throw error;
            return created;
        }
    },

    // ===== PEDIDOS =====
    async getPedidosFull() {
        if (this.mode === 'local') return JSON.parse(localStorage.getItem('orders') || '[]');
        const { data, error } = await this.supabase
            .from('dcava_pedidos')
            .select('*, dcava_clientes(nombre), dcava_pedido_items(*)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(o => ({
            id: o.id,
            fecha: o.created_at,
            cliente: o.dcava_clientes?.nombre || 'Anónimo',
            total: o.total,
            estado: o.estado,
            productos: o.dcava_pedido_items?.map(i => `${i.producto_nombre} x${i.cantidad}`).join(', ') || 'N/A',
            items: o.dcava_pedido_items?.map(i => ({ id: i.producto_id, quantity: i.cantidad })) || []
        }));
    },

    async createPedido(orderData, items) {
        if (this.mode === 'local') {
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            const newO = { id: Date.now(), ...orderData, items, fecha: new Date().toISOString(), estado: 'pendiente' };
            orders.push(newO);
            localStorage.setItem('orders', JSON.stringify(orders));

            // Descontar stock localmente
            const productos = JSON.parse(localStorage.getItem('productos') || '[]');
            items.forEach(item => {
                const prod = productos.find(p => p.id === item.id);
                if (prod) {
                    prod.stock = Math.max(0, prod.stock - item.quantity);
                }
            });
            localStorage.setItem('productos', JSON.stringify(productos));

            return newO;
        } else {
            const cliente = await this.getOrCreateCliente(orderData.email, orderData.nombre);
            const numeroPedido = 'DC-' + Math.floor(1000 + Math.random() * 9000);

            const { data: order, error: orderError } = await this.supabase
                .from('dcava_pedidos')
                .insert([{
                    numero_pedido: numeroPedido,
                    cliente_id: cliente.id,
                    total: orderData.total,
                    subtotal: orderData.total - (orderData.costo_envio || 0),
                    costo_envio: orderData.costo_envio || 0,
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
            await this.supabase.from('dcava_pedido_items').insert(itemsToInsert);

            // Descontar stock en Supabase en tiempo real
            for (const item of items) {
                const { data: prod } = await this.supabase
                    .from('dcava_productos')
                    .select('stock')
                    .eq('id', item.id)
                    .single();
                if (prod) {
                    const nuevoStock = Math.max(0, prod.stock - item.quantity);
                    await this.supabase
                        .from('dcava_productos')
                        .update({ stock: nuevoStock })
                        .eq('id', item.id);
                }
            }

            return order;
        }
    },

    async updatePedido(id, data) {
        if (this.mode === 'local') {
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            const idx = orders.findIndex(o => o.id === id);
            if (idx !== -1) {
                orders[idx] = { ...orders[idx], ...data };
                localStorage.setItem('orders', JSON.stringify(orders));
                return orders[idx];
            }
            return null;
        } else {
            const { data: result, error } = await this.supabase
                .from('dcava_pedidos')
                .update(data)
                .eq('id', id)
                .select();
            if (error) throw error;
            return result[0];
        }
    }
};

if (DataManager.mode === 'supabase') DataManager.initSupabase();
console.log(`📊 DataManager v2.2.0 (DCAVA) inicializado en modo: ${DataManager.mode}`);
