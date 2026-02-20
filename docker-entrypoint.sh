#!/bin/sh
# Genera config.js desde variables de entorno de Coolify
cat > /usr/share/nginx/html/config.js << EOF
const CONFIG = {
    SUPABASE_URL: '${SUPABASE_URL}',
    SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}',
    MP_PUBLIC_KEY: '${MP_PUBLIC_KEY}',
    MP_ACCESS_TOKEN: '${MP_ACCESS_TOKEN}'
};
EOF

echo "✅ config.js generado desde variables de entorno"

# Iniciar nginx
exec nginx -g 'daemon off;'
