FROM nginx:alpine

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar todos los archivos del sitio web y assets
COPY . /usr/share/nginx/html/

# Copiar script de inicio y sanitizar fin de línea CRLF para Linux
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 80

# Genera config.js desde variables de entorno y luego inicia nginx
ENTRYPOINT ["/docker-entrypoint.sh"]

