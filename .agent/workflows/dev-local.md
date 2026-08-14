---
description: Levantar el sitio en modo desarrollo local con Docker
---

## Levantar servidor local

// turbo
1. Iniciar el contenedor Docker con nginx:
```
docker compose -f docker-compose.dev.yml up -d
```

2. Abrir el sitio en el navegador: http://localhost:8080

3. Para ver los logs del servidor:
```
docker compose -f docker-compose.dev.yml logs -f
```

## Detener servidor local

// turbo
4. Cuando termines de trabajar, detener el contenedor:
```
docker compose -f docker-compose.dev.yml down
```

## Notas
- Los cambios en archivos HTML/CSS/JS se reflejan **inmediatamente** al recargar el navegador (F5)
- No necesitas reconstruir el contenedor al hacer cambios
- El sitio corre en http://localhost:8080
- Usa `Ctrl + Shift + R` para forzar recarga sin caché
