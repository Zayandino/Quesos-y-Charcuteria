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

// ===== SISTEMA DE NOTIFICACIONES TOAST (reemplaza alert bloqueante) =====
function showAdminToast(message, type = 'success') {
    const existing = document.getElementById('adminToast');
    if (existing) existing.remove();

    const palette = {
        success: { bg: 'rgba(46,204,113,0.12)', border: '#2ecc71', icon: '✅' },
        error:   { bg: 'rgba(231,76,60,0.12)',  border: '#e74c3c', icon: '❌' },
        info:    { bg: 'rgba(52,152,219,0.12)', border: '#3498db', icon: 'ℹ️'  }
    };
    const p = palette[type] || palette.success;

    const toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.style.cssText = [
        'position:fixed', 'bottom:28px', 'right:28px', 'z-index:9999',
        `background:${p.bg}`, `border:1px solid ${p.border}`, 'border-radius:10px',
        'padding:14px 22px', 'display:flex', 'align-items:center', 'gap:12px',
        'color:#e0e0e0', 'font-size:0.92rem', 'font-weight:500',
        'box-shadow:0 12px 30px rgba(0,0,0,0.6)',
        'animation:adminToastIn 0.25s ease',
        'max-width:380px', 'font-family:Outfit,sans-serif'
    ].join(';');
    toast.innerHTML = `<span style="font-size:1.1rem;">${p.icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    // Agregar keyframes solo una vez
    if (!document.getElementById('adminToastKeyframes')) {
        const s = document.createElement('style');
        s.id = 'adminToastKeyframes';
        s.textContent = '@keyframes adminToastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}';
        document.head.appendChild(s);
    }
    setTimeout(() => { if (document.getElementById('adminToast') === toast) toast.remove(); }, 3500);
}
window.showAdminToast = showAdminToast;

// ===== ADMIN INITIALIZATION =====
async function initializeAdmin() {
    const sections = [
        { fn: loadDashboard, name: 'Dashboard' },
        { fn: loadProducts, name: 'Productos' },
        { fn: loadSubscribers, name: 'Suscriptores' },
        { fn: loadOrders, name: 'Pedidos' },
        { fn: loadProducers, name: 'Productores' },
        // Cargar config de redes y parámetros para pre-poblar el formulario
        { fn: async () => { if (typeof window.loadSystemConfig === 'function') await window.loadSystemConfig(); }, name: 'Configuración' }
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
            <td>
                <span class="status-badge ${p.activo !== false ? 'status-active' : 'status-inactive'}" style="display:inline-block;margin-bottom:3px;">
                    ${p.activo !== false ? 'Activo' : 'Inactivo'}
                </span><br>
                <span class="status-badge" style="background:${p.visible_tienda !== false ? 'rgba(52,152,219,0.15)' : 'rgba(127,127,127,0.1)'};color:${p.visible_tienda !== false ? '#3498db' : '#666'};font-size:0.68rem;">
                    ${p.visible_tienda !== false ? '👁 Visible' : '🙈 Oculto'}
                </span>
            </td>
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
        showAdminToast('Error al guardar el producto. Intenta de nuevo.', 'error');
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
            <td style="font-weight:700;color:var(--primary);">${order.numero_pedido || ('#' + order.id)}</td>
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
            showAdminToast('Pedido marcado como pagado correctamente.');
        } catch (error) {
            console.error('Error processing order:', error);
            showAdminToast('Error al procesar el pedido.', 'error');
        }
    }
}

window.viewOrderDetails = async function (orderId) {
    try {
        const orders = await DataManager.getPedidosFull();
        const order = orders.find(o => o.id === orderId);
        if (!order) { showAdminToast('Pedido no encontrado.', 'error'); return; }

        const content = document.getElementById('orderDetailsContent');
        if (!content) { showAdminToast('Modal de detalles no disponible.', 'error'); return; }

        content.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                    <span style="font-size:0.72rem;color:#888;text-transform:uppercase;letter-spacing:.05em;">N\u00famero de Pedido</span>
                    <div style="font-size:1.2rem;font-weight:700;color:var(--primary);margin-top:.3rem;">${order.numero_pedido || ('#' + order.id)}</div>
                </div>
                <div>
                    <span style="font-size:0.72rem;color:#888;text-transform:uppercase;letter-spacing:.05em;">Fecha</span>
                    <div style="font-size:1rem;margin-top:.3rem;">${new Date(order.fecha).toLocaleDateString('es-CL')}</div>
                </div>
                <div>
                    <span style="font-size:0.72rem;color:#888;text-transform:uppercase;letter-spacing:.05em;">Cliente</span>
                    <div style="font-size:1rem;font-weight:600;margin-top:.3rem;">${order.cliente}</div>
                </div>
                <div>
                    <span style="font-size:0.72rem;color:#888;text-transform:uppercase;letter-spacing:.05em;">Total</span>
                    <div style="font-size:1.2rem;font-weight:700;color:#2ecc71;margin-top:.3rem;">$${order.total.toLocaleString('es-CL')}</div>
                </div>
            </div>
            <div>
                <span style="font-size:0.72rem;color:#888;text-transform:uppercase;letter-spacing:.05em;">Estado</span>
                <div style="margin-top:.5rem;">
                    <span class="status-badge ${order.estado === 'pagado' || order.estado === 'entregado' ? 'status-active' : 'status-inactive'}">${order.estado}</span>
                </div>
            </div>
            <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:1rem;">
                <span style="font-size:0.72rem;color:#888;text-transform:uppercase;letter-spacing:.05em;">Productos</span>
                <div style="font-size:0.88rem;color:#ccc;margin-top:.4rem;line-height:1.7;">${order.productos || 'Sin detalle'}</div>
            </div>
        `;

        // Botón de marcar pagado solo para pedidos pendientes
        const markBtn = document.getElementById('markOrderPaidBtn');
        if (markBtn) {
            if (order.estado === 'pendiente') {
                markBtn.style.display = 'inline-flex';
                markBtn.onclick = () => { closeOrderDetailsModal(); processOrder(orderId); };
            } else {
                markBtn.style.display = 'none';
            }
        }

        const detailsModal = document.getElementById('orderDetailsModal');
        if (detailsModal) {
            detailsModal.classList.add('active');
            document.body.classList.add('no-scroll');
        }
    } catch (e) {
        console.error(e);
        showAdminToast('Error al cargar los detalles del pedido.', 'error');
    }
}

window.closeOrderDetailsModal = function () {
    const m = document.getElementById('orderDetailsModal');
    if (m) m.classList.remove('active');
    document.body.classList.remove('no-scroll');
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
                showAdminToast('Suscripci\u00f3n actualizada correctamente.');
            } else {
                let packId = 1;
                if (planName.includes('Experiencia')) packId = 2;
                if (planName.includes('Coleccionista')) packId = 3;

                const cliente = await DataManager.getOrCreateCliente(email, name);
                await DataManager.createSuscripcion(cliente.id, packId);
                showAdminToast('Suscriptor creado correctamente.');
            }

            closeSubscriberModal();
            await initializeAdmin();
        } catch (error) {
            console.error('Error guardando suscriptor:', error);
            showAdminToast('Error al guardar suscriptor.', 'error');
        }
    });
}

window.deleteSubscriber = async function (id) {
    if (confirm('¿Eliminar esta suscripción?')) {
        try {
            await DataManager.deleteSuscripcion(id);
            await initializeAdmin();
            showAdminToast('Suscripci\u00f3n eliminada correctamente.');
        } catch (e) {
            console.error(e);
            showAdminToast('Error al eliminar la suscripci\u00f3n.', 'error');
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

        showAdminToast('Configuraci\u00f3n guardada con \u00e9xito.');
    } catch (error) {
        console.error('Error detallado de guardado:', error);
        const errorMsg = error.message || error.details || 'Error desconocido';
        showAdminToast(`Error al guardar: ${errorMsg.substring(0, 80)}`, 'error');
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
        showAdminToast('Productor guardado con \u00e9xito.');
        closeProducerModal();
        loadProducers();
        loadDashboard();
    } catch (error) {
        console.error('Error saving producer:', error);
        showAdminToast('Error al guardar productor.', 'error');
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

// Inyectar llamada a loadProducers y loadSystemConfig en showSection
const originalShowSection = window.showSection;
window.showSection = function (id) {
    if (id === 'configuracion') {
        loadProducers();
        if (typeof window.loadSystemConfig === 'function') window.loadSystemConfig();
    }
    if (id === 'packs') {
        loadPacks();
    }
    if (originalShowSection) originalShowSection(id);
}

// =============================================
// ===== MÓDULO PACKS DE SUSCRIPCIÓN =====
// =============================================

// Estado interno del constructor de packs
let _packInventoryAll = [];   // Todos los productos del inventario
let _packContent = [];        // [{producto_id, nombre, cantidad, precio_unitario, costo_unitario, stock, stock_minimo}]

// ----- TABLA DE PACKS -----
window.loadPacks = async function () {
    const tbody = document.getElementById('packsTableBody');
    if (!tbody) return;

    try {
        const [packs, productos] = await Promise.all([
            DataManager.getPacks(),
            DataManager.getProductos()
        ]);

        // Mapa de productos para lookup rápido
        const prodMap = {};
        (productos || []).forEach(p => { prodMap[p.id] = p; });

        // Detectar productos con stock crítico en packs activos
        _renderPackStockAlerts(packs, prodMap);

        if (!packs || packs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem; color:var(--text-muted);">
                No hay packs creados. Haz click en <strong>+ Nuevo Pack</strong> para comenzar.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = packs.map(pack => {
            // Calcular métricas del pack
            const isArray = Array.isArray(pack.contenido);
            const contenido = isArray ? pack.contenido : [];
            const isLegacy = !isArray && pack.contenido && typeof pack.contenido === 'object';
            
            const nItems = contenido.reduce((s, i) => s + (i.cantidad || 1), 0);
            const costoEst = contenido.reduce((s, i) => {
                const prod = prodMap[i.producto_id];
                const costo = prod ? prod.costo_proveedor : (i.costo_unitario || 0);
                return s + costo * (i.cantidad || 1);
            }, 0);
            const precio = pack.precio_mensual || 0;
            const margen = precio - costoEst;
            const pctMargen = precio > 0 ? Math.round((margen / precio) * 100) : 0;

            const margenColor = pctMargen >= 30 ? '#2ecc71' : pctMargen >= 15 ? '#f1c40f' : '#e74c3c';

            // Detectar si algún producto del pack está en stock crítico
            const tieneStockCritico = contenido.some(item => {
                const prod = prodMap[item.producto_id];
                return prod && prod.stock < prod.stock_minimo;
            });

            const contenidoDisplay = isLegacy
                ? `<span style="background:rgba(212,175,55,0.15); color:var(--primary); padding:0.3rem 0.7rem; border-radius:20px; font-size:0.75rem;" title="Pack con descripción de texto. Haz clic en ✏️ para armarlo con productos del inventario">📝 Configurar items</span>`
                : `<span style="background:rgba(255,255,255,0.06); padding:0.3rem 0.7rem; border-radius:20px; font-size:0.8rem;">
                    ${contenido.length} producto${contenido.length !== 1 ? 's' : ''} · ${nItems} u.
                   </span>`;

            return `
            <tr style="${!pack.activo ? 'opacity:0.5;' : ''}">
                <td>
                    <div style="font-weight:700; color:white; display:flex; align-items:center; gap:0.6rem;">
                        ${tieneStockCritico ? '<span title="Stock crítico en este pack" style="color:#e74c3c; font-size:1rem;">⚠️</span>' : ''}
                        ${pack.nombre}
                        ${pack.badge ? `<span style="background:rgba(212,175,55,0.2); color:var(--primary); font-size:0.65rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:20px; letter-spacing:.05em;">${pack.badge}</span>` : ''}
                    </div>
                    ${pack.descripcion ? `<div style="font-size:0.75rem; color:#666; margin-top:0.2rem; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${pack.descripcion}</div>` : ''}
                </td>
                <td style="font-weight:700; color:var(--primary); font-size:1.1rem;">$${precio.toLocaleString('es-CL')}</td>
                <td>
                    ${contenidoDisplay}
                </td>
                <td style="color:#e74c3c; font-weight:600;">${costoEst > 0 ? `$${costoEst.toLocaleString('es-CL')}` : '<span style="color:#666; font-size:0.8rem;">—</span>'}</td>
                <td>
                    ${costoEst > 0 ? `
                        <div style="color:${margenColor}; font-weight:700;">${pctMargen}%</div>
                        <div style="font-size:0.72rem; color:#555;">$${margen.toLocaleString('es-CL')}</div>
                    ` : '<span style="color:#666; font-size:0.8rem;">—</span>'}
                </td>
                <td>
                    <span class="status-badge ${pack.activo ? 'status-active' : 'status-inactive'}" style="cursor:pointer;"
                        onclick="togglePackActivo(${pack.id}, ${pack.activo})"
                        title="Click para ${pack.activo ? 'desactivar' : 'activar'}">
                        ${pack.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <button class="action-btn" onclick="editPack(${pack.id})" title="Editar pack">✏️</button>
                    <button class="action-btn" onclick="deletePack(${pack.id})" title="Eliminar pack">🗑️</button>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        console.error('Error al cargar packs:', err);
        showAdminToast('Error al cargar los packs.', 'error');
    }
}

// Alertas de stock crítico en la sección de packs
function _renderPackStockAlerts(packs, prodMap) {
    const container = document.getElementById('packStockAlerts');
    if (!container) return;

    const alertas = [];
    (packs || []).filter(p => p.activo).forEach(pack => {
        const contenido = Array.isArray(pack.contenido) ? pack.contenido : [];
        contenido.forEach(item => {
            const prod = prodMap[item.producto_id];
            if (prod && prod.stock < prod.stock_minimo) {
                alertas.push(`<strong>${prod.nombre}</strong> (Pack: ${pack.nombre}) — Stock: ${prod.stock} / mín: ${prod.stock_minimo}`);
            }
        });
    });

    if (alertas.length > 0) {
        container.innerHTML = `
        <div style="background:rgba(231,76,60,0.08); border:1px solid rgba(231,76,60,0.25); border-radius:10px; padding:1rem 1.4rem;">
            <div style="color:#e74c3c; font-weight:700; margin-bottom:0.5rem; font-size:0.88rem;">⚠️ Productos con stock crítico en packs activos:</div>
            ${alertas.map(a => `<div style="font-size:0.8rem; color:#bbb; margin-top:0.3rem;">• ${a}</div>`).join('')}
        </div>`;
    } else {
        container.innerHTML = '';
    }
}

// ----- MODAL CONSTRUCTOR -----
window.openPackModal = async function (packData) {
    closeAllModals();

    // Reset estado
    _packContent = [];
    document.getElementById('packId').value = '';
    document.getElementById('packName').value = '';
    document.getElementById('packPrice').value = '';
    document.getElementById('packBadge').value = '';
    document.getElementById('packDesc').value = '';
    document.getElementById('packInventorySearch').value = '';

    // Toggle activo ON por defecto
    const chk = document.getElementById('packActivo');
    chk.checked = true;
    document.getElementById('packActivoBg').style.background = 'var(--primary)';
    document.getElementById('packActivoKnob').style.left = '22px';

    document.getElementById('packModalTitle').textContent = '📦 Nuevo Pack';

    // Si es edición, rellenar campos
    if (packData) {
        document.getElementById('packId').value = packData.id;
        document.getElementById('packName').value = packData.nombre;
        document.getElementById('packPrice').value = packData.precio_mensual;
        document.getElementById('packBadge').value = packData.badge || '';
        document.getElementById('packDesc').value = packData.descripcion || '';
        chk.checked = !!packData.activo;
        document.getElementById('packActivoBg').style.background = packData.activo ? 'var(--primary)' : 'rgba(255,255,255,0.15)';
        document.getElementById('packActivoKnob').style.left = packData.activo ? '22px' : '2px';
        document.getElementById('packModalTitle').textContent = `✏️ Editar Pack: ${packData.nombre}`;

        // Cargar contenido previo
        if (Array.isArray(packData.contenido)) {
            _packContent = packData.contenido.map(i => ({ ...i }));
        }
    }

    // Cargar inventario
    try {
        _packInventoryAll = await DataManager.getProductos();
    } catch (e) {
        _packInventoryAll = [];
    }

    _renderPackInventory(_packInventoryAll);
    _renderPackContent();
    recalcPackMetrics();

    document.getElementById('packModal').classList.add('active');
    document.body.classList.add('no-scroll');
}

window.closePackModal = function () {
    document.getElementById('packModal').classList.remove('active');
    document.body.classList.remove('no-scroll');
}

// Renderiza la lista de inventario (izquierda)
function _renderPackInventory(products) {
    const container = document.getElementById('packInventoryList');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:2rem; color:#555;">No hay productos en inventario.</div>`;
        return;
    }

    container.innerHTML = products.map(p => {
        // Semáforo de stock
        let stockColor = '#2ecc71'; // verde
        let stockIcon = '🟢';
        let stockLabel = 'Ok';
        const minimo = p.stock_minimo || 5;

        if (p.stock < minimo) {
            stockColor = '#e74c3c'; stockIcon = '🔴'; stockLabel = 'Crítico';
        } else if (p.stock < minimo * 2) {
            stockColor = '#f1c40f'; stockIcon = '🟡'; stockLabel = 'Bajo';
        }

        // Verificar si ya está en el pack
        const enPack = _packContent.find(i => i.producto_id === p.id);

        return `
        <div style="
            display:flex; align-items:center; gap:0.8rem;
            background: ${enPack ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)'};
            border: 1px solid ${enPack ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.05)'};
            border-radius:8px; padding:0.7rem 1rem; transition:0.2s;
        " id="inv-item-${p.id}">
            <div style="font-size:1.3rem;">${p.categoria === 'queso' ? '🧀' : '🥓'}</div>
            <div style="flex:1; min-width:0;">
                <div style="font-weight:600; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.nombre}</div>
                <div style="font-size:0.72rem; color:#888; margin-top:0.1rem;">
                    $${(p.precio_venta || 0).toLocaleString('es-CL')} · Costo $${(p.costo_proveedor || 0).toLocaleString('es-CL')}
                </div>
            </div>
            <div style="text-align:center; flex-shrink:0;">
                <div style="font-size:0.9rem;">${stockIcon}</div>
                <div style="font-size:0.65rem; color:${stockColor}; font-weight:700; white-space:nowrap;">${p.stock} u.</div>
                <div style="font-size:0.6rem; color:#555;">${stockLabel}</div>
            </div>
            <button onclick="addProductToPack(${p.id})"
                style="background:${enPack ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)'}; border:none; border-radius:6px;
                       width:32px; height:32px; cursor:pointer; color:${enPack ? 'var(--primary)' : 'white'};
                       font-size:1rem; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:0.2s;"
                title="${enPack ? 'Ya en el pack (click para agregar más)' : 'Agregar al pack'}"
                onmouseover="this.style.background='rgba(212,175,55,0.3)'"
                onmouseout="this.style.background='${enPack ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)'}'">
                ${enPack ? '✓' : '+'}
            </button>
        </div>`;
    }).join('');
}

// Renderiza el contenido del pack (derecha)
function _renderPackContent() {
    const list = document.getElementById('packContentList');
    const empty = document.getElementById('packContentEmpty');
    if (!list) return;

    // Limpiar items previos (dejar el div empty)
    Array.from(list.querySelectorAll('.pack-content-item')).forEach(el => el.remove());

    if (_packContent.length === 0) {
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';

    _packContent.forEach(item => {
        const div = document.createElement('div');
        div.className = 'pack-content-item';
        div.setAttribute('data-pid', item.producto_id);

        // Stock warning inline
        const stockWarn = item.stock !== undefined && item.stock < (item.stock_minimo || 5)
            ? `<span title="Stock crítico" style="color:#e74c3c; font-size:0.75rem;">⚠️ Stock: ${item.stock}</span>`
            : '';

        div.style.cssText = `
            display:flex; align-items:center; gap:0.7rem;
            background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
            border-radius:8px; padding:0.6rem 0.8rem;
        `;
        div.innerHTML = `
            <div style="flex:1; min-width:0;">
                <div style="font-weight:600; font-size:0.83rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.nombre}</div>
                <div style="font-size:0.7rem; color:#888; margin-top:0.1rem;">
                    $${(item.precio_unitario || 0).toLocaleString('es-CL')} c/u
                    ${stockWarn}
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:0.3rem; flex-shrink:0;">
                <button onclick="updatePackQty(${item.producto_id}, -1)"
                    style="background:rgba(255,255,255,0.06); border:none; border-radius:4px; width:24px; height:24px;
                           cursor:pointer; color:white; font-size:1rem; display:flex; align-items:center; justify-content:center;">−</button>
                <span id="qty-${item.producto_id}" style="font-weight:700; font-size:0.95rem; min-width:24px; text-align:center;">${item.cantidad}</span>
                <button onclick="updatePackQty(${item.producto_id}, 1)"
                    style="background:rgba(255,255,255,0.06); border:none; border-radius:4px; width:24px; height:24px;
                           cursor:pointer; color:white; font-size:1rem; display:flex; align-items:center; justify-content:center;">+</button>
            </div>
            <button onclick="removeProductFromPack(${item.producto_id})"
                style="background:none; border:none; cursor:pointer; color:#555; font-size:1rem; padding:0; transition:0.2s; flex-shrink:0;"
                onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#555'">✕</button>
        `;
        list.appendChild(div);
    });
}

// Añadir un producto al contenido del pack
window.addProductToPack = function (productoId) {
    const prod = _packInventoryAll.find(p => p.id === productoId);
    if (!prod) return;

    const existing = _packContent.find(i => i.producto_id === productoId);
    if (existing) {
        existing.cantidad += 1;
        const qtySpan = document.getElementById(`qty-${productoId}`);
        if (qtySpan) qtySpan.textContent = existing.cantidad;
    } else {
        _packContent.push({
            producto_id: productoId,
            nombre: prod.nombre,
            cantidad: 1,
            precio_unitario: prod.precio_venta || 0,
            costo_unitario: prod.costo_proveedor || 0,
            stock: prod.stock,
            stock_minimo: prod.stock_minimo || 5
        });
        _renderPackContent();
    }

    // Actualizar botón del inventario
    const btn = document.querySelector(`#inv-item-${productoId} button`);
    if (btn) {
        btn.textContent = '✓';
        btn.style.background = 'rgba(212,175,55,0.2)';
        btn.style.color = 'var(--primary)';
    }

    recalcPackMetrics();
}

// Ajustar cantidad (+1 / -1)
window.updatePackQty = function (productoId, delta) {
    const item = _packContent.find(i => i.producto_id === productoId);
    if (!item) return;

    item.cantidad = Math.max(1, item.cantidad + delta);
    const qtySpan = document.getElementById(`qty-${productoId}`);
    if (qtySpan) qtySpan.textContent = item.cantidad;

    recalcPackMetrics();
}

// Eliminar producto del pack
window.removeProductFromPack = function (productoId) {
    _packContent = _packContent.filter(i => i.producto_id !== productoId);
    _renderPackContent();

    // Restablecer botón del inventario
    const btn = document.querySelector(`#inv-item-${productoId} button`);
    if (btn) {
        btn.textContent = '+';
        btn.style.background = 'rgba(255,255,255,0.06)';
        btn.style.color = 'white';
    }

    recalcPackMetrics();
}

// Recalcular métricas económicas del pack
window.recalcPackMetrics = function () {
    const precio = parseInt(document.getElementById('packPrice')?.value) || 0;
    const costoEst = _packContent.reduce((s, i) => s + (i.costo_unitario || 0) * i.cantidad, 0);
    const margen = precio - costoEst;
    const pct = precio > 0 ? Math.round((margen / precio) * 100) : 0;

    document.getElementById('pm_precio').textContent = `$${precio.toLocaleString('es-CL')}`;
    document.getElementById('pm_costo').textContent = `$${costoEst.toLocaleString('es-CL')}`;
    document.getElementById('pm_margen').textContent = `$${margen.toLocaleString('es-CL')}`;
    document.getElementById('pm_margen').style.color = margen >= 0 ? '#2ecc71' : '#e74c3c';

    const pctEl = document.getElementById('pm_pct');
    pctEl.textContent = `${pct}%`;
    pctEl.style.color = pct >= 30 ? '#2ecc71' : pct >= 15 ? '#f1c40f' : '#e74c3c';

    // Barra de margen (0-100%)
    const barWidth = Math.min(100, Math.max(0, pct));
    document.getElementById('pm_bar').style.width = `${barWidth}%`;

    let label = 'Sin datos';
    if (precio > 0) {
        label = pct >= 30 ? '✅ Margen saludable' : pct >= 15 ? '⚠️ Margen ajustado' : '🔴 Margen bajo — revisa el precio';
    }
    document.getElementById('pm_bar_label').textContent = label;
}

// Filtrar inventario por búsqueda
window.filterPackInventory = function (query) {
    const q = (query || '').toLowerCase().trim();
    const filtered = q
        ? _packInventoryAll.filter(p => p.nombre.toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q))
        : _packInventoryAll;
    _renderPackInventory(filtered);
}

// ----- GUARDAR PACK -----
window.savePackForm = async function () {
    const nombre = document.getElementById('packName').value.trim();
    const precio = parseInt(document.getElementById('packPrice').value) || 0;

    if (!nombre) {
        showAdminToast('El nombre del pack es obligatorio.', 'error');
        return;
    }
    if (precio <= 0) {
        showAdminToast('El precio mensual debe ser mayor a 0.', 'error');
        return;
    }
    if (_packContent.length === 0) {
        showAdminToast('Agrega al menos un producto al pack.', 'error');
        return;
    }

    const id = document.getElementById('packId').value;
    const activo = document.getElementById('packActivo').checked;

    // Guardar solo los campos necesarios en el JSONB
    const contenido = _packContent.map(i => ({
        producto_id: i.producto_id,
        nombre: i.nombre,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        costo_unitario: i.costo_unitario
    }));

    const packData = {
        nombre,
        precio_mensual: precio,
        descripcion: document.getElementById('packDesc').value.trim(),
        badge: document.getElementById('packBadge').value.trim() || null,
        contenido,
        activo,
        orden: 0
    };

    if (id) packData.id = parseInt(id);

    try {
        await DataManager.savePack(packData);
        showAdminToast(id ? 'Pack actualizado correctamente.' : 'Pack creado correctamente. Ya es visible en el sitio.');
        closePackModal();
        loadPacks();
    } catch (err) {
        console.error('Error al guardar pack:', err);
        showAdminToast(`Error al guardar el pack: ${err.message || 'Error desconocido'}`, 'error');
    }
}

// ----- EDITAR PACK -----
window.editPack = async function (id) {
    try {
        const packs = await DataManager.getPacks();
        const pack = packs.find(p => p.id === id);
        if (!pack) { showAdminToast('Pack no encontrado.', 'error'); return; }
        await openPackModal(pack);
    } catch (err) {
        console.error('Error al cargar pack:', err);
        showAdminToast('Error al cargar el pack.', 'error');
    }
}

// ----- ELIMINAR PACK -----
window.deletePack = async function (id) {
    if (!confirm('¿Eliminar este pack? Esta acción no se puede deshacer.\nLos suscriptores existentes no serán afectados.')) return;
    try {
        await DataManager.deletePack(id);
        showAdminToast('Pack eliminado correctamente.');
        loadPacks();
    } catch (err) {
        console.error('Error al eliminar pack:', err);
        showAdminToast('Error al eliminar el pack.', 'error');
    }
}

// ----- TOGGLE ACTIVO (desde tabla) -----
window.togglePackActivo = async function (id, currentActivo) {
    try {
        await DataManager.savePack({ id, activo: !currentActivo });
        showAdminToast(`Pack ${!currentActivo ? 'activado' : 'desactivado'} — ${!currentActivo ? 'ya es visible en el sitio' : 'oculto del sitio'}.`);
        loadPacks();
    } catch (err) {
        console.error('Error al actualizar pack:', err);
        showAdminToast('Error al actualizar el pack.', 'error');
    }
}

// ----- INTEGRACIÓN PEDIDOS: Descuento de stock al marcar como enviado -----
// Extender processOrder para descontar stock cuando estado cambia a 'enviado'
const _originalProcessOrder = window.processOrder;
window.processOrder = async function (orderId) {
    if (_originalProcessOrder) return _originalProcessOrder(orderId);
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
