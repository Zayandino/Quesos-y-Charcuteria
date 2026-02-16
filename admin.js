/* ========================================
   CABRA & CURADO - ADMIN PANEL LOGIC
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

async function checkAuth() {
    const user = await DataManager.getCurrentUser();
    if (user) {
        // Verificar si es admin en la tabla usuarios_sistema
        const { data: adminUser, error } = await DataManager.supabase
            .from('usuarios_sistema')
            .select('rol')
            .eq('email', user.email)
            .eq('activo', true)
            .single();

        if (adminUser && adminUser.rol === 'admin') {
            showAdminPanel();
        } else {
            alert('No tienes permisos de administrador.');
            await DataManager.signOut();
            showLoginForm();
        }
    } else {
        showLoginForm();
    }
}

function showLoginForm() {
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) loginScreen.style.display = 'flex';
    document.getElementById('adminLayout').style.display = 'none';
}

function showAdminPanel() {
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) loginScreen.style.display = 'none';
    document.getElementById('adminLayout').style.display = 'flex';
    initializeAdmin();
}

window.login = async function (event) {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPass').value;
    const errorMsg = document.getElementById('loginError');

    try {
        const { data, error } = await DataManager.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (data.user) {
            // Verificar rol
            const { data: adminUser } = await DataManager.supabase
                .from('usuarios_sistema')
                .select('rol')
                .eq('email', data.user.email)
                .single();

            if (adminUser && adminUser.rol === 'admin') {
                showAdminPanel();
            } else {
                throw new Error('No autorizado');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        if (errorMsg) errorMsg.style.display = 'block';
    }
}

window.logout = async function () {
    await DataManager.signOut();
    showLoginForm();
}

// ===== ADMIN INITIALIZATION =====
async function initializeAdmin() {
    await Promise.all([
        loadDashboard(),
        loadProducts(),
        loadSubscribers(),
        loadOrders(),
        loadProducers()
    ]);
}

async function initializeSampleSubscribers() {
    const subscribers = JSON.parse(localStorage.getItem('subscribers') || '[]');
    if (subscribers.length === 0) {
        const samples = [
            { id: 1, nombre: 'Javiera Paz', email: 'javitapaz@email.com', plan: 'Experiencia Total', fecha_inicio: '2026-01-15', estado: 'activo' },
            { id: 2, nombre: 'Carlos Ruiz', email: 'c.ruiz@email.com', plan: 'Coleccionista', fecha_inicio: '2026-02-01', estado: 'activo' },
            { id: 3, nombre: 'Marta Solis', email: 'marta.solis@email.com', plan: 'Descubrimiento', fecha_inicio: '2026-02-10', estado: 'pendiente' }
        ];
        localStorage.setItem('subscribers', JSON.stringify(samples));
    }
}

async function initializeSampleOrders() {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    if (orders.length === 0) {
        const samples = [
            {
                id: 1001,
                fecha: new Date().toISOString(),
                cliente: 'Andrés Bello',
                productos: 'Queso Cabra Maduro x2, Longaniza Parrillera x1',
                items: [
                    { id: 2, quantity: 2 }, // Queso Maduro
                    { id: 11, quantity: 1 } // Longaniza
                ],
                total: 14990,
                estado: 'Completado'
            }
        ];
        localStorage.setItem('orders', JSON.stringify(samples));
    }
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';

    // Actualizar active nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(id)) {
            item.classList.add('active');
        }
    });
}

window.showSection = showSection;

// ===== DASHBOARD =====
async function loadDashboard() {
    const products = await DataManager.getProductos();
    const orders = await DataManager.getPedidosFull();
    const subscribers = await DataManager.getSubscribers();

    // Stats calculation
    const today = new Date().toLocaleDateString('es-CL');
    const todaySales = (orders || [])
        .filter(o => new Date(o.fecha).toLocaleDateString('es-CL') === today)
        .reduce((sum, o) => sum + o.total, 0);

    const pendingOrders = (orders || []).filter(o => o.estado === 'pendiente').length;
    const activeSubs = (subscribers || []).filter(s => s.estado === 'activa' || s.estado === 'activo').length;

    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('todaySales').textContent = `$${todaySales.toLocaleString('es-CL')}`;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('totalSubscribers').textContent = activeSubs;
}

// ===== PRODUCTOS =====
async function loadProducts() {
    const products = await DataManager.getProductos();
    const tbody = document.getElementById('productsTableBody');

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No hay productos. Agrega uno nuevo.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
        const imgDisplay = p.imagen_url
            ? `<img src="${p.imagen_url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">`
            : `<div style="width: 40px; height: 40px; background: #333; border-radius: 4px; display: flex; align-items: center; justify-content: center;">${p.categoria === 'queso' ? '🧀' : '🥓'}</div>`;

        const finalPrice = p.precio_venta;
        const neto = Math.round(finalPrice / 1.19);

        return `
        <tr>
            <td style="display: flex; align-items: center; gap: 1rem;">
                ${imgDisplay}
                <span style="font-weight: 600;">${p.nombre}</span>
            </td>
            <td><span class="status-badge" style="background:var(--bg-main); color:var(--text-muted)">${p.categoria}</span></td>
            <td>
                <div style="font-weight: 600;">$${finalPrice.toLocaleString()}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">Neto: $${neto.toLocaleString()}</div>
            </td>
            <td style="color: ${p.stock < 10 ? 'var(--accent)' : 'inherit'}">${p.stock}</td>
            <td><span class="status-badge ${p.stock > 0 ? 'status-active' : 'status-inactive'}">${p.stock > 0 ? 'Activo' : 'Agotado'}</span></td>
            <td>
                <button class="action-btn" onclick="editProduct(${p.id})">✏️</button>
                <button class="action-btn" onclick="deleteProduct(${p.id})">🗑️</button>
            </td>
        </tr>
    `}).join('');
}

// ===== MODAL PRODUCTOS =====
const modal = document.getElementById('productModal');
const form = document.getElementById('productForm');

window.openProductModal = async function () {
    form.reset();
    document.getElementById('prodId').value = '';
    document.getElementById('prodImage').value = '';
    if (document.getElementById('prodImageFile')) document.getElementById('prodImageFile').value = '';
    document.getElementById('imagePreview').innerHTML = '<span style="font-size: 0.8rem;">Sin imagen</span>';
    document.getElementById('uploadStatus').textContent = '* Selecciona una foto para subirla automáticamente.';
    document.getElementById('uploadStatus').style.color = '#666';

    // Cargar select de productores
    const productores = await DataManager.getProductores();
    const select = document.getElementById('prodProducer');
    select.innerHTML = '<option value="">Selecciona un productor...</option>' +
        productores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

    modal.classList.add('active');
    document.body.classList.add('no-scroll');
}

window.closeProductModal = function () {
    modal.classList.remove('active');
    document.body.classList.remove('no-scroll');
}

window.updatePreview = function () {
    const url = document.getElementById('prodImage').value;
    const preview = document.getElementById('imagePreview');
    if (url) {
        preview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        preview.innerHTML = '<span style="font-size: 0.8rem;">Sin imagen</span>';
    }
}

window.handleImageUpload = async function (input) {
    const file = input.files[0];
    if (!file) return;

    const status = document.getElementById('uploadStatus');
    status.textContent = '⏳ Subiendo imagen...';
    status.style.color = 'var(--primary)';

    try {
        const publicUrl = await DataManager.uploadImagen(file);
        document.getElementById('prodImage').value = publicUrl;
        updatePreview();
        status.textContent = '✅ Imagen subida con éxito.';
        status.style.color = '#2ecc71';
    } catch (error) {
        console.error('Error uploading:', error);
        status.textContent = '❌ Error al subir. Intenta de nuevo.';
        status.style.color = '#e74c3c';
    }
}

window.calculateIVA = function () {
    const total = parseFloat(document.getElementById('prodPrice').value) || 0;
    const neto = Math.round(total / 1.19);
    const iva = total - neto;

    document.getElementById('valNeto').textContent = `$${neto.toLocaleString('es-CL')}`;
    document.getElementById('valIVA').textContent = `$${iva.toLocaleString('es-CL')}`;
}

window.editProduct = async (id) => {
    const products = await DataManager.getProductos();
    const p = products.find(x => x.id === id);
    if (p) {
        await openProductModal();

        document.getElementById('prodId').value = p.id;
        document.getElementById('prodName').value = p.nombre;
        document.getElementById('prodPrice').value = p.precio_venta;
        document.getElementById('prodStock').value = p.stock;
        document.getElementById('prodCategory').value = p.categoria;
        document.getElementById('prodProducer').value = p.productor_id || '';
        document.getElementById('prodDesc').value = p.descripcion || '';
        document.getElementById('prodImage').value = p.imagen_url || '';
        calculateIVA();
        updatePreview();
    }
}

window.deleteProduct = async (id) => {
    if (confirm('¿Seguro que deseas eliminar este producto?')) {
        await DataManager.deleteProducto(id);
        loadProducts();
        loadDashboard();
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prodId').value;

    const producerId = document.getElementById('prodProducer').value;

    const data = {
        nombre: document.getElementById('prodName').value,
        precio_venta: parseInt(document.getElementById('prodPrice').value),
        stock: parseInt(document.getElementById('prodStock').value),
        categoria: document.getElementById('prodCategory').value,
        productor_id: producerId ? parseInt(producerId) : 1, // Default a 1 si no hay selección
        descripcion: document.getElementById('prodDesc').value,
        imagen_url: document.getElementById('prodImage').value,
        activo: true,
        visible_tienda: true,
        costo_proveedor: parseInt(document.getElementById('prodPrice').value) * 0.7
    };

    if (id) {
        await DataManager.updateProducto(parseInt(id), data);
    } else {
        await DataManager.createProducto(data);
    }

    closeProductModal();
    loadProducts();
    loadDashboard();
});

// ===== PEDIDOS =====
window.loadOrders = async function () {
    const tbody = document.getElementById('ordersTableBody');
    const orders = await DataManager.getPedidosFull();

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay pedidos registrados aún.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map((order) => `
        <tr>
            <td>#${order.id}</td>
            <td>${new Date(order.fecha).toLocaleDateString('es-CL')}</td>
            <td>${order.cliente}</td>
            <td style="font-size: 0.85rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${order.productos}
            </td>
            <td>$${order.total.toLocaleString('es-CL')}</td>
            <td><span class="status-badge ${order.estado === 'pagado' ? 'status-active' : 'status-inactive'}">${order.estado}</span></td>
            <td>
                <button class="action-btn" onclick="viewOrderDetails(${order.id})">👁️</button>
            </td>
        </tr>
    `).join('');
}

window.processOrder = async function (orderId) {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const order = orders.find(o => o.id === orderId);

    if (!order) return;
    if (order.estado === 'Completado') {
        alert('Este pedido ya fue procesado y el stock descontado.');
        return;
    }

    if (confirm(`¿Procesar pedido #${orderId}? Esto descontará los productos del stock.`)) {
        // En un sistema real, esto se hace en el backend. 
        // Aquí simulamos el descuento de stock.
        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                const product = await DataManager.getProductoById(item.id);
                if (product) {
                    await DataManager.updateProducto(item.id, {
                        stock: Math.max(0, product.stock - item.quantity)
                    });
                }
            }
        }

        // Actualizar estado del pedido
        order.estado = 'Completado';
        localStorage.setItem('orders', JSON.stringify(orders));

        await initializeAdmin(); // Recargar todo
        alert('✅ Pedido procesado y stock actualizado correctamente.');
    }
}

window.viewOrderDetails = function (orderId) {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const order = orders.find(o => o.id === orderId);
    alert(`DETALLE PEDIDO #${orderId}\n\nCliente: ${order.cliente}\nProductos: ${order.productos}\nTotal: $${order.total.toLocaleString('es-CL')}\nEstado: ${order.estado}`);
}

// ===== SUSCRIPTORES =====
const subModal = document.getElementById('subscriberModal');
const subForm = document.getElementById('subscriberForm');

// ===== SUSCRIPTORES =====
window.loadSubscribers = async function () {
    const tbody = document.getElementById('subscribersTableBody');
    const subscribers = await DataManager.getSubscribers();

    if (!subscribers || subscribers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay suscriptores registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = subscribers.map(s => `
        <tr>
            <td>${s.nombre}</td>
            <td>${s.email}</td>
            <td><span class="status-badge" style="background:#333">${s.plan}</span></td>
            <td>${new Date(s.fecha_inicio).toLocaleDateString('es-CL')}</td>
            <td><span class="status-badge ${s.estado === 'activa' || s.estado === 'activo' ? 'status-active' : 'status-inactive'}">${s.estado}</span></td>
            <td>
                <button class="action-btn" onclick="editSubscriber(${s.id})">✏️</button>
            </td>
        </tr>
    `).join('');
}

window.openSubscriberModal = function () {
    subForm.reset();
    document.getElementById('subId').value = '';
    subModal.classList.add('active');
    document.body.classList.add('no-scroll');
}

window.closeSubscriberModal = function () {
    subModal.classList.remove('active');
    document.body.classList.remove('no-scroll');
}

window.editSubscriber = function (id) {
    const subscribers = JSON.parse(localStorage.getItem('subscribers') || '[]');
    const s = subscribers.find(x => x.id === id);
    if (s) {
        openSubscriberModal();
        document.getElementById('subId').value = s.id;
        document.getElementById('subName').value = s.nombre;
        document.getElementById('subEmail').value = s.email;
        document.getElementById('subPlan').value = s.plan;
        document.getElementById('subStatus').value = s.estado;
    }
}

if (subForm) {
    subForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('subId').value;
        let subscribers = JSON.parse(localStorage.getItem('subscribers') || '[]');

        const data = {
            nombre: document.getElementById('subName').value,
            email: document.getElementById('subEmail').value,
            plan: document.getElementById('subPlan').value,
            estado: document.getElementById('subStatus').value,
            fecha_inicio: id ? subscribers.find(x => x.id == id).fecha_inicio : new Date().toISOString()
        };

        if (id) {
            const index = subscribers.findIndex(x => x.id == id);
            subscribers[index] = { ...data, id: parseInt(id) };
        } else {
            const newId = subscribers.length > 0 ? Math.max(...subscribers.map(x => x.id)) + 1 : 1;
            subscribers.push({ ...data, id: newId });
        }

        localStorage.setItem('subscribers', JSON.stringify(subscribers));
        closeSubscriberModal();
        loadSubscribers();
        loadDashboard();
        alert('✅ Suscriptor guardado correctamente.');
    });
}

window.deleteSubscriber = function (id) {
    if (confirm('¿Eliminar esta suscripción?')) {
        let subscribers = JSON.parse(localStorage.getItem('subscribers') || '[]');
        subscribers = subscribers.filter(s => s.id !== id);
        localStorage.setItem('subscribers', JSON.stringify(subscribers));
        loadSubscribers();
        loadDashboard();
    }
}
// ===== CONFIGURACIÓN DEL SISTEMA =====
window.loadSystemConfig = async function () {
    try {
        const [instagram, facebook, whatsapp, email, minPurchase, freeShipping, mpPublic, mpAccess] = await Promise.all([
            DataManager.getConfig('instagram_url'),
            DataManager.getConfig('facebook_url'),
            DataManager.getConfig('whatsapp'),
            DataManager.getConfig('email_contacto'),
            DataManager.getConfig('compra_minima'),
            DataManager.getConfig('envio_gratis_desde'),
            DataManager.getConfig('mp_public_key'),
            DataManager.getConfig('mp_access_token')
        ]);

        document.getElementById('conf_instagram').value = instagram || '';
        document.getElementById('conf_facebook').value = facebook || '';
        document.getElementById('conf_whatsapp').value = whatsapp || '';
        document.getElementById('conf_email').value = email || '';
        document.getElementById('conf_min_purchase').value = minPurchase || '15000';
        document.getElementById('conf_free_shipping').value = freeShipping || '50000';
        document.getElementById('conf_mp_public').value = mpPublic || '';
        document.getElementById('conf_mp_access').value = mpAccess || '';
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

window.saveSystemConfig = async function () {
    try {
        const configs = {
            'instagram_url': document.getElementById('conf_instagram').value,
            'facebook_url': document.getElementById('conf_facebook').value,
            'whatsapp': document.getElementById('conf_whatsapp').value,
            'email_contacto': document.getElementById('conf_email').value,
            'compra_minima': document.getElementById('conf_min_purchase').value,
            'envio_gratis_desde': document.getElementById('conf_free_shipping').value,
            'mp_public_key': document.getElementById('conf_mp_public').value,
            'mp_access_token': document.getElementById('conf_mp_access').value
        };

        const entries = Object.entries(configs);
        for (const [key, value] of entries) {
            if (value !== undefined && value !== null) {
                await DataManager.setConfig(key, value);
            }
        }

        alert('✅ Configuración guardada con éxito.');
    } catch (error) {
        console.error('Error saving config:', error);
        alert('❌ Error al guardar la configuración: ' + (error.message || 'Error de permisos o base de datos.'));
    }
}

// ===== PRODUCTORES =====
window.loadProducers = async function () {
    const tbody = document.getElementById('producersTableBody');
    if (!tbody) return;
    const producers = await DataManager.getProductores();

    tbody.innerHTML = producers.map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td>${p.ubicacion}</td>
            <td>${p.especialidad}</td>
            <td><span class="status-badge ${p.activo ? 'status-active' : 'status-inactive'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td>
                <button class="action-btn" onclick="editProducer(${p.id})">✏️</button>
            </td>
        </tr>
    `).join('');
}

window.openProducerModal = function () {
    const form = document.getElementById('producerForm');
    if (form) form.reset();
    document.getElementById('producerId').value = '';
    document.getElementById('producerModal').classList.add('active');
    document.body.classList.add('no-scroll');
}

window.closeProducerModal = function () {
    document.getElementById('producerModal').classList.remove('active');
    document.body.classList.remove('no-scroll');
}

window.saveProducer = async function () {
    const id = document.getElementById('producerId').value;
    const data = {
        nombre: document.getElementById('producerName').value,
        ubicacion: document.getElementById('producerLocation').value,
        especialidad: document.getElementById('producerSpecialty').value,
        historia: document.getElementById('producerHistory').value,
        activo: document.getElementById('producerStatus').value === 'true'
    };

    try {
        if (id) {
            await DataManager.updateProductor(id, data);
        } else {
            await DataManager.createProductor(data);
        }
        alert('✅ Productor guardado con éxito.');
        closeProducerModal();
        loadProducers();
        loadDashboard();
    } catch (error) {
        console.error('Error saving producer:', error);
        alert('❌ Error al guardar productor.');
    }
}

window.editProducer = async function (id) {
    try {
        const producers = await DataManager.getProductores();
        const producer = producers.find(p => p.id == id);
        if (!producer) return;

        document.getElementById('producerId').value = producer.id;
        document.getElementById('producerName').value = producer.nombre;
        document.getElementById('producerLocation').value = producer.ubicacion;
        document.getElementById('producerSpecialty').value = producer.especialidad || '';
        document.getElementById('producerHistory').value = producer.historia || '';
        document.getElementById('producerStatus').value = producer.activo ? 'true' : 'false';

        document.getElementById('producerModal').classList.add('active');
        document.body.classList.add('no-scroll');
    } catch (error) {
        console.error('Error editing producer:', error);
    }
}

// Inyectar llamada a loadSystemConfig en showSection
const originalShowSection = window.showSection;
window.showSection = function (id) {
    if (id === 'configuracion') {
        loadSystemConfig();
        loadProducers();
    }
    originalShowSection(id);
}
