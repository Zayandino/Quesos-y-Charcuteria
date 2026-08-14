---
description: Desplegar cambios al sitio de producción en Hostinger
---

## Pre-requisitos
- Asegúrate de haber probado los cambios localmente en http://localhost:8080
- Verifica que no haya errores en la consola del navegador

## Pasos para desplegar

1. Verificar qué archivos fueron modificados:
```
git status
```

2. Revisar los cambios antes de subir:
```
git diff
```

3. Agregar los archivos modificados:
```
git add -A
```

4. Crear un commit con mensaje descriptivo:
```
git commit -m "descripción de los cambios"
```

5. Subir a producción:
```
git push origin main
```

6. Esperar 1-2 minutos y verificar en: https://lightyellow-antelope-273460.hostingersite.com/

## ⚠️ Importante
- NUNCA subas `config.js` (contiene credenciales, está en .gitignore)
- Siempre prueba localmente antes de hacer push
- Si algo sale mal, puedes revertir con: `git revert HEAD`
