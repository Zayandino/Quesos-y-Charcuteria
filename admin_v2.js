/* ========================================
   DCAVA - ADMIN PANEL LOGIC
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

async function checkAuth() {
    // Siempre verificar sesión real en Supabase
    if (!DataManager.supabase) {
        showLoginForm();
        return;
    }

    const user = await DataManager.getCurrentUser();
    if (user) {
        try {
            const { data: adminUser, error } = await DataManager.supabase
                .from('dcava_usuarios_sistema')
                .select('rol')
                .eq('email', user.email)
                .single();

            if (adminUser && (adminUser.rol === 'admin' || adminUser.rol === 'staff')) {
                showAdminPanel();
            } else {
                await DataManager.signOut();
                showLoginForm();
            }
        } catch (e) {
            console.error('Error verificando admin:', e);
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
    if (errorMsg) errorMsg.style.display = 'none';

    try {
        const { data, error } = await DataManager.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (data.user) {
            // Verificar que el usuario tiene rol admin/staff en la tabla del sistema
            const { data: adminUser, error: roleError } = await DataManager.supabase
                .from('dcava_usuarios_sistema')
                .select('rol')
                .eq('email', data.user.email)
                .single();

            if (!roleError && adminUser && (adminUser.rol === 'admin' || adminUser.rol === 'staff')) {
                showAdminPanel();
            } else {
                await DataManager.supabase.auth.signOut();
                throw new Error('Usuario no tiene permisos de administración');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        if (errorMsg) {
            errorMsg.textContent = error.message || 'Acceso denegado. Credenciales incorrectas o sin permisos.';
            errorMsg.style.display = 'block';
        }
    }
}

window.logout = async function () {
    try {
        await DataManager.signOut();
    } catch (e) {
        console.error('Error in logout:', e);
    }
    showLoginForm();
}

// ===== ADMIN INITIALIZATION =====
async function initializeAdmin() {
    const sections = [
        { fn: loadDashboard, name: 'Dashboard' },
        { fn: loadProducts, name: 'Productos' },
        { fn: loadSubscribers, name: 'Suscriptores' },
        { fn: loadOrders, name: 'Pedidos' },
        { fn: loadProducers, name: 'Productores' }
    ];

    for (const section of sections) {
        try {
            await section.fn();
        } catch (e) {
            console.warn(`⚠️ Error al cargar ${section.name}:`, e.message || e);
        }
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

    // KPI Financieros
    const productMap = {};
    (products || []).forEach(p => {
        productMap[p.id] = p;
    });

    let totalVentasBrutas = 0;
    let totalEgresosNetos = 0;

    (orders || []).forEach(o => {
        totalVentasBrutas += o.total || 0;

        if (o.items && Array.isArray(o.items)) {
            o.items.forEach(item => {
                const prod = productMap[item.id];
                if (prod) {
                    const costoUnitario = prod.costo_proveedor || 0;
                    totalEgresosNetos += item.quantity * costoUnitario;
                }
            });
        }
    });

    const netoIngresos = Math.round(totalVentasBrutas / 1.19);
    const ivaDebito = totalVentasBrutas - netoIngresos;
    
    const netoEgresos = totalEgresosNetos;
    const ivaCredito = Math.round(netoEgresos * 0.19);
    
    const margenNeto = netoIngresos - netoEgresos;
    const ivaNeto = ivaDebito - ivaCredito;

    // Asignación al DOM
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('todaySales').textContent = `$${todaySales.toLocaleString('es-CL')}`;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('totalSubscribers').textContent = activeSubs;

    document.getElementById('netoIngresos').textContent = `$${netoIngresos.toLocaleString('es-CL')}`;
    document.getElementById('netoEgresos').textContent = `$${netoEgresos.toLocaleString('es-CL')}`;
    document.getElementById('margenNeto').textContent = `$${margenNeto.toLocaleString('es-CL')}`;
    document.getElementById('ivaDebito').textContent = `$${ivaDebito.toLocaleString('es-CL')}`;
    document.getElementById('ivaCredito').textContent = `$${ivaCredito.toLocaleString('es-CL')}`;
    document.getElementById('ivaNeto').textContent = `$${ivaNeto.toLocaleString('es-CL')}`;
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
            <td>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    ${imgDisplay}
                    <span style="font-weight: 600;">${p.nombre}</span>
                </div>
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

// Cierra TODOS los modales antes de abrir uno nuevo (evita apilamiento)
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    document.body.classList.remove('no-scroll');
}

window.openProductModal = async function () {
    closeAllModals(); // Asegurar que no haya otro modal abierto

    form.reset();
    document.getElementById('prodId').value = '';
    document.getElementById('prodImage').value = '';
    if (document.getElementById('prodImageFile')) document.getElementById('prodImageFile').value = '';

    // Limpiar preview
    const preview = document.getElementById('imagePreview');
    preview.style.backgroundImage = '';
    Array.from(preview.children).forEach(el => el.style.display = '');

    document.getElementById('uploadStatus').textContent = '* Esperando archivo...';
    document.getElementById('uploadStatus').style.color = 'var(--text-muted)';

    // Cargar select de productores
    const productores = await DataManager.getProductores();
    const select = document.getElementById('prodProducer');
    select.innerHTML = '<option value="">Selecciona un productor...</option>' +
        productores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

    // Cargar select de categorías dinámicamente
    try {
        const categorias = await DataManager.getCategorias();
        const catSelect = document.getElementById('prodCategory');
        if (catSelect) {
            catSelect.innerHTML = '<option value="">Selecciona una categoría...</option>' +
                categorias.map(c => `<option value="${c.slug}">${c.icono} ${c.nombre}</option>`).join('');
        }
    } catch (err) {
        console.error('Error al cargar categorías en select:', err);
    }

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
        // Usar background-image para una previsualización robusta sin problemas de overflow
        preview.style.backgroundImage = `url('${url}')`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        preview.style.backgroundRepeat = 'no-repeat';
        // Ocultar el contenido de texto/icono interno
        Array.from(preview.children).forEach(el => el.style.display = 'none');
    } else {
        preview.style.backgroundImage = '';
        preview.style.backgroundSize = '';
        preview.style.backgroundPosition = '';
        // Mostrar de nuevo el contenido de texto/icono
        Array.from(preview.children).forEach(el => el.style.display = '');
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
    let total = parseFloat(document.getElementById('prodPrice').value) || 0;
    if (total < 0) {
        total = 0;
        document.getElementById('prodPrice').value = 0;
    }
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

    const rawPrice = parseInt(document.getElementById('prodPrice').value) || 0;
    const rawStock = parseInt(document.getElementById('prodStock').value) || 0;

    const data = {
        nombre: document.getElementById('prodName').value,
        precio_venta: Math.max(0, rawPrice),
        stock: Math.max(0, rawStock),
        categoria: document.getElementById('prodCategory').value,
        productor_id: producerId ? parseInt(producerId) : null,
        descripcion: document.getElementById('prodDesc').value,
        imagen_url: document.getElementById('prodImage').value,
        activo: true,
        visible_tienda: true,
        costo_proveedor: Math.max(0, Math.round(rawPrice * 0.7))
    };

    try {
        if (id) {
            await DataManager.updateProducto(parseInt(id), data);
        } else {
            await DataManager.createProducto(data);
        }
        closeProductModal();
        loadProducts();
        loadDashboard();
    } catch (err) {
        console.error('Error saving product:', err);
        alert('❌ Error al guardar producto.');
    }
});

// ===== PEDIDOS =====
window.loadOrders = async function () {
    const tbody = document.getElementById('ordersTableBody');
    const orders = await DataManager.getPedidosFull();

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay pedidos registrados aún.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map((order) => {
        const orderStatusClass = order.estado === 'pagado' || order.estado === 'entregado' ? 'status-active' : 'status-inactive';
        return `
        <tr>
            <td>#${order.id}</td>
            <td>${new Date(order.fecha).toLocaleDateString('es-CL')}</td>
            <td>${order.cliente}</td>
            <td style="font-size: 0.85rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${order.productos}">
                ${order.productos}
            </td>
            <td>$${order.total.toLocaleString('es-CL')}</td>
            <td><span class="status-badge ${orderStatusClass}">${order.estado}</span></td>
            <td>
                <button class="action-btn" onclick="viewOrderDetails(${order.id})" title="Ver detalles">👁️</button>
                ${order.estado === 'pendiente' ? `<button class="action-btn" onclick="processOrder(${order.id})" title="Marcar como Pagado">✓</button>` : ''}
            </td>
        </tr>
    `}).join('');
}

window.processOrder = async function (orderId) {
    const orders = await DataManager.getPedidosFull();
    const order = orders.find(o => o.id === orderId);

    if (!order) return;
    if (order.estado === 'pagado') {
        alert('Este pedido ya fue procesado y pagado.');
        return;
    }

    if (confirm(`¿Procesar pedido #${orderId}? Esto marcará el pedido como pagado.`)) {
        try {
            // Actualizar estado del pedido en Supabase (el stock ya se descontó automáticamente al comprar)
            await DataManager.updatePedido(orderId, { estado: 'pagado', estado_pago: 'pagado' });

            await initializeAdmin(); // Recargar todo
            alert('✅ Pedido marcado como pagado correctamente.');
        } catch (error) {
            console.error('Error processing order:', error);
            alert('❌ Error al procesar el pedido.');
        }
    }
}

window.viewOrderDetails = async function (orderId) {
    try {
        const orders = await DataManager.getPedidosFull();
        const order = orders.find(o => o.id === orderId);
        if (order) {
            alert(`DETALLE PEDIDO #${orderId}\n\nCliente: ${order.cliente}\nProductos: ${order.productos}\nTotal: $${order.total.toLocaleString('es-CL')}\nEstado: ${order.estado}`);
        } else {
            alert('Pedido no encontrado.');
        }
    } catch (e) {
        console.error(e);
    }
}

// ===== SUSCRIPTORES =====
const subModal = document.getElementById('subscriberModal');
const subForm = document.getElementById('subscriberForm');

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
            <td><span class="status-badge" style="background:#333; color:white;">${s.plan}</span></td>
            <td>${new Date(s.fecha_inicio).toLocaleDateString('es-CL')}</td>
            <td><span class="status-badge ${s.estado === 'activa' || s.estado === 'activo' ? 'status-active' : 'status-inactive'}">${s.estado}</span></td>
            <td>
                <button class="action-btn" onclick="editSubscriber(${s.id})">✏️</button>
                <button class="action-btn" onclick="deleteSubscriber(${s.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

window.openSubscriberModal = function () {
    if (subForm) subForm.reset();
    document.getElementById('subId').value = '';
    subModal.classList.add('active');
    document.body.classList.add('no-scroll');
}

window.closeSubscriberModal = function () {
    subModal.classList.remove('active');
    document.body.classList.remove('no-scroll');
}

window.editSubscriber = async function (id) {
    try {
        const subscribers = await DataManager.getSubscribers();
        const s = subscribers.find(x => x.id === id);
        if (s) {
            openSubscriberModal();
            document.getElementById('subId').value = s.id;
            document.getElementById('subName').value = s.nombre;
            document.getElementById('subEmail').value = s.email;
            document.getElementById('subPlan').value = s.plan;
            document.getElementById('subStatus').value = s.estado;
        }
    } catch (e) {
        console.error(e);
    }
}

if (subForm) {
    subForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('subId').value;
        const name = document.getElementById('subName').value;
        const email = document.getElementById('subEmail').value;
        const planName = document.getElementById('subPlan').value;
        const statusVal = document.getElementById('subStatus').value;

        try {
            if (id) {
                await DataManager.updateSuscripcion(parseInt(id), { estado: statusVal });
                alert('✅ Suscripción actualizada correctamente.');
            } else {
                let packId = 1;
                if (planName.includes('Experiencia')) packId = 2;
                if (planName.includes('Coleccionista')) packId = 3;

                const cliente = await DataManager.getOrCreateCliente(email, name);
                await DataManager.createSuscripcion(cliente.id, packId);
                alert('✅ Suscriptor creado correctamente.');
            }

            closeSubscriberModal();
            await initializeAdmin();
        } catch (error) {
            console.error('Error guardando suscriptor:', error);
            alert('❌ Error al guardar suscriptor.');
        }
    });
}

window.deleteSubscriber = async function (id) {
    if (confirm('¿Eliminar esta suscripción?')) {
        try {
            await DataManager.deleteSuscripcion(id);
            await initializeAdmin();
            alert('✅ Suscripción eliminada.');
        } catch (e) {
            console.error(e);
            alert('❌ Error al eliminar la suscripción.');
        }
    }
}

// ===== CONFIGURACIÓN DEL SISTEMA =====
window.loadSystemConfig = async function () {
    try {
        const [instagram, facebook, whatsapp, email, minPurchase, freeShipping] = await Promise.all([
            DataManager.getConfig('instagram_url'),
            DataManager.getConfig('facebook_url'),
            DataManager.getConfig('whatsapp'),
            DataManager.getConfig('email_contacto'),
            DataManager.getConfig('compra_minima'),
            DataManager.getConfig('envio_gratis_desde')
        ]);

        document.getElementById('conf_instagram').value = instagram || '';
        document.getElementById('conf_facebook').value = facebook || '';
        document.getElementById('conf_whatsapp').value = whatsapp || '';
        document.getElementById('conf_email').value = email || '';
        document.getElementById('conf_min_purchase').value = minPurchase || '15000';
        document.getElementById('conf_free_shipping').value = freeShipping || '50000';
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
            'envio_gratis_desde': document.getElementById('conf_free_shipping').value
        };

        const entries = Object.entries(configs);
        for (const [key, value] of entries) {
            if (value !== undefined && value !== null) {
                console.log(`💾 Guardando: ${key}...`);
                await DataManager.setConfig(key, value);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        alert('✅ Configuración guardada con éxito.');
    } catch (error) {
        console.error('Error detallado de guardado:', error);
        const errorMsg = error.message || error.details || 'Error desconocido';
        alert(`❌ Error al guardar la configuración: ${errorMsg}\n\nSi el error persiste, verifica las políticas RLS en Supabase.`);
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

// Inyectar llamada a loadProducers en showSection
const originalShowSection = window.showSection;
window.showSection = function (id) {
    if (id === 'configuracion') {
        loadProducers();
    }
    if (originalShowSection) originalShowSection(id);
}

// ===== CATEGORIAS CONTROLADORES (INTEGRADOS EN PRODUCTOS) =====
window.openCategoriesManagementModal = async function () {
    closeAllModals(); // Cerrar cualquier modal abierto antes

    const catForm = document.getElementById('inlineCategoryForm');
    if (catForm) catForm.reset();
    const hiddenId = document.getElementById('inlineCatId');
    if (hiddenId) hiddenId.value = '';

    const submitBtn = document.getElementById('inlineCatSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Guardar';

    const catModal = document.getElementById('categoriesManagementModal');
    if (catModal) {
        catModal.classList.add('active');
        document.body.classList.add('no-scroll');
    } else {
        console.error('Modal #categoriesManagementModal no encontrado en el DOM');
        return;
    }

    await loadInlineCategories();
}

window.closeCategoriesManagementModal = function () {
    document.getElementById('categoriesManagementModal').classList.remove('active');
    document.body.classList.remove('no-scroll');
}

window.loadInlineCategories = async function () {
    const tbody = document.getElementById('inlineCategoriesTableBody');
    if (!tbody) return;
    
    try {
        const categorias = await DataManager.getCategorias();
        
        if (!categorias || categorias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No hay categorías registradas.</td></tr>';
            return;
        }
        
        tbody.innerHTML = categorias.map(c => `
            <tr>
                <td style="font-size: 1.3rem; text-align: center; width: 60px; padding: 0.6rem;">${c.icono}</td>
                <td style="font-weight: 600; padding: 0.6rem;">${c.nombre}</td>
                <td style="padding: 0.6rem;"><span class="status-badge" style="background:#333; color:white;">${c.slug}</span></td>
                <td style="padding: 0.6rem; text-align: center;">
                    <button type="button" class="action-btn" onclick="editInlineCategory(${c.id})" style="margin-right: 0.5rem; background: none; border: none; cursor: pointer;">✏️</button>
                    <button type="button" class="action-btn" onclick="deleteInlineCategory(${c.id})" style="background: none; border: none; cursor: pointer;">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading inline categories:', err);
    }
}

window.saveInlineCategory = async function () {
    const id = document.getElementById('inlineCatId').value;
    const data = {
        nombre: document.getElementById('inlineCatName').value,
        slug: document.getElementById('inlineCatSlug').value.toLowerCase().trim(),
        icono: document.getElementById('inlineCatIcon').value
    };

    try {
        if (id) {
            await DataManager.updateCategoria(parseInt(id), data);
        } else {
            await DataManager.createCategoria(data);
        }
        
        // Reset form
        const form = document.getElementById('inlineCategoryForm');
        if (form) form.reset();
        document.getElementById('inlineCatId').value = '';
        document.getElementById('inlineCatSubmitBtn').textContent = 'Guardar';
        
        // Recargar listado en modal
        await loadInlineCategories();
        // Recargar dropdowns y productos
        if (typeof loadProducts === 'function') await loadProducts();
    } catch (err) {
        console.error('Error saving inline category:', err);
        alert('❌ Error al guardar la categoría. Asegúrate de que el slug o el nombre no estén repetidos.');
    }
}

window.editInlineCategory = async function (id) {
    try {
        const categorias = await DataManager.getCategorias();
        const c = categorias.find(x => x.id === id);
        if (c) {
            document.getElementById('inlineCatId').value = c.id;
            document.getElementById('inlineCatName').value = c.nombre;
            document.getElementById('inlineCatSlug').value = c.slug;
            document.getElementById('inlineCatIcon').value = c.icono;
            document.getElementById('inlineCatSubmitBtn').textContent = 'Actualizar';
        }
    } catch (err) {
        console.error('Error editing inline category:', err);
    }
}

window.deleteInlineCategory = async function (id) {
    if (confirm('¿Seguro que deseas eliminar esta categoría? Esto afectará a los productos asociados.')) {
        try {
            await DataManager.deleteCategoria(id);
            await loadInlineCategories();
            if (typeof loadProducts === 'function') await loadProducts();
        } catch (err) {
            console.error('Error deleting inline category:', err);
            alert('❌ Error al eliminar la categoría.');
        }
    }
}
