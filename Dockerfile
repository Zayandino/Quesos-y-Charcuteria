FROM nginx:alpine

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos del sitio
COPY index.html /usr/share/nginx/html/
COPY admin.html /usr/share/nginx/html/
COPY checkout.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY admin_v2.js /usr/share/nginx/html/
COPY data-manager_v2.js /usr/share/nginx/html/

# Copiar script de inicio
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

# Genera config.js desde variables de entorno y luego inicia nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
