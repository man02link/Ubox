#!/bin/bash

# Asegurar que estamos en el directorio correcto
echo "🚀 Iniciando la creación de la estructura para ubox-back..."

# 1. Crear la estructura de directorios
mkdir -p src/config
mkdir -p src/controllers
mkdir -p src/services
mkdir -p src/daos
mkdir -p src/dtos
mkdir -p src/routes
mkdir -p src/middlewares

# 2. Crear archivos base en la raíz
touch .env
touch .gitignore
touch README.md

# 3. Crear archivos dentro de src/config
touch src/config/db.js
touch src/config/env.js

# 4. Crear archivos dentro de src/controllers
touch src/controllers/inventarioController.js
touch src/controllers/rentasController.js

# 5. Crear archivos dentro de src/services
touch src/services/inventarioService.js
touch src/services/rentasService.js

# 6. Crear archivos dentro de src/daos
touch src/daos/inventarioDao.js
touch src/daos/rentasDao.js

# 7. Crear archivos dentro de src/dtos
touch src/dtos/inventarioDto.js
touch src/dtos/rentasDto.js

# 8. Crear archivos dentro de src/routes
touch src/routes/apiRoutes.js
touch src/routes/inventarioRoutes.js
touch src/routes/rentasRoutes.js

# 9. Crear archivos dentro de src/middlewares
touch src/middlewares/validator.js
touch src/middlewares/errorHandler.js

# 10. Crear archivos principales de la app
touch src/app.js
touch src/server.js

# 11. Crear y escribir el docker-compose.yml de una vez
cat << EOF > docker-compose.yml
version: '3.8'

services:
  ubox-db:
    image: postgres:15-alpine
    container_name: ubox_postgres_local
    restart: always
    environment:
      POSTGRES_USER: ubox_user
      POSTGRES_PASSWORD: ubox_secure_password
      POSTGRES_DB: ubox_inventory_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_ubox_data:/var/lib/postgresql/data

volumes:
  postgres_ubox_data:
EOF

echo "✨ ¡Estructura de carpetas y docker-compose.yml creados con éxito!"