#!/bin/sh
# Genera config.js desde variables de entorno de Coolify/Dokploy (con fallbacks seguros)
SUPABASE_URL_VAL="${SUPABASE_URL:-https://api.cohablosandes.cloud}"
SUPABASE_KEY_VAL="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQyMjA4NDksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.OM8ePDG-yZwyT-vcGxB2ECMsHngThAEELd0tq7TY7eg}"

cat > /usr/share/nginx/html/config.js << EOF
const CONFIG = {
    SUPABASE_URL: '${SUPABASE_URL_VAL}',
    SUPABASE_ANON_KEY: '${SUPABASE_KEY_VAL}',
    MP_PUBLIC_KEY: '${MP_PUBLIC_KEY}'
};
EOF

echo "✅ config.js generado exitosamente"

# Iniciar nginx
exec nginx -g 'daemon off;'

