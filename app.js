/* ========================================
   CABRA & CURADO - JAVASCRIPT PRINCIPAL
   Sitio Público - app.js
   ======================================== */

// ===== ESTADO GLOBAL =====
let cart = [];
let currentFilter = 'todos';
let builderSelectedIds = [];
let armadorProductos = [];

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🧀 DCAVA iniciando...');

    try {
        // Cargar carrito desde localStorage
        loadCart();

        // Inicializar selector de tema (Modo Claro / Oscuro)
        initThemeToggle();

        // Verificar si el sitio está en Modo Mantenimiento
        checkMaintenanceMode();

        // Inicializar el Armador de Tabla de forma inmediata
        initArmadorTabla();

        // Vincular event listeners de forma INMEDIATA para que los botones respondan sin esperar a la red
        setupEventListeners();
        setupFooterEventListeners();

        // Inicializar datos de ejemplo solo si Supabase está disponible
        try {
            if (DataManager && DataManager.supabase) {
                await initializeSampleData();
            } else {
                console.warn('⚠️ Supabase no disponible, omitiendo inicialización de datos de ejemplo');
            }
        } catch (e) {
            console.warn('⚠️ No se pudo inicializar datos de ejemplo (posible RLS o servidor caído):', e.message);
        }

        // Cargar productores, productos y filtros dinámicos de categorías
        await Promise.all([
            loadFilters().catch(e => console.error('Error cargando filtros:', e)),
            loadProductores().catch(e => console.error('Error cargando productores:', e)),
            loadProductos().catch(e => console.error('Error cargando productos:', e)),
            loadFooterConfig().catch(e => console.warn('Error cargando social:', e))
        ]);

        // Efectos visuales
        setupScrollEffects();
        setupAnimations();

        // Verificar sesión
        await checkAuthState().catch(e => console.error('Error verificando sesión:', e));

        console.log('✅ Sitio cargado correctamente');
    } catch (error) {
        console.error('❌ Error crítico durante la inicialización:', error);
    }
});

// ===== EFECTOS VISUALES =====
function setupScrollEffects() {
    const header = document.getElementById('header');

    // Efecto scroll en header
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Smooth scroll delegado a CSS (scroll-behavior: smooth) para evitar bugs de congelamiento
    // en navegadores Chromium donde choca JS y CSS smooth scroll.
}

function setupAnimations() {
    // Intersection Observer para animaciones de entrada
    const observerOptions = {
        threshold: 0.05,
        rootMargin: '0px 0px -30px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Si es un elemento con data-reveal, agregar clase CSS
                if (entry.target.hasAttribute('data-reveal')) {
                    entry.target.classList.add('active');
                } else {
                    // Secciones generales: quitar estilos inline para que sean visibles
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    entry.target.classList.add('section-revealed');
                }
                // Una vez visible, dejar de observar para no crear bucles
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // IMPORTANTE: NO aplicar opacity:0 si el usuario ya está en esa sección
    // Solo aplicar la animación si la sección está fuera del viewport
    document.querySelectorAll('.productores, .suscripciones, .catalogo, .contacto').forEach(section => {
        const rect = section.getBoundingClientRect();
        const isAlreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (!isAlreadyVisible) {
            // Solo aplicar la animación si la sección NO está visible aún
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        }
        observer.observe(section);
    });

    // Observar elementos con data-reveal (Manifiesto y nuevos componentes)
    document.querySelectorAll('[data-reveal]').forEach(el => {
        observer.observe(el);
    });

    // Seguridad adicional: después de 3 segundos, forzar visibilidad de todas las secciones
    // para evitar que queden en negro si el observer nunca dispara
    setTimeout(() => {
        document.querySelectorAll('.productores, .suscripciones, .catalogo, .contacto').forEach(section => {
            if (section.style.opacity === '0') {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }
        });
        document.querySelectorAll('[data-reveal]').forEach(el => {
            el.classList.add('active');
        });
    }, 3000);
}

// ===== INICIALIZAR DATOS DE EJEMPLO =====
async function initializeSampleData() {
    const productos = await DataManager.getProductos();

    if (productos.length === 0) {
        console.log('📦 Cargando productos de ejemplo...');

        // Crear productores de ejemplo
        const productores = [
            {
                nombre: 'La Cabresa',
                ubicacion: 'Chillán, Ñuble',
                especialidad: 'Quesos de cabra 100% leche chilena',
                contacto: 'contacto@lacabresa.cl',
                activo: true
            },
            {
                nombre: 'Arte Queso',
                ubicacion: 'Ovalle, Coquimbo',
                especialidad: 'Quesos de cabra de libre pastoreo',
                contacto: 'ventas@artequeso.cl',
                activo: true
            },
            {
                nombre: 'Artisan Lácteos',
                ubicacion: 'Valdivia, Los Ríos',
                especialidad: 'Quesos de cabra variados',
                contacto: 'info@artisan.cl',
                activo: true
            },
            {
                nombre: "Peter's Deli",
                ubicacion: 'Santiago, RM',
                especialidad: 'Embutidos artesanales sin gluten',
                contacto: 'hola@petersdeli.cl',
                activo: true
            },
            {
                nombre: 'Cecinas Chillán',
                ubicacion: 'Chillán, Ñuble',
                especialidad: 'Longanizas y prietas tradicionales',
                contacto: 'ventas@cecinaschillan.cl',
                activo: true
            },
            {
                nombre: 'Corrales del Sur',
                ubicacion: 'Región de Los Lagos',
                especialidad: 'Cecinas y embutidos para asados',
                contacto: 'info@corralesdelsur.cl',
                activo: true
            }
        ];

        for (const prod of productores) {
            await DataManager.createProductor(prod);
        }

        // Crear productos de ejemplo
        const productosEjemplo = [
            // QUESOS
            {
                nombre: 'Queso de Cabra Fresco Cremoso',
                categoria: 'queso',
                productor_id: 1,
                descripcion: 'Queso fresco de textura cremosa, ideal para untar. Sabor suave y delicado.',
                peso: '200g',
                precio_venta: 5990,
                costo_proveedor: 4800,
                stock: 30,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Queso de Cabra Clásico Maduro',
                categoria: 'queso',
                productor_id: 2,
                descripcion: 'Queso maduro de sabor intenso, elaborado con leche de cabra de libre pastoreo.',
                peso: '250g',
                precio_venta: 5000,
                costo_proveedor: 4000,
                stock: 25,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Feta de Cabra',
                categoria: 'queso',
                productor_id: 3,
                descripcion: 'Estilo griego, perfecto para ensaladas y preparaciones mediterráneas.',
                peso: '200g',
                precio_venta: 5849,
                costo_proveedor: 4680,
                stock: 20,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Queso de Cabra Untable Natural',
                categoria: 'queso',
                productor_id: 3,
                descripcion: 'Queso untable suave, ideal para desayunos y snacks.',
                peso: '150g',
                precio_venta: 3790,
                costo_proveedor: 3032,
                stock: 35,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Queso de Cabra Ahumado Finas Hierbas',
                categoria: 'queso',
                productor_id: 3,
                descripcion: 'Queso ahumado con hierbas mediterráneas, sabor único y sofisticado.',
                peso: '180g',
                precio_venta: 3999,
                costo_proveedor: 2856,
                stock: 15,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Queso de Cabra Maduro Suave Premium',
                categoria: 'queso',
                productor_id: 1,
                descripcion: 'Queso maduro de textura suave, elaboración artesanal premium.',
                peso: '250g',
                precio_venta: 7490,
                costo_proveedor: 5350,
                stock: 12,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Queso de Cabra con Merkén',
                categoria: 'queso',
                productor_id: 2,
                descripcion: 'Fusión única de queso de cabra con merkén chileno, sabor picante y ahumado.',
                peso: '200g',
                precio_venta: 6990,
                costo_proveedor: 4993,
                stock: 18,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Queso de Cabra Artesanal Premium 500g',
                categoria: 'queso',
                productor_id: 2,
                descripcion: 'Formato premium, ideal para tablas de quesos y ocasiones especiales.',
                peso: '500g',
                precio_venta: 9000,
                costo_proveedor: 6429,
                stock: 10,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Queso de Cabra Ahumado 1kg',
                categoria: 'queso',
                productor_id: 3,
                descripcion: 'Formato familiar, queso ahumado de alta calidad.',
                peso: '1000g',
                precio_venta: 8990,
                costo_proveedor: 6421,
                stock: 8,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Queso de Cabra Edición Limitada',
                categoria: 'queso',
                productor_id: 1,
                descripcion: 'Edición especial madurada 6 meses, producción limitada.',
                peso: '300g',
                precio_venta: 17999,
                costo_proveedor: 12857,
                stock: 5,
                activo: true,
                visible_tienda: true
            },

            // EMBUTIDOS
            {
                nombre: 'Longaniza Parrillera Artesanal',
                categoria: 'embutido',
                productor_id: 4,
                descripcion: 'Longaniza tradicional sin gluten ni lactosa, ideal para asados.',
                peso: '400g',
                precio_venta: 4990,
                costo_proveedor: 3992,
                stock: 30,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Longaniza de Campo Tradicional',
                categoria: 'embutido',
                productor_id: 5,
                descripcion: 'Receta tradicional de Chillán, sabor auténtico del sur.',
                peso: '500g',
                precio_venta: 5500,
                costo_proveedor: 4400,
                stock: 25,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Chorizo Argentino',
                categoria: 'embutido',
                productor_id: 6,
                descripcion: 'Estilo argentino, perfecto para choripanes y parrillas.',
                peso: '400g',
                precio_venta: 5990,
                costo_proveedor: 4792,
                stock: 28,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Butifarra Premium',
                categoria: 'embutido',
                productor_id: 6,
                descripcion: 'Butifarra artesanal de alta calidad, sabor intenso.',
                peso: '450g',
                precio_venta: 6490,
                costo_proveedor: 4636,
                stock: 20,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Lomo Kassler Ahumado',
                categoria: 'embutido',
                productor_id: 4,
                descripcion: 'Lomo de cerdo ahumado, especialidad alemana artesanal.',
                peso: '200g',
                precio_venta: 7990,
                costo_proveedor: 5707,
                stock: 15,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Salame Italiano Artesanal',
                categoria: 'embutido',
                productor_id: 4,
                descripcion: 'Salame curado estilo italiano, maduración artesanal.',
                peso: '250g',
                precio_venta: 8990,
                costo_proveedor: 6421,
                stock: 12,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Jamón Serrano Artesanal',
                categoria: 'embutido',
                productor_id: 5,
                descripcion: 'Jamón curado estilo serrano, producción limitada.',
                peso: '150g',
                precio_venta: 8990,
                costo_proveedor: 6421,
                stock: 10,
                activo: true,
                visible_tienda: true
            },
            {
                nombre: 'Prieta Artesanal Premium',
                categoria: 'embutido',
                productor_id: 5,
                descripcion: 'Prieta tradicional chilena, receta familiar.',
                peso: '300g',
                precio_venta: 4990,
                costo_proveedor: 3564,
                stock: 18,
                activo: true,
                visible_tienda: true
            }
        ];

        for (const prod of productosEjemplo) {
            await DataManager.createProducto(prod);
        }

        console.log('✅ Productos de ejemplo cargados');
    }
}

// ===== CARGAR PRODUCTORES =====
async function loadProductores() {
    const section = document.getElementById('productores');
    const grid = document.getElementById('productoresGrid');

    try {
        const productores = await DataManager.getProductores({ activo: true });
        if (!productores || productores.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }

        if (!grid) return;

        if (section) section.style.display = '';
        grid.innerHTML = productores.map(productor => `
        <div class="productor-card">
          <div class="productor-logo">👨‍🌾</div>
          <h3 class="productor-name">${productor.nombre}</h3>
          <p class="productor-location">📍 ${productor.ubicacion}</p>
          <p class="productor-specialty">${productor.especialidad}</p>
        </div>
      `).join('');
    } catch (e) {
        if (section) section.style.display = 'none';
    }
}

// ===== MODO CLARO / OSCURO (THEME TOGGLE) =====
function initThemeToggle() {
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (!toggleBtn) return;

    // Cargar preferencia desde localStorage (default dark)
    const savedTheme = localStorage.getItem('dcava_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
    updateThemeIcon();

    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('dcava_theme', isLight ? 'light' : 'dark');
        updateThemeIcon();
    });

    setupNavClickHandlers();
}

function updateThemeIcon() {
    const sunIcon = document.getElementById('themeIconSun');
    const moonIcon = document.getElementById('themeIconMoon');
    const label = document.getElementById('themeToggleLabel');
    const isLight = document.body.classList.contains('light-mode');

    if (sunIcon && moonIcon) {
        if (isLight) {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'inline-flex';
        } else {
            sunIcon.style.display = 'inline-flex';
            moonIcon.style.display = 'none';
        }
    }
    if (label) {
        label.textContent = isLight ? 'Modo Oscuro' : 'Modo Claro';
    }
}

// ===== MODO MANTENIMIENTO / EN CONSTRUCCIÓN =====
async function checkMaintenanceMode() {
    const overlay = document.getElementById('maintenanceOverlay');
    if (!overlay) return;

    let isMaintenance = false;
    if (typeof DataManager !== 'undefined' && DataManager.getModoMantenimiento) {
        isMaintenance = await DataManager.getModoMantenimiento();
    } else {
        isMaintenance = localStorage.getItem('dcava_maintenance_mode') === 'true';
    }

    const isAdminBypass = localStorage.getItem('dcava_admin_bypass') === 'true' ||
        sessionStorage.getItem('is_admin') === 'true' ||
        (sessionStorage.getItem('user_email') === 'admin@dcava.cl' ||
         sessionStorage.getItem('user_email') === 'ambler.eduardo@gmail.com');

    if (isMaintenance && !isAdminBypass) {
        overlay.style.display = 'flex';
        document.body.classList.add('no-scroll');
    } else {
        overlay.style.display = 'none';
        document.body.classList.remove('no-scroll');
    }
}

function setupNavClickHandlers() {
    document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetSec = document.querySelector(targetId);
                if (targetSec) {
                    targetSec.style.opacity = '1';
                    targetSec.style.transform = 'translateY(0)';
                    targetSec.classList.add('active', 'section-revealed');
                    targetSec.querySelectorAll('[data-reveal]').forEach(el => {
                        el.classList.add('active');
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                    });
                }
            }
        });
    });
}

// ===== CARGAR FILTROS DINÁMICOS =====
async function loadFilters() {
    const container = document.getElementById('filtrosContainer');
    if (!container) return;

    try {
        const categorias = await DataManager.getCategorias();
        let html = `<button class="filtro-btn ${currentFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todo</button>`;
        categorias.forEach(cat => {
            html += `<button class="filtro-btn ${currentFilter === cat.slug ? 'active' : ''}" data-filter="${cat.slug}">${cat.nombre}s</button>`;
        });
        container.innerHTML = html;

        // Vincular eventos click a los nuevos botones
        container.querySelectorAll('.filtro-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const filter = e.target.dataset.filter;
                currentFilter = filter;
                loadProductos(filter);
            });
        });
    } catch (err) {
        console.error('Error al renderizar filtros dinámicos:', err);
    }
}

// ===== LÓGICA DE ARMADOR DE TABLA INTERACTIVO =====
// ===== LÓGICA DE ARMADOR DE TABLA INTERACTIVO =====
const defaultArmadorProductos = [
    { id: 101, nombre: 'Queso de Cabra Curado', categoria: 'QUESO', precio_venta: 8990, stock: 99 },
    { id: 102, nombre: 'Chorizo Artesanal Ahumado', categoria: 'CHARCUTERÍA', precio_venta: 6490, stock: 99 },
    { id: 103, nombre: 'Queso Azul Gran Reserva', categoria: 'QUESO', precio_venta: 11990, stock: 99 },
    { id: 104, nombre: 'Jamón Serrano Reserva', categoria: 'CHARCUTERÍA', precio_venta: 14990, stock: 99 },
    { id: 105, nombre: 'Queso Brie Trufado', categoria: 'QUESO', precio_venta: 9990, stock: 99 },
    { id: 106, nombre: 'Salami Fino Especiado', categoria: 'CHARCUTERÍA', precio_venta: 7490, stock: 99 }
];

armadorProductos = [...defaultArmadorProductos];

function formatMoneyCLP(amount) {
    return '$' + Number(amount).toLocaleString('es-CL');
}

function isProductSelected(productId) {
    return builderSelectedIds.some(id => String(id) === String(productId));
}

function initArmadorTabla() {
    const catalogContainer = document.getElementById('builderCatalog');
    if (!catalogContainer) return;

    catalogContainer.innerHTML = armadorProductos.map(p => {
        const selected = isProductSelected(p.id);
        const catLabel = p.categoria ? p.categoria.toUpperCase() : 'GOURMET';
        return `
            <button type="button" class="builder-item-btn ${selected ? 'selected' : ''}" 
                    data-id="${p.id}"
                    aria-pressed="${selected}">
                <span class="builder-item-category">${catLabel}</span>
                <div class="builder-item-header">
                    <span class="builder-item-name">${p.nombre}</span>
                    ${selected ? '<i class="fa-solid fa-circle-check builder-item-check check-pop"></i>' : ''}
                </div>
                <span class="builder-item-price">${formatMoneyCLP(p.precio_venta || p.precio)}</span>
            </button>
        `;
    }).join('');

    renderArmadorSummary();
}

function toggleBuilderItem(id) {
    if (!id) return;
    const targetId = String(id);
    const index = builderSelectedIds.findIndex(x => String(x) === targetId);
    
    if (index !== -1) {
        builderSelectedIds.splice(index, 1);
    } else {
        if (builderSelectedIds.length >= 6) {
            alert('¡Llegaste al límite máximo de 6 productos para una sola tabla!');
            return;
        }
        builderSelectedIds.push(targetId);
    }

    initArmadorTabla();
}

function renderArmadorSummary() {
    const listEl = document.getElementById('builderItemsList');
    const totalEl = document.getElementById('builderTotalPrice');
    const totalRowEl = document.getElementById('builderTotalRow');
    const helperEl = document.getElementById('builderHelperText');
    const btnEl = document.getElementById('builderAddToCartBtn');
    const shippingNoticeEl = document.getElementById('builderShippingNotice');

    if (!listEl || !totalEl || !btnEl) return;

    const selectedProducts = armadorProductos.filter(p => isProductSelected(p.id));
    const total = selectedProducts.reduce((sum, p) => sum + Number(p.precio_venta || p.precio || 0), 0);
    const count = selectedProducts.length;
    const isDisabled = count < 3;

    // Render Lista
    if (count === 0) {
        listEl.innerHTML = '<li class="builder-empty-msg">Selecciona al menos 3 productos para armar tu tabla.</li>';
        if (totalRowEl) totalRowEl.style.display = 'none';
        if (shippingNoticeEl) shippingNoticeEl.style.display = 'none';
        if (helperEl) helperEl.style.display = 'none';
        btnEl.style.display = 'none';
    } else {
        listEl.innerHTML = selectedProducts.map(p => `
            <li>
                <span>${p.nombre}</span>
                <span>${formatMoneyCLP(p.precio_venta || p.precio)}</span>
            </li>
        `).join('');

        if (totalRowEl) totalRowEl.style.display = 'flex';
        if (helperEl) helperEl.style.display = 'block';
        btnEl.style.display = 'block';

        // Render Sugerencia de Envío Gratis (Gratis sobre $50.000)
        if (shippingNoticeEl) {
            shippingNoticeEl.style.display = 'block';
            if (total >= 50000) {
                shippingNoticeEl.innerHTML = '✓ <strong>¡Felicidades! Tienes Envío Gratis</strong>';
            } else {
                const faltaEnvio = 50000 - total;
                shippingNoticeEl.innerHTML = `💡 Agrega <strong>${formatMoneyCLP(faltaEnvio)}</strong> más para <strong>envío gratis</strong>`;
            }
        }
    }

    // Render Totales y Ayuda
    totalEl.textContent = formatMoneyCLP(total);

    if (count < 3) {
        const falta = 3 - count;
        if (helperEl) helperEl.textContent = `Llevas ${count}, mínimo 3.`;
        btnEl.textContent = `ELIGE ${falta} MÁS`;
    } else {
        if (helperEl) helperEl.textContent = `${count} de 6 productos seleccionados.`;
        btnEl.textContent = 'AGREGAR TABLA AL CARRITO';
    }

    btnEl.disabled = isDisabled;
    btnEl.onclick = () => addBuilderToCart(selectedProducts);
}

function addBuilderToCart(selectedProducts) {
    if (!selectedProducts || selectedProducts.length < 3) return;

    selectedProducts.forEach(p => {
        const itemCat = p.categoria ? String(p.categoria).toLowerCase() : 'queso';
        const existingItem = cart.find(item => String(item.id) === String(p.id));

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: p.id,
                nombre: p.nombre,
                precio: Number(p.precio_venta || p.precio || 0),
                quantity: 1,
                stock: p.stock || 99,
                categoria: itemCat.includes('charcut') ? 'embutido' : 'queso'
            });
        }
    });

    saveCart();
    updateCartCount();
    if (typeof renderCart === 'function') {
        renderCart();
    }

    showToast(`¡Tabla personalizada (${selectedProducts.length} productos) agregada al carrito!`);

    // Limpiar selección y re-renderizar
    builderSelectedIds = [];
    initArmadorTabla();

    // Abrir modal del carrito
    openCart();
}

const defaultProductosTienda = [
    { id: 1, nombre: 'Queso de Cabra Curado', categoria: 'queso', precio_venta: 8990, stock: 99, productor_nombre: 'Quesería Los Andes', descripcion: 'Queso artesanal madurado 6 meses con aroma intenso y textura firme.' },
    { id: 2, nombre: 'Chorizo Artesanal Ahumado', categoria: 'embutido', precio_venta: 6490, stock: 99, productor_nombre: 'Charcutería Tradicional', descripcion: 'Chorizo ahumado en madera de roble, sazonado con pimentón dulce.' },
    { id: 3, nombre: 'Queso Azul Gran Reserva', categoria: 'queso', precio_venta: 11990, stock: 99, productor_nombre: 'Cava del Valle', descripcion: 'Queso azul cremoso con vetas intensas y maduración en cueva natural.' },
    { id: 4, nombre: 'Jamón Serrano Reserva', categoria: 'embutido', precio_venta: 14990, stock: 99, productor_nombre: 'Charcutería Tradicional', descripcion: 'Curado lento durante 12 meses con corte fino y sabor característico.' },
    { id: 5, nombre: 'Queso Brie Trufado', categoria: 'queso', precio_venta: 9990, stock: 99, productor_nombre: 'Quesería Los Andes', descripcion: 'Brie de pasta blanda enriquecido con láminas de trufa negra.' },
    { id: 6, nombre: 'Salami Fino Especiado', categoria: 'embutido', precio_venta: 7490, stock: 99, productor_nombre: 'Charcutería Tradicional', descripcion: 'Salami artesanal curado con pimienta en grano y hierbas aromáticas.' }
];

// ===== CARGAR PRODUCTOS =====
async function loadProductos(filter = 'todos') {
    let productos = [];
    try {
        const filters = filter === 'todos' ? { activo: true, visible_tienda: true } : { categoria: filter, activo: true, visible_tienda: true };
        productos = await DataManager.getProductos(filters);
    } catch (e) {
        console.warn('Cargando productos de reserva:', e);
    }
    
    if (!productos || productos.length === 0) {
        productos = filter === 'todos' ? defaultProductosTienda : defaultProductosTienda.filter(p => p.categoria === filter);
    }

    const grid = document.getElementById('productosGrid');

    if (!grid) return;

    if (productos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 4rem; font-family: var(--font-heading); font-size: 1.5rem; color: var(--text-muted); font-style: italic;">Nuestra cava se está renovando. Pronto más selección.</p>';
        return;
    }

    grid.innerHTML = productos.map(producto => {
        // Lógica de imagen: URL real o Placeholder elegante
        let imageHtml = '';
        if (producto.imagen_url && producto.imagen_url.length > 5) {
            imageHtml = `<img src="${producto.imagen_url}" alt="${producto.nombre}">`;
        } else {
            const defaultImg = producto.categoria === 'queso' ? 'assets/default-queso.jpg' : 'assets/default-embutido.jpg';
            imageHtml = `<img src="${defaultImg}" alt="${producto.nombre} (Imagen referencial)">`;
        }

        // Descripción corta
        const desc = producto.descripcion || 'Selección especial del curador, madurado a la perfección.';

        return `
      <div class="product-card" data-id="${producto.id}">
        <div class="product-image">
            ${imageHtml}
        </div>
        <div class="product-info">
          <span class="product-category">${producto.categoria}</span>
          <h3 class="product-name">${producto.nombre}</h3>
          <p class="product-producer">De: ${producto.productor_nombre || 'Maestro Artesano'}</p>
          <p class="product-desc">${desc}</p>
          <div class="product-price">$${producto.precio_venta.toLocaleString('es-CL')}</div>
          
          <button class="add-to-cart-btn" data-id="${producto.id}" ${producto.stock === 0 ? 'disabled' : ''}>
            ${producto.stock === 0 ? 'Agotado' : 'Añadir a la Cesta'}
          </button>
        </div>
      </div>
    `;
    }).join('');

    // Re-vincular botones de "Añadir al carrito" que se acaban de crear
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.currentTarget.dataset.id);
            addToCart(productId);
        });
    });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Delegación de eventos para el Armador de Tabla
    const builderCatalog = document.getElementById('builderCatalog');
    if (builderCatalog) {
        builderCatalog.onclick = (e) => {
            const btn = e.target.closest('.builder-item-btn');
            if (btn) {
                const id = btn.dataset.id || btn.getAttribute('data-id');
                if (id) {
                    toggleBuilderItem(id);
                }
            }
        };
    }

    // Botón carrito
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.addEventListener('click', openCart);
    }

    // Cerrar modal carrito
    const closeCartModal = document.getElementById('closeCartModal');
    if (closeCartModal) {
        closeCartModal.addEventListener('click', closeCart);
    }

    // Continuar comprando
    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', closeCart);
    }

    // Checkout
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }

    // Formulario contacto
    const contactoForm = document.getElementById('contactoForm');
    if (contactoForm) {
        contactoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('¡Gracias por tu mensaje! Te contactaremos pronto.');
            contactoForm.reset();
        });
    }

    // Suscripciones
    document.querySelectorAll('.pack-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const packId = e.currentTarget.dataset.packId;
            const packName = e.currentTarget.dataset.packName;

            console.log(`🧀 Seleccionando suscripción: ${packName} (ID: ${packId})`);

            if (!sessionStorage.getItem('user_email')) {
                sessionStorage.setItem('pending_subscription_id', packId);
                sessionStorage.setItem('pending_subscription_name', packName);
                alert(`Para suscribirte con éxito, por favor inicia sesión o regístrate en nuestro club.`);
                openAuthModal();
                switchAuthTab('login');
            } else {
                await processSubscription(packId, packName);
            }
        });
    });

    // Botón Cuenta
    const accountBtn = document.getElementById('accountBtn');
    if (accountBtn) {
        accountBtn.addEventListener('click', async () => {
            // Verificar estado real en Supabase para evitar falsos positivos
            const user = await DataManager.getCurrentUser();
            if (user) {
                openProfileModal();
            } else {
                // Limpiar sesión local por si acaso
                sessionStorage.removeItem('user_email');
                sessionStorage.removeItem('is_admin');
                sessionStorage.removeItem('admin_authenticated');
                openAuthModal();
            }
        });
    }

    // Cerrar modal Perfil
    const closeProfileModal = document.getElementById('closeProfileModal');
    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', closeProfileModalFunc);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await DataManager.signOut();
            sessionStorage.removeItem('user_email');
            window.location.reload();
        });
    }

    // Cerrar modal auth
    const closeAuthModal = document.getElementById('closeAuthModal');
    if (closeAuthModal) {
        closeAuthModal.addEventListener('click', closeAuthModalFunc);
    }

    // Tabs del modal auth
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = e.target.dataset.tab;
            switchAuthTab(targetTab);
        });
    });

    // Formulario Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPassword').value;

            try {
                const data = await DataManager.signIn(email, pass);
                if (data.user) {
                    sessionStorage.setItem('user_email', data.user.email);
                    updateUserUI(data.user);
                    closeAuthModalFunc();

                    // Si es admin, preguntar si quiere ir al panel
                    const isAdmin = data.user.email === 'admin@dcava.cl' || data.user.email === 'ambler.eduardo@gmail.com';
                    if (isAdmin) {
                        sessionStorage.setItem('admin_authenticated', 'true');
                        if (confirm('💪 Hola Eduardo, bienvenido. ¿Deseas ir al Panel de Administración?')) {
                            window.location.href = 'admin.html';
                            return;
                        }
                    }
                    alert('¡Bienvenido de nuevo!');
                    await checkPendingSubscription();
                }
            } catch (error) {
                alert('Error al iniciar sesión: ' + (error.message || 'Credenciales inválidas'));
            }
        });
    }

    // Formulario Registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const pass = document.getElementById('regPassword').value;
            const confirm = document.getElementById('regPasswordConfirm').value;

            if (pass !== confirm) {
                alert('Las contraseñas no coinciden');
                return;
            }

            try {
                await DataManager.signUp(email, pass, { nombre: name });
                alert(`¡Cuenta creada con éxito! Por favor verifica tu email para activar tu cuenta.`);
                // Guardamos el nombre para el flujo de suscripción
                sessionStorage.setItem('user_name', name);
                closeAuthModalFunc();
                // Nota: Supabase puede auto-loguear dependiendo de la config.
                // Si no, el usuario deberá loguearse después de verificar.
            } catch (error) {
                alert('Error al crear cuenta: ' + (error.message || 'Intenta con otro email'));
            }
        });
    }
}

// ===== AUTENTICACIÓN =====
function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeAuthModalFunc() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function checkAuthState() {
    const user = await DataManager.getCurrentUser();
    if (user) {
        updateUserUI(user);
    } else {
        // Si no hay sesión activa en Supabase, limpiar sessionStorage y restablecer la UI
        sessionStorage.removeItem('user_email');
        sessionStorage.removeItem('is_admin');
        sessionStorage.removeItem('admin_authenticated');
        const accountBtn = document.getElementById('accountBtn');
        if (accountBtn) {
            accountBtn.innerHTML = `
                👤 <span class="btn-text">Mi Cuenta</span>
            `;
        }
    }
}

function updateUserUI(user) {
    const accountBtn = document.getElementById('accountBtn');
    if (accountBtn) {
        let name = user.user_metadata?.nombre || user.email.split('@')[0];
        // Formatear primer nombre para evitar nombres muy largos en el header
        name = name.split(' ')[0].split('.')[0];
        if (name.length > 12) name = name.substring(0, 10) + '...';

        accountBtn.innerHTML = `👤 <span class="btn-text">${name}</span>`;

        const isAdmin = user.user_metadata?.rol === 'admin' ||
            user.email === 'admin@dcava.cl' ||
            user.email === 'ambler.eduardo@gmail.com';

        let adminShortcut = document.getElementById('adminHeaderShortcut');
        const actions = document.querySelector('.header-actions');

        if (isAdmin) {
            sessionStorage.setItem('is_admin', 'true');
            if (!adminShortcut && actions) {
                adminShortcut = document.createElement('a');
                adminShortcut.id = 'adminHeaderShortcut';
                adminShortcut.href = 'admin.html';
                adminShortcut.className = 'admin-header-badge';
                adminShortcut.title = 'Ir al Panel de Administración';
                adminShortcut.innerHTML = '⚙️ Admin';
                actions.insertBefore(adminShortcut, accountBtn);
            }
        } else if (adminShortcut) {
            adminShortcut.remove();
        }

        sessionStorage.setItem('user_email', user.email);
    }
}

// ===== PERFIL / DASHBOARD =====
function openProfileModal() {
    const overlay = document.getElementById('profileOverlay');
    const panel = document.getElementById('profilePanel');
    if (overlay && panel) {
        overlay.classList.add('active');
        panel.classList.add('active');
        document.body.style.overflow = 'hidden';
        loadProfileData();
    }
}

function closeProfileModalFunc() {
    const overlay = document.getElementById('profileOverlay');
    const panel = document.getElementById('profilePanel');
    if (overlay && panel) {
        overlay.classList.remove('active');
        panel.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function loadProfileData() {
    const user = await DataManager.getCurrentUser();
    if (!user) return;

    // Poblar info básica
    document.getElementById('userName').textContent = user.user_metadata?.nombre || 'Usuario';
    const emailEl = document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = user.email;

    // Verificar si es admin para mostrar botón de acceso
    const isAdmin = user.email === 'admin@dcava.cl' || user.email === 'ambler.eduardo@gmail.com';
    const profileActions = document.getElementById('profileAdminActions');
    if (profileActions) {
        if (isAdmin) {
            profileActions.innerHTML = `
                <a href="admin.html" class="btn btn-primary btn-block" style="background:var(--gold); color:var(--bg-main); margin-bottom: 2rem; display:flex; align-items:center; justify-content:center; gap:0.5rem; font-weight:700;">
                    <i class="fas fa-cog"></i> PANEL DE ADMINISTRACIÓN
                </a>
            `;
            profileActions.style.display = 'block';
        } else {
            profileActions.style.display = 'none';
        }
    }

    // Cargar Suscripción (Desde Supabase)
    const activeSubCard = document.getElementById('activeSubCard');
    try {
        const { data: cliente } = await DataManager.supabase
            .from('dcava_clientes')
            .select('id')
            .eq('email', user.email)
            .single();

        if (cliente) {
            const { data: userSub } = await DataManager.supabase
                .from('dcava_suscripciones')
                .select('*, dcava_packs_suscripcion(nombre)')
                .eq('cliente_id', cliente.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (userSub) {
                activeSubCard.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong style="color:white; display:block; margin-bottom:0.2rem;">${userSub.dcava_packs_suscripcion?.nombre || 'Suscripción'}</strong>
                            <span style="font-size:0.8rem; color:var(--text-muted);">Estado: ${userSub.estado}</span>
                        </div>
                        <span class="status-badge" style="background:var(--gold); color:var(--bg-main); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem;">Activa</span>
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:1rem;">Tu próxima caja llegará la primera semana del próximo mes.</p>
                `;
            } else {
                activeSubCard.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted);">No tienes suscripciones activas.</p>';
            }
        }
    } catch (e) {
        console.warn('Error fetching user sub:', e.message);
        activeSubCard.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted);">No tienes suscripciones activas.</p>';
    }

    // Cargar Pedidos (Real de Supabase)
    const orderList = document.getElementById('orderHistoryList');
    try {
        const { data: cliente } = await DataManager.supabase
            .from('dcava_clientes')
            .select('id')
            .eq('email', user.email)
            .single();

        if (cliente) {
            const { data: orders, error } = await DataManager.supabase
                .from('dcava_pedidos')
                .select('*')
                .eq('cliente_id', cliente.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            if (orders && orders.length > 0) {
                orderList.innerHTML = orders.map(o => `
                    <div class="order-history-item">
                        <div>
                            <div class="order-date">${new Date(o.created_at).toLocaleDateString('es-CL')}</div>
                            <div style="font-size:0.9rem; font-weight:600;">${o.numero_pedido}</div>
                        </div>
                        <div style="text-align:right;">
                            <div class="order-total">$${o.total.toLocaleString('es-CL')}</div>
                            <div class="order-status" style="color:var(--gold); font-size:0.75rem; text-transform:uppercase;">${o.estado}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                orderList.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aún no tienes pedidos registrados.</p>';
            }
        } else {
            orderList.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aún no tienes pedidos registrados.</p>';
        }
    } catch (err) {
        console.error("Error cargando pedidos:", err);
        orderList.innerHTML = '<p style="color:var(--accent); font-size:0.8rem;">Error al cargar historial.</p>';
    }
}

function switchAuthTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === `${tabName}Form`);
    });

    const title = document.getElementById('authModalTitle');
    if (title) {
        title.textContent = tabName === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta';
    }
}

// ===== CARRITO =====
function loadCart() {
    const savedCart = localStorage.getItem('dcava_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
    }
}

function saveCart() {
    localStorage.setItem('dcava_cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = count;
    }
}

let toastTimer = null;
function showToast(message) {
    clearTimeout(toastTimer);
    let toast = document.getElementById('cartToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cartToast';
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--gold);"></i><span id="cartToastMsg"></span>`;
        document.body.appendChild(toast);
    }
    document.getElementById('cartToastMsg').textContent = message;
    toast.style.display = 'flex';

    const badge = document.getElementById('cartCount');
    if (badge) {
        badge.classList.remove('bounce');
        void badge.offsetWidth; // Forzar reflow para reiniciar animación
        badge.classList.add('bounce');
    }

    toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2200);
}

async function addToCart(productId, isSilent = false) {
    const productos = await DataManager.getProductos();
    const product = productos.find(p => p.id === productId);

    if (!product) {
        alert('Producto no encontrado');
        return;
    }

    if (product.stock === 0) {
        alert('Producto agotado');
        return;
    }

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert('No hay más stock disponible');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            nombre: product.nombre,
            precio: product.precio_venta,
            quantity: 1,
            stock: product.stock,
            categoria: product.categoria
        });
    }

    saveCart();

    if (!isSilent) {
        showToast(`${product.nombre} agregado al carrito`);
    }

    // Animación visual en el botón del catálogo
    const btn = document.querySelector(`.add-to-cart-btn[data-id="${productId}"]`);
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✓ Agregado';
        btn.style.backgroundColor = '#4CAF50'; // Feedback visual verde
        btn.style.color = 'white';

        setTimeout(() => {
            btn.textContent = originalText.includes('Agotado') ? 'Agotado' : 'Añadir a la Cesta';
            btn.style.backgroundColor = ''; // Restaurar estilo
            btn.style.color = '';
        }, 1500);
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
}

async function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    if (change > 0) {
        // Consultar el stock real en tiempo real antes de permitir incrementar
        try {
            const productos = await DataManager.getProductos();
            const product = productos.find(p => p.id === productId);
            if (product) {
                item.stock = product.stock;
            }
        } catch (err) {
            console.error('Error al validar stock en tiempo real:', err);
        }
    }

    item.quantity += change;

    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else if (item.quantity > item.stock) {
        alert(`No hay más stock disponible en la tienda para este producto (Stock disponible: ${item.stock})`);
        item.quantity = item.stock;
        saveCart();
        renderCart();
    } else {
        saveCart();
        renderCart();
    }
}

function openCart() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.classList.add('active');
        renderCart();
    }
}

function closeCart() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartShipping = document.getElementById('cartShipping');
    const cartTotal = document.getElementById('cartTotal');
    const cartNote = document.getElementById('cartNote');

    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; padding: 2rem;">Tu carrito está vacío</p>';
        cartSubtotal.textContent = '$0';
        cartShipping.textContent = '$0';
        cartTotal.textContent = '$0';
        cartNote.textContent = '';
        return;
    }

    // Renderizar items
    cartItems.innerHTML = cart.map(item => {
        const icon = item.categoria === 'queso' ? '🧀' : '🥓';
        return `
      <div class="cart-item">
        <div class="cart-item-image">${icon}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.nombre}</div>
          <div class="cart-item-price">$${item.precio.toLocaleString('es-CL')}</div>
          <div class="cart-item-controls">
            <button onclick="updateQuantity(${item.id}, -1)">-</button>
            <span>${item.quantity}</span>
            <button onclick="updateQuantity(${item.id}, 1)">+</button>
            <button class="remove-btn" onclick="removeFromCart(${item.id})">Eliminar</button>
          </div>
        </div>
      </div>
    `;
    }).join('');

    // Calcular totales
    const subtotal = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);

    // Calcular envío (gratis sobre $50.000, sino $5.000)
    const shipping = subtotal >= 50000 ? 0 : 5000;
    const total = subtotal + shipping;

    cartSubtotal.textContent = `$${subtotal.toLocaleString('es-CL')}`;
    cartShipping.textContent = shipping === 0 ? 'Gratis' : `$${shipping.toLocaleString('es-CL')}`;
    cartTotal.textContent = `$${total.toLocaleString('es-CL')}`;

    // Nota
    if (subtotal < 15000) {
        cartNote.textContent = '⚠️ Compra mínima: $15.000';
        cartNote.style.color = '#C97B5D';
    } else if (subtotal < 50000) {
        const falta = 50000 - subtotal;
        cartNote.textContent = `💡 Agrega $${falta.toLocaleString('es-CL')} más para envío gratis`;
        cartNote.style.color = '#7A8450';
    } else {
        cartNote.textContent = '✓ ¡Envío gratis!';
        cartNote.style.color = '#7A8450';
    }
}

async function checkout() {
    const subtotal = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);

    if (subtotal < 15000) {
        alert('La compra mínima es de $15.000');
        return;
    }

    if (cart.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }

    window.location.href = 'checkout.html';
}

// Exponer funciones al scope global para onclick
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.openProfileModal = openProfileModal;
window.closeProfileModalFunc = closeProfileModalFunc;
window.switchAuthTab = switchAuthTab;
window.toggleBuilderItem = toggleBuilderItem;
window.showToast = showToast;

// ===== FUNCIONES FOOTER =====
async function loadFooterConfig() {
    // Número de WhatsApp de respaldo si Supabase no responde
    const WHATSAPP_FALLBACK = '56912345678';
    const EMAIL_FALLBACK = 'hola@dcava.cl';

    try {
        const [instagram, facebook, whatsapp, email] = await Promise.all([
            DataManager.getConfig('instagram_url'),
            DataManager.getConfig('facebook_url'),
            DataManager.getConfig('whatsapp'),
            DataManager.getConfig('email_contacto')
        ]);

        const socialContainer = document.getElementById('footerSocial');
        if (socialContainer) {
            const links = socialContainer.querySelectorAll('.social-icon');
            if (instagram && links[0]) links[0].href = instagram;
            if (facebook && links[1]) links[1].href = facebook;
            const waNum = whatsapp || WHATSAPP_FALLBACK;
            if (links[2]) links[2].href = `https://wa.me/${waNum.replace(/\+/g, '')}`;
        }

        // Cargar en barra lateral de contacto
        const contactWhatsapp = document.getElementById('contactWhatsapp');
        if (contactWhatsapp) {
            const waNum = whatsapp || WHATSAPP_FALLBACK;
            contactWhatsapp.href = `https://wa.me/${waNum.replace(/\+/g, '')}`;
            contactWhatsapp.textContent = whatsapp || `+${WHATSAPP_FALLBACK}`;
            contactWhatsapp.target = '_blank';
        }

        const contactEmail = document.getElementById('contactEmail');
        if (contactEmail) {
            const em = email || EMAIL_FALLBACK;
            contactEmail.href = `mailto:${em}`;
            contactEmail.textContent = em;
        }
    } catch (e) {
        console.warn('⚠️ No se pudo cargar la configuración de contacto, usando valores de respaldo:', e.message);
        // Aplicar valores de respaldo para evitar "Cargando..." permanente
        const contactWhatsapp = document.getElementById('contactWhatsapp');
        if (contactWhatsapp) {
            contactWhatsapp.href = `https://wa.me/${WHATSAPP_FALLBACK}`;
            contactWhatsapp.textContent = `+${WHATSAPP_FALLBACK}`;
            contactWhatsapp.target = '_blank';
        }
        const contactEmail = document.getElementById('contactEmail');
        if (contactEmail) {
            contactEmail.href = `mailto:${EMAIL_FALLBACK}`;
            contactEmail.textContent = EMAIL_FALLBACK;
        }
    }
}

function setupFooterEventListeners() {
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = newsletterForm.querySelector('input').value;
            alert(`✅ ¡Gracias! Hemos registrado a ${email} en nuestro club de sabores.`);
            newsletterForm.reset();
        });
    }
}

async function processSubscription(packId, packName) {
    try {
        const userEmail = sessionStorage.getItem('user_email');
        const userName = sessionStorage.getItem('user_name') || userEmail.split('@')[0];

        if (!userEmail) throw new Error('No hay sesión activa para suscribir');

        console.log('🚀 Iniciando suscripción para:', userEmail, 'Pack:', packId);

        // 1. Obtener o crear el cliente en la tabla 'clientes'
        const cliente = await DataManager.getOrCreateCliente(userEmail, userName);
        console.log('👤 Cliente vinculado:', cliente.id);

        // 2. Crear la suscripción (usando el ID numérico que espera la DB)
        await DataManager.createSuscripcion(cliente.id, parseInt(packId));

        alert(`🎉 ¡Felicidades! Te has suscrito con éxito al ${packName}.\nBienvenid@ a la familia DCAVA.`);

        sessionStorage.removeItem('pending_subscription_id');
        sessionStorage.removeItem('pending_subscription_name');

        // Redirigir al perfil para ver su estado
        openProfileModal();
    } catch (error) {
        console.error('❌ Error in subscription process:', error);
        alert('Hubo un problema al procesar tu suscripción.\n\nDetalle: ' + (error.message || 'Error de conexión con la base de datos'));
    }
}

async function checkPendingSubscription() {
    const pendingPackId = sessionStorage.getItem('pending_subscription_id');
    const pendingPackName = sessionStorage.getItem('pending_subscription_name');

    if (pendingPackId) {
        console.log('📦 Procesando suscripción pendiente tras login:', pendingPackName);
        await processSubscription(pendingPackId, pendingPackName || 'Pack seleccionado');
    }
}

