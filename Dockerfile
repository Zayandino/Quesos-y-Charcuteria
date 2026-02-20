FROM nginx:alpine

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos del sitio
COPY index.html /usr/share/nginx/html/
COPY admin.html /usr/share/nginx/html/
COPY checkout.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY admin_v2.js /usr/share/nginx/html/
COPY data-manager_v2.js /usr/share/nginx/html/

# Copiar config.js solo si existe (se maneja con variables de entorno en producción)
# NOTA: En producción, config.js se debe crear manualmente o via Coolify env vars

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
