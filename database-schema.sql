-- ========================================
-- CABRA & CURADO - DATABASE SCHEMA
-- PostgreSQL / Supabase
-- ========================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== TABLA: usuarios_sistema =====
CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin', 'staff', 'viewer')),
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: productores =====
CREATE TABLE IF NOT EXISTS productores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  ubicacion VARCHAR(255),
  especialidad TEXT,
  historia TEXT,
  contacto VARCHAR(255),
  telefono VARCHAR(50),
  email VARCHAR(255),
  sitio_web VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: productos =====
CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('queso', 'embutido')),
  productor_id INTEGER REFERENCES productores(id) ON DELETE SET NULL,
  descripcion TEXT,
  peso VARCHAR(50),
  ingredientes TEXT,
  notas_cata TEXT,
  maridaje TEXT,
  precio_venta INTEGER NOT NULL,
  costo_proveedor INTEGER NOT NULL,
  stock INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 5,
  activo BOOLEAN DEFAULT true,
  visible_tienda BOOLEAN DEFAULT true,
  imagen_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: packs_suscripcion =====
CREATE TABLE IF NOT EXISTS packs_suscripcion (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio_mensual INTEGER NOT NULL,
  contenido JSONB,
  beneficios JSONB,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: clientes =====
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  direccion TEXT,
  comuna VARCHAR(100),
  region VARCHAR(100),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: suscripciones =====
CREATE TABLE IF NOT EXISTS suscripciones (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
  pack_id INTEGER REFERENCES packs_suscripcion(id) ON DELETE SET NULL,
  estado VARCHAR(50) DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada', 'cancelada')),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  mercadopago_subscription_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: pedidos =====
CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  numero_pedido VARCHAR(50) UNIQUE NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  tipo VARCHAR(50) DEFAULT 'compra' CHECK (tipo IN ('compra', 'suscripcion')),
  estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado')),
  estado_pago VARCHAR(50) DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'pagado', 'fallido', 'reembolsado')),
  subtotal INTEGER NOT NULL,
  costo_envio INTEGER DEFAULT 0,
  descuento INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  direccion_envio TEXT,
  comuna VARCHAR(100),
  region VARCHAR(100),
  notas TEXT,
  mercadopago_payment_id VARCHAR(255),
  mercadopago_preference_id VARCHAR(255),
  fecha_pago TIMESTAMP WITH TIME ZONE,
  fecha_envio TIMESTAMP WITH TIME ZONE,
  fecha_entrega TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: pedido_items =====
CREATE TABLE IF NOT EXISTS pedido_items (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  producto_nombre VARCHAR(255) NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: inventario_movimientos =====
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
  cantidad INTEGER NOT NULL,
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  motivo TEXT,
  pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios_sistema(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: cupones =====
CREATE TABLE IF NOT EXISTS cupones (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('porcentaje', 'monto_fijo')),
  valor INTEGER NOT NULL,
  minimo_compra INTEGER DEFAULT 0,
  usos_maximos INTEGER,
  usos_actuales INTEGER DEFAULT 0,
  fecha_inicio DATE,
  fecha_fin DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: configuracion =====
CREATE TABLE IF NOT EXISTS configuracion (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  descripcion TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: logs_actividad =====
CREATE TABLE IF NOT EXISTS logs_actividad (
  id SERIAL PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios_sistema(id) ON DELETE SET NULL,
  accion VARCHAR(100) NOT NULL,
  tabla VARCHAR(100),
  registro_id INTEGER,
  detalles JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== ÍNDICES =====
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_productos_productor ON productos(productor_id);
CREATE INDEX idx_productos_activo ON productos(activo, visible_tienda);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_numero ON pedidos(numero_pedido);
CREATE INDEX idx_suscripciones_cliente ON suscripciones(cliente_id);
CREATE INDEX idx_suscripciones_estado ON suscripciones(estado);

-- ===== FUNCIONES =====

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_productores_updated_at BEFORE UPDATE ON productores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packs_updated_at BEFORE UPDATE ON packs_suscripcion FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios_sistema FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== ROW LEVEL SECURITY (RLS) =====

-- Habilitar RLS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE productores ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Políticas para productos (público puede ver activos, admin puede todo)
CREATE POLICY "Productos visibles público"
  ON productos FOR SELECT
  USING (activo = true AND visible_tienda = true);

CREATE POLICY "Admin productos"
  ON productos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_sistema
      WHERE id = auth.uid()
      AND rol IN ('admin', 'staff')
      AND activo = true
    )
  );

-- Políticas para productores (público puede ver activos, admin puede todo)
CREATE POLICY "Productores visibles público"
  ON productores FOR SELECT
  USING (activo = true);

CREATE POLICY "Admin productores"
  ON productores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_sistema
      WHERE id = auth.uid()
      AND rol IN ('admin', 'staff')
      AND activo = true
    )
  );

-- Políticas para packs (público puede ver activos, admin puede todo)
CREATE POLICY "Packs visibles público"
  ON packs_suscripcion FOR SELECT
  USING (activo = true);

CREATE POLICY "Admin packs"
  ON packs_suscripcion FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_sistema
      WHERE id = auth.uid()
      AND rol IN ('admin', 'staff')
      AND activo = true
    )
  );

-- Políticas para pedidos (clientes ven sus pedidos, admin ve todos)
CREATE POLICY "Clientes ven sus pedidos"
  ON pedidos FOR SELECT
  USING (
    cliente_id IN (
      SELECT id FROM clientes WHERE email = auth.email()
    )
  );

CREATE POLICY "Admin pedidos"
  ON pedidos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_sistema
      WHERE id = auth.uid()
      AND rol IN ('admin', 'staff')
      AND activo = true
    )
  );

-- ===== DATOS INICIALES =====

-- Configuración inicial
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('compra_minima', '15000', 'Monto mínimo de compra en CLP'),
  ('envio_gratis_desde', '50000', 'Monto para envío gratis en CLP'),
  ('costo_envio_rm', '5000', 'Costo de envío Región Metropolitana'),
  ('costo_envio_valparaiso', '5000', 'Costo de envío Valparaíso'),
  ('email_contacto', 'hola@cabraycurado.cl', 'Email de contacto'),
  ('whatsapp', '+56912345678', 'WhatsApp de contacto'),
  ('regiones_despacho', '["RM", "Valparaíso"]', 'Regiones con despacho disponible')
ON CONFLICT (clave) DO NOTHING;

-- Usuario admin inicial (cambiar password en producción)
-- Nota: Esto es solo para desarrollo. En producción usar Supabase Auth
INSERT INTO usuarios_sistema (email, nombre, rol, activo) VALUES
  ('admin@cabraycurado.cl', 'Administrador', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- ===== COMENTARIOS =====
COMMENT ON TABLE productos IS 'Catálogo de productos (quesos y embutidos)';
COMMENT ON TABLE productores IS 'Productores artesanales asociados';
COMMENT ON TABLE packs_suscripcion IS 'Packs de suscripción mensual';
COMMENT ON TABLE pedidos IS 'Pedidos de clientes';
COMMENT ON TABLE clientes IS 'Base de datos de clientes';
COMMENT ON TABLE suscripciones IS 'Suscripciones activas de clientes';
COMMENT ON TABLE inventario_movimientos IS 'Historial de movimientos de inventario';
COMMENT ON TABLE cupones IS 'Cupones de descuento';
COMMENT ON TABLE configuracion IS 'Configuración general del sistema';
COMMENT ON TABLE logs_actividad IS 'Log de actividad de usuarios del sistema';

-- ===== FIN DEL SCHEMA =====
-- Ejecutar este archivo completo en Supabase SQL Editor
-- Una vez ejecutado, el sistema estará listo para usar
