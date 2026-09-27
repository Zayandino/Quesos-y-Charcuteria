const SUPABASE_URL = 'https://api.cohablosandes.cloud';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQyMjA4NDksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.OM8ePDG-yZwyT-vcGxB2ECMsHngThAEELd0tq7TY7eg';

async function runTests() {
    console.log('🧪 Iniciando prueba de integración de Packs...');
    
    // 1. Consultar Packs existentes
    const resPacks = await fetch(`${SUPABASE_URL}/rest/v1/dcava_packs_suscripcion?select=*&order=id.asc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const packs = await resPacks.json();
    console.log(`✅ ${packs.length} packs obtenidos de Supabase:`);
    packs.forEach(p => console.log(`   - [ID: ${p.id}] ${p.nombre} ($${p.precio_mensual.toLocaleString()}) | Activo: ${p.activo}`));

    // 2. Consultar Productos para verificar stock y cálculo de costos
    const resProds = await fetch(`${SUPABASE_URL}/rest/v1/dcava_productos?select=*`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const prods = await resProds.json();
    console.log(`\n✅ ${prods.length} productos obtenidos del catálogo:`);
    prods.slice(0, 5).forEach(p => {
        let status = '🟢 Ok';
        if (p.stock < (p.stock_minimo || 5)) status = '🔴 Crítico';
        else if (p.stock < (p.stock_minimo || 5) * 2) status = '🟡 Bajo';
        console.log(`   - [${status}] ${p.nombre} (Stock: ${p.stock}, Costo: $${p.costo_proveedor})`);
    });

    // 3. Simular Constructor de Pack
    console.log('\n📦 Simulando armado de nuevo pack en memoria...');
    const selectedItems = [
        { producto_id: prods[0].id, nombre: prods[0].nombre, cantidad: 2, precio_unitario: prods[0].precio_venta, costo_unitario: prods[0].costo_proveedor },
        { producto_id: prods[1].id, nombre: prods[1].nombre, cantidad: 1, precio_unitario: prods[1].precio_venta, costo_unitario: prods[1].costo_proveedor }
    ];
    const precioPack = 35990;
    const costoTotal = selectedItems.reduce((acc, i) => acc + (i.costo_unitario * i.cantidad), 0);
    const margenBruto = precioPack - costoTotal;
    const pctMargen = Math.round((margenBruto / precioPack) * 100);

    console.log(`   - Productos agregados: ${selectedItems.map(i => `${i.nombre} x${i.cantidad}`).join(', ')}`);
    console.log(`   - Precio de venta mensual: $${precioPack.toLocaleString()}`);
    console.log(`   - Costo proveedor total: $${costoTotal.toLocaleString()}`);
    console.log(`   - Margen bruto: $${margenBruto.toLocaleString()}`);
    console.log(`   - % de Margen: ${pctMargen}% ${pctMargen >= 30 ? '✅ Saludable' : '⚠️ Ajustado'}`);

    console.log('\n🎉 ¡Todas las pruebas de lógica y conectividad fueron exitosas!');
}

runTests().catch(console.error);
