# 🧪 Testing Guide - Chat en Tiempo Real V2

## 📋 Tabla de Contenidos

- [Backend Tests](#backend-tests)
- [Frontend Tests](#frontend-tests)
- [Configuración](#configuración)
- [Ejecución de Tests](#ejecución-de-tests)
- [Cobertura](#cobertura)
- [CI/CD Integration](#cicd-integration)

---

## 🔧 Backend Tests

### Estructura de Tests

```
backend/
├── __tests__/
│   ├── unit/
│   │   ├── user.model.test.js
│   │   ├── room.model.test.js
│   │   ├── encryption.service.test.js
│   │   └── ...
│   └── integration/
│       ├── auth.routes.test.js
│       ├── room.routes.test.js
│       ├── socket.test.js
│       └── ...
```

### Dependencias Instaladas

```json
{
  "jest": "^29.7.0",
  "supertest": "^6.3.3",
  "mongodb-memory-server": "^9.1.3",
  "sinon": "^17.0.1",
  "chai": "^4.3.10",
  "chai-http": "^4.4.0"
}
```

### Instalación

```bash
cd backend
npm install
```

### Scripts Disponibles

```bash
# Ejecutar todos los tests con cobertura
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar solo tests unitarios
npm run test:unit

# Ejecutar solo tests de integración
npm run test:integration

# Generar reporte de cobertura HTML
npm run test:coverage
```

### Tests Unitarios

#### User Model Tests
- ✅ Creación de usuarios
- ✅ Validación de campos requeridos
- ✅ Prevención de duplicados
- ✅ 2FA habilitación
- ✅ Tracking de sesiones

#### Room Model Tests
- ✅ Creación de salas
- ✅ Validación de PIN único
- ✅ Gestión de participantes
- ✅ Límites de capacidad
- ✅ Estados de sala (activa/inactiva)

#### Encryption Service Tests
- ✅ Generación de claves de sala
- ✅ Encriptación/Desencriptación
- ✅ Manejo de unicode
- ✅ Validación de claves incorrectas
- ✅ Funciones de hash

### Tests de Integración

#### Auth Routes Tests
- ✅ Registro de usuarios
- ✅ Login con credenciales válidas
- ✅ Validación de email
- ✅ Validación de contraseña
- ✅ Logout

#### Room Routes Tests
- ✅ Listado de salas activas
- ✅ Creación de salas
- ✅ Obtener sala por PIN
- ✅ Eliminación de salas
- ✅ Autenticación requerida

#### Socket.IO Tests
- ✅ Conexión al servidor
- ✅ Join/Leave room
- ✅ Envío de mensajes
- ✅ Manejo de errores

---

## ⚛️ Frontend Tests

### Estructura de Tests

```
frontend/src/
├── components/
│   └── __tests__/
│       ├── MessageInput.test.js
│       ├── AuthModal.test.js
│       ├── RoomManager.test.js
│       └── ...
└── services/
    └── __tests__/
        ├── cryptoService.test.js
        └── ...
```

### Dependencias (ya instaladas)

```json
{
  "@testing-library/react": "^16.1.0",
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/user-event": "^14.5.2"
}
```

### Scripts Disponibles

```bash
cd frontend

# Ejecutar tests en modo interactivo
npm test

# Ejecutar tests con cobertura
npm test -- --coverage --watchAll=false

# Ejecutar tests específicos
npm test MessageInput
```

### Tests de Componentes

#### MessageInput Tests
- ✅ Renderizado del input
- ✅ Manejo de texto
- ✅ Envío de mensajes
- ✅ Limpieza después de enviar
- ✅ Validación de mensajes vacíos
- ✅ Modo de respuesta

#### AuthModal Tests
- ✅ Renderizado de formularios
- ✅ Login vs Register mode
- ✅ Validación de campos
- ✅ Cambio de modo
- ✅ Cierre del modal

#### RoomManager Tests
- ✅ Renderizado del manager
- ✅ Creación de salas
- ✅ Join/Leave room
- ✅ Validación de PIN
- ✅ Permisos de usuario

### Tests de Servicios

#### CryptoService Tests
- ✅ Encriptación/Desencriptación
- ✅ Generación de claves
- ✅ Funciones de hash
- ✅ Generación de valores aleatorios

---

## ⚙️ Configuración

### Backend Jest Config

En `package.json`:

```json
{
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "controllers/**/*.js",
      "services/**/*.js",
      "middlewares/**/*.js",
      "models/**/*.js",
      "routes/**/*.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
```

### Frontend Test Config

Ya configurado por `react-scripts`.

### Variables de Entorno para Tests

Crear `.env.test` en backend:

```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/test
JWT_SECRET=test-jwt-secret-key
ENCRYPTION_KEY=test-encryption-key-32-chars!!
```

---

## 🚀 Ejecución de Tests

### Backend

```bash
cd backend

# Todos los tests
npm test

# Tests específicos
npm test user.model.test

# Solo unitarios
npm run test:unit

# Solo integración
npm run test:integration

# Watch mode
npm run test:watch
```

### Frontend

```bash
cd frontend

# Modo interactivo
npm test

# Una vez con cobertura
npm test -- --coverage --watchAll=false

# Tests específicos
npm test AuthModal
```

### Ambos (desde raíz)

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test -- --coverage --watchAll=false
```

---

## 📊 Cobertura

### Umbrales Configurados

**Backend**: 70% mínimo en:
- Branches
- Functions
- Lines
- Statements

**Frontend**: Por defecto de Create React App

### Ver Reportes

#### Backend

```bash
cd backend
npm run test:coverage

# Abrir reporte HTML
start coverage/lcov-report/index.html  # Windows
open coverage/lcov-report/index.html   # Mac
xdg-open coverage/lcov-report/index.html  # Linux
```

#### Frontend

```bash
cd frontend
npm test -- --coverage --watchAll=false

# Abrir reporte HTML
start coverage/lcov-report/index.html  # Windows
```

### Archivos Generados

```
backend/coverage/
├── lcov-report/
│   └── index.html
├── lcov.info
└── coverage-final.json

frontend/coverage/
├── lcov-report/
│   └── index.html
└── lcov.info
```

---

## 🔄 CI/CD Integration

### GitHub Actions (ya configurado)

Los workflows ejecutan tests automáticamente:

#### Backend CI

```yaml
- name: Run tests
  run: |
    cd backend
    npm test
```

#### Frontend CI

```yaml
- name: Run tests
  run: |
    cd frontend
    npm test -- --coverage --watchAll=false
```

### Pre-commit Hook (recomendado)

Crear `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run backend tests
cd backend && npm test --silent
BACKEND_EXIT=$?

# Run frontend tests
cd ../frontend && npm test -- --coverage --watchAll=false --silent
FRONTEND_EXIT=$?

# Exit with error if any failed
if [ $BACKEND_EXIT -ne 0 ] || [ $FRONTEND_EXIT -ne 0 ]; then
  echo "❌ Tests failed! Commit aborted."
  exit 1
fi

echo "✅ All tests passed!"
```

---

## 📝 Escribir Nuevos Tests

### Backend Test Template

```javascript
const mongoose = require('mongoose');
const YourModel = require('../../models/YourModel');

describe('YourModel Tests', () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI);
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    afterEach(async () => {
        await YourModel.deleteMany({});
    });

    describe('Feature', () => {
        it('should do something', async () => {
            // Arrange
            const data = { /* ... */ };

            // Act
            const result = await YourModel.create(data);

            // Assert
            expect(result).toBeDefined();
        });
    });
});
```

### Frontend Test Template

```javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import YourComponent from '../YourComponent';

describe('YourComponent', () => {
    const mockProps = {
        // ...
    };

    it('renders correctly', () => {
        render(<YourComponent {...mockProps} />);
        
        expect(screen.getByText(/expected text/i)).toBeInTheDocument();
    });

    it('handles interactions', () => {
        const mockHandler = jest.fn();
        render(<YourComponent onAction={mockHandler} />);
        
        const button = screen.getByRole('button');
        fireEvent.click(button);
        
        expect(mockHandler).toHaveBeenCalled();
    });
});
```

---

## 🐛 Troubleshooting

### MongoDB Connection Error

```bash
# Instalar MongoDB Memory Server
npm install --save-dev mongodb-memory-server
```

### Jest Timeout

Aumentar timeout en el test:

```javascript
jest.setTimeout(10000); // 10 segundos
```

### Frontend Test No Encuentra Componente

Verificar import paths y mocks:

```javascript
jest.mock('../../services/socketService');
```

### Coverage No Se Genera

```bash
# Limpiar cache
npm test -- --clearCache

# Regenerar coverage
npm test -- --coverage --no-cache
```

---

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

---

## ✅ Checklist de Tests

### Backend
- [x] User Model
- [x] Room Model  
- [x] Encryption Service
- [x] Auth Routes
- [x] Room Routes
- [x] Socket.IO

### Frontend
- [x] MessageInput Component
- [x] AuthModal Component
- [x] RoomManager Component
- [x] CryptoService

### Pendientes
- [ ] Message Model Tests
- [ ] Admin Panel Tests
- [ ] File Upload Tests
- [ ] E2E Tests con Cypress

---

**Última actualización**: 2025-11-18  
**Cobertura actual**: Backend ~70% | Frontend ~65%  
**Tests totales**: 50+ tests unitarios + 20+ tests de integración
