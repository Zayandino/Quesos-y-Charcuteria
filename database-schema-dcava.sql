-- ========================================
-- DCAVA - DATABASE SCHEMA (PREFIJADO)
-- PostgreSQL / Supabase
-- ========================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== TABLA: dcava_usuarios_sistema =====
CREATE TABLE IF NOT EXISTS dcava_usuarios_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin', 'staff', 'viewer')),
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: dcava_productores =====
CREATE TABLE IF NOT EXISTS dcava_productores (
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

-- ===== TABLA: dcava_productos =====
CREATE TABLE IF NOT EXISTS dcava_productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('queso', 'embutido')),
  productor_id INTEGER REFERENCES dcava_productores(id) ON DELETE SET NULL,
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

-- ===== TABLA: dcava_packs_suscripcion =====
CREATE TABLE IF NOT EXISTS dcava_packs_suscripcion (
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

-- ===== TABLA: dcava_clientes =====
CREATE TABLE IF NOT EXISTS dcava_clientes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  direccion TEXT,
  comuna VARCHAR(100),
  region VARCHAR(100),
  notes TEXT, -- cambiado de 'notas' para evitar conflictos o por consistencia
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: dcava_suscripciones =====
CREATE TABLE IF NOT EXISTS dcava_suscripciones (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES dcava_clientes(id) ON DELETE CASCADE,
  pack_id INTEGER REFERENCES dcava_packs_suscripcion(id) ON DELETE SET NULL,
  estado VARCHAR(50) DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada', 'cancelada')),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  mercadopago_subscription_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: dcava_pedidos =====
CREATE TABLE IF NOT EXISTS dcava_pedidos (
  id SERIAL PRIMARY KEY,
  numero_pedido VARCHAR(50) UNIQUE NOT NULL,
  cliente_id INTEGER REFERENCES dcava_clientes(id) ON DELETE SET NULL,
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

-- ===== TABLA: dcava_pedido_items =====
CREATE TABLE IF NOT EXISTS dcava_pedido_items (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER REFERENCES dcava_pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES dcava_productos(id) ON DELETE SET NULL,
  producto_nombre VARCHAR(255) NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: dcava_inventario_movimientos =====
CREATE TABLE IF NOT EXISTS dcava_inventario_movimientos (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER REFERENCES dcava_productos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
  cantidad INTEGER NOT NULL,
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  motivo TEXT,
  pedido_id INTEGER REFERENCES dcava_pedidos(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES dcava_usuarios_sistema(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: dcava_cupones =====
CREATE TABLE IF NOT EXISTS dcava_cupones (
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

-- ===== TABLA: dcava_configuracion =====
CREATE TABLE IF NOT EXISTS dcava_configuracion (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  descripcion TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABLA: dcava_logs_actividad =====
CREATE TABLE IF NOT EXISTS dcava_logs_actividad (
  id SERIAL PRIMARY KEY,
  usuario_id UUID REFERENCES dcava_usuarios_sistema(id) ON DELETE SET NULL,
  accion VARCHAR(100) NOT NULL,
  tabla VARCHAR(100),
  registro_id INTEGER,
  detalles JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== ÍNDICES =====
CREATE INDEX IF NOT EXISTS idx_dcava_productos_categoria ON dcava_productos(categoria);
CREATE INDEX IF NOT EXISTS idx_dcava_productos_productor ON dcava_productos(productor_id);
CREATE INDEX IF NOT EXISTS idx_dcava_productos_activo ON dcava_productos(activo, visible_tienda);
CREATE INDEX IF NOT EXISTS idx_dcava_pedidos_cliente ON dcava_pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_dcava_pedidos_estado ON dcava_pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_dcava_pedidos_numero ON dcava_pedidos(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_dcava_suscripciones_cliente ON dcava_suscripciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_dcava_suscripciones_estado ON dcava_suscripciones(estado);

-- ===== FUNCIONES =====

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION dcava_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_dcava_productores_updated_at ON dcava_productores;
CREATE TRIGGER update_dcava_productores_updated_at BEFORE UPDATE ON dcava_productores FOR EACH ROW EXECUTE FUNCTION dcava_update_updated_at_column();

DROP TRIGGER IF EXISTS update_dcava_productos_updated_at ON dcava_productos;
CREATE TRIGGER update_dcava_productos_updated_at BEFORE UPDATE ON dcava_productos FOR EACH ROW EXECUTE FUNCTION dcava_update_updated_at_column();

DROP TRIGGER IF EXISTS update_dcava_packs_updated_at ON dcava_packs_suscripcion;
CREATE TRIGGER update_dcava_packs_updated_at BEFORE UPDATE ON dcava_packs_suscripcion FOR EACH ROW EXECUTE FUNCTION dcava_update_updated_at_column();

DROP TRIGGER IF EXISTS update_dcava_clientes_updated_at ON dcava_clientes;
CREATE TRIGGER update_dcava_clientes_updated_at BEFORE UPDATE ON dcava_clientes FOR EACH ROW EXECUTE FUNCTION dcava_update_updated_at_column();

DROP TRIGGER IF EXISTS update_dcava_pedidos_updated_at ON dcava_pedidos;
CREATE TRIGGER update_dcava_pedidos_updated_at BEFORE UPDATE ON dcava_pedidos FOR EACH ROW EXECUTE FUNCTION dcava_update_updated_at_column();

DROP TRIGGER IF EXISTS update_dcava_usuarios_updated_at ON dcava_usuarios_sistema;
CREATE TRIGGER update_dcava_usuarios_updated_at BEFORE UPDATE ON dcava_usuarios_sistema FOR EACH ROW EXECUTE FUNCTION dcava_update_updated_at_column();

-- ===== ROW LEVEL SECURITY (RLS) =====

-- Habilitar RLS
ALTER TABLE dcava_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dcava_productores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dcava_packs_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE dcava_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dcava_clientes ENABLE ROW LEVEL SECURITY;

-- Políticas para productos (público puede ver activos, admin puede todo)
DROP POLICY IF EXISTS "DCAVA Productos visibles público" ON dcava_productos;
CREATE POLICY "DCAVA Productos visibles público"
  ON dcava_productos FOR SELECT
  USING (activo = true AND visible_tienda = true);

DROP POLICY IF EXISTS "DCAVA Admin productos" ON dcava_productos;
CREATE POLICY "DCAVA Admin productos"
  ON dcava_productos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dcava_usuarios_sistema
      WHERE id = auth.uid()
      AND rol IN ('admin', 'staff')
      AND activo = true
    )
  );

-- Políticas para productores (público puede ver activos, admin puede todo)
DROP POLICY IF EXISTS "DCAVA Productores visibles público" ON dcava_productores;
CREATE POLICY "DCAVA Productores visibles público"
  ON dcava_productores FOR SELECT
  USING (activo = true);

DROP POLICY IF EXISTS "DCAVA Admin productores" ON dcava_productores;
CREATE POLICY "DCAVA Admin productores"
  ON dcava_productores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dcava_usuarios_sistema
      WHERE id = auth.uid()
      AND rol IN ('admin', 'staff')
      AND activo = true
    )
  );

-- Políticas para packs (público puede ver activos, admin puede todo)
DROP POLICY IF EXISTS "DCAVA Packs visibles público" ON dcava_packs_suscripcion;
CREATE POLICY "DCAVA Packs visibles público"
  ON dcava_packs_suscripcion FOR SELECT
  USING (activo = true);

DROP POLICY IF EXISTS "DCAVA Admin packs" ON dcava_packs_suscripcion;
CREATE POLICY "DCAVA Admin packs"
  ON dcava_packs_suscripcion FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dcava_usuarios_sistema
      WHERE id = auth.uid()
      AND rol IN ('admin', 'staff')
      AND activo = true
    )
  );

-- Políticas para pedidos (clientes ven sus pedidos, admin ve todos)
DROP POLICY IF EXISTS "DCAVA Clientes ven sus pedidos" ON dcava_pedidos;
CREATE POLICY "DCAVA Clientes ven sus pedidos"
  ON dcava_pedidos FOR SELECT
  USING (
    cliente_id IN (
      SELECT id FROM dcava_clientes WHERE email = auth.email()
    )
  );

DROP POLICY IF EXISTS "DCAVA Admin pedidos" ON dcava_pedidos;
CREATE POLICY "DCAVA Admin pedidos"
  ON dcava_pedidos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dcava_usuarios_sistema
      WHERE id = auth.uid()
      AND rol IN ('admin', 'staff')
      AND activo = true
    )
  );

-- Políticas para categorías y configuración (público lee, admin modifica)
ALTER TABLE dcava_configuracion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "DCAVA Config lectura pública" ON dcava_configuracion;
CREATE POLICY "DCAVA Config lectura pública" ON dcava_configuracion FOR SELECT USING (true);

DROP POLICY IF EXISTS "DCAVA Config admin modifica" ON dcava_configuracion;
CREATE POLICY "DCAVA Config admin modifica" ON dcava_configuracion FOR ALL
  USING (EXISTS (SELECT 1 FROM dcava_usuarios_sistema WHERE id = auth.uid() AND rol IN ('admin', 'staff') AND activo = true));

ALTER TABLE dcava_pedido_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "DCAVA Pedido items lectura" ON dcava_pedido_items;
CREATE POLICY "DCAVA Pedido items lectura" ON dcava_pedido_items FOR SELECT USING (true);

-- ===== DATOS INICIALES =====

-- Configuración inicial
INSERT INTO dcava_configuracion (clave, valor, descripcion) VALUES
  ('compra_minima', '15000', 'Monto mínimo de compra en CLP'),
  ('envio_gratis_desde', '50000', 'Monto para envío gratis en CLP'),
  ('costo_envio_rm', '5000', 'Costo de envío Región Metropolitana'),
  ('costo_envio_valparaiso', '5000', 'Costo de envío Valparaíso'),
  ('email_contacto', 'hola@dcava.cl', 'Email de contacto'),
  ('whatsapp', '+56912345678', 'WhatsApp de contacto'),
  ('regiones_despacho', '["RM", "Valparaíso"]', 'Regiones con despacho disponible')
ON CONFLICT (clave) DO NOTHING;

-- Usuario admin inicial de desarrollo
-- Nota: Esto es solo para desarrollo. En producción usar Supabase Auth
INSERT INTO dcava_usuarios_sistema (email, nombre, rol, activo) VALUES
  ('admin@dcava.cl', 'Administrador', 'admin', true),
  ('ambler.eduardo@gmail.com', 'Eduardo Ambler', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- ===== COMENTARIOS =====
COMMENT ON TABLE dcava_productos IS 'Catálogo de productos (quesos y embutidos)';
COMMENT ON TABLE dcava_productores IS 'Productores artesanales asociados';
COMMENT ON TABLE dcava_packs_suscripcion IS 'Packs de suscripción mensual';
COMMENT ON TABLE dcava_pedidos IS 'Pedidos de clientes';
COMMENT ON TABLE dcava_clientes IS 'Base de datos de clientes';
COMMENT ON TABLE dcava_suscripciones IS 'Suscripciones activas de clientes';
COMMENT ON TABLE dcava_inventario_movimientos IS 'Historial de movimientos de inventario';
COMMENT ON TABLE dcava_cupones IS 'Cupones de descuento';
COMMENT ON TABLE dcava_configuracion IS 'Configuración general del sistema';
COMMENT ON TABLE dcava_logs_actividad IS 'Log de actividad de usuarios del sistema';

-- ===== MIGRACIÓN v2.5: PACKS MEJORADOS =====
-- Ejecutar solo si no existen las columnas

ALTER TABLE dcava_packs_suscripcion
  ADD COLUMN IF NOT EXISTS imagen_url TEXT,
  ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_original INTEGER,
  ADD COLUMN IF NOT EXISTS badge VARCHAR(100);

-- Índice para ordenar packs por posición
CREATE INDEX IF NOT EXISTS idx_dcava_packs_orden ON dcava_packs_suscripcion(orden, activo);

-- Política pública de lectura para packs activos (ya existe, verificar)
-- Los packs activos son visibles en el sitio sin autenticación
-- Los inactivos solo los ve el admin

