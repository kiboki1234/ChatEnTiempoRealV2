# 🚀 GitHub Actions Workflows - Guía Completa

## Workflows Implementados

### 1. **Keep Alive** (`keep-alive.yml`)
- **Frecuencia**: Cada 10 minutos
- **Propósito**: Mantener Render backend activo
- **Endpoints**: `/api/keep-alive`, `/health`
- **Estado**: ✅ Activo

### 2. **Backend CI/CD** (`backend-ci.yml`)
- **Triggers**: Push a `main`/`develop`, PRs, cambios en `/backend`
- **Acciones**:
  - ✅ Tests en Node.js 18.x y 20.x
  - ✅ Audit de seguridad (`npm audit`)
  - ✅ Linting con ESLint
  - ✅ Verificación de inicio del servidor
  - ✅ Scan de seguridad con Snyk/TruffleHog
- **Estado**: 🆕 Nuevo

### 3. **Frontend CI/CD** (`frontend-ci.yml`)
- **Triggers**: Push a `main`/`develop`, PRs, cambios en `/frontend`
- **Acciones**:
  - ✅ Build de producción
  - ✅ Tests con coverage
  - ✅ Linting
  - ✅ Audit de seguridad
  - ✅ Lighthouse performance
  - ✅ Análisis de tamaño del build
- **Estado**: 🆕 Nuevo

### 4. **Dependency Review** (`dependency-review.yml`)
- **Frecuencia**: Semanal (lunes 9 AM) + en PRs
- **Acciones**:
  - ✅ Revisar dependencias nuevas
  - ✅ Detectar vulnerabilidades
  - ✅ Generar reportes JSON
  - ✅ Alertar sobre paquetes desactualizados
- **Estado**: 🆕 Nuevo

### 5. **Health Monitor** (`health-monitor.yml`)
- **Frecuencia**: Cada hora
- **Acciones**:
  - ✅ Check health endpoint
  - ✅ Validar MongoDB connection
  - ✅ Verificar Socket.IO
  - ✅ Medir tiempos de respuesta
  - ✅ Alertas si falla
- **Estado**: 🆕 Nuevo

### 6. **CodeQL Security** (`codeql-analysis.yml`)
- **Frecuencia**: Semanal (domingos 2 AM) + push/PRs
- **Acciones**:
  - ✅ Análisis de seguridad estático
  - ✅ Detección de vulnerabilidades
  - ✅ Queries de calidad de código
  - ✅ Integración con GitHub Security
- **Estado**: 🆕 Nuevo

---

## 📋 Configuración Requerida

### Secrets de GitHub (Opcionales)

Ve a: `Settings → Secrets and variables → Actions → New repository secret`

| Secret | Requerido | Propósito |
|--------|-----------|-----------|
| `BACKEND_URL` | ❌ No | URL del backend (tiene fallback) |
| `SNYK_TOKEN` | ❌ No | Token de Snyk para security scan |

---

## 🎯 Workflows por Caso de Uso

### Para Desarrollo Diario
```yaml
✅ backend-ci.yml      # Auto en cada push
✅ frontend-ci.yml     # Auto en cada push
✅ keep-alive.yml      # Auto cada 10 min
```

### Para Pull Requests
```yaml
✅ backend-ci.yml      # Tests obligatorios
✅ frontend-ci.yml     # Build obligatorio
✅ dependency-review   # Review de dependencias
✅ codeql-analysis     # Security check
```

### Para Monitoreo Continuo
```yaml
✅ keep-alive.yml      # Cada 10 min
✅ health-monitor.yml  # Cada hora
✅ dependency-review   # Semanal
✅ codeql-analysis     # Semanal
```

---

## 🔧 Personalización

### Cambiar Frecuencia de Keep-Alive
```yaml
# .github/workflows/keep-alive.yml
on:
  schedule:
    - cron: '*/5 * * * *'  # Cada 5 minutos
```

### Cambiar Versiones de Node.js
```yaml
# backend-ci.yml / frontend-ci.yml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]  # Agregar Node 22
```

### Desactivar Workflow
```yaml
# Comentar el trigger 'schedule'
# on:
#   schedule:
#     - cron: '0 * * * *'
```

---

## 📊 Monitoreo de Workflows

### Ver Estado
```bash
# En GitHub
Actions → All workflows → Ver historial
```

### Ver Logs
```bash
# Clic en workflow → Clic en job → Ver steps
```

### Ejecutar Manualmente
```bash
# Actions → Workflow name → Run workflow
```

---

## 🚨 Troubleshooting

### Workflow Falla en Backend CI
**Síntoma**: "npm audit" encuentra vulnerabilidades críticas

**Solución**:
```bash
cd backend
npm audit fix --force
git commit -am "fix: security vulnerabilities"
git push
```

### Workflow Falla en Frontend Build
**Síntoma**: "Build failed" en frontend-ci.yml

**Solución**:
```bash
cd frontend
npm run build  # Probar localmente
# Revisar errores de compilación
```

### Keep-Alive No Se Ejecuta
**Síntoma**: No aparece en Actions

**Solución**:
1. Verificar que `.github/workflows/keep-alive.yml` existe
2. Hacer commit/push del archivo
3. Esperar 10 minutos
4. Verificar en Actions tab

### Health Monitor Reporta Errores
**Síntoma**: "Backend unhealthy - Status: 503"

**Solución**:
1. Verificar Render logs: `render logs --tail`
2. Revisar MongoDB connection
3. Verificar variables de entorno

---

## 🎓 Mejores Prácticas

### 1. **No Ejecutar Tests Innecesarios**
```yaml
# Solo ejecutar en cambios relevantes
on:
  push:
    paths:
      - 'backend/**'  # Solo si backend cambia
```

### 2. **Usar Caché**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    cache: 'npm'  # Cachea node_modules
```

### 3. **Timeout Generoso**
```yaml
jobs:
  build:
    timeout-minutes: 15  # Prevenir workflows colgados
```

### 4. **Continue-on-Error para Checks No Críticos**
```yaml
- name: Lint code
  run: npm run lint
  continue-on-error: true  # No falla el workflow
```

---

## 📈 Límites de GitHub Actions (Free Tier)

| Recurso | Límite |
|---------|--------|
| **Minutos/mes** | 2000 min (repos públicos: ilimitado) |
| **Almacenamiento** | 500 MB |
| **Concurrent jobs** | 20 |
| **Job execution time** | 6 horas |

**Uso Estimado de Este Proyecto:**
- Keep-alive: ~50 min/mes (cada 10 min × 30 días)
- Health monitor: ~100 min/mes (cada hora)
- CI/CD: ~200 min/mes (10 push/mes × 20 min)
- **Total**: ~350 min/mes ✅ Dentro del límite

---

## 🔐 Security Best Practices

### 1. No Hardcodear Secrets
```yaml
# ❌ MAL
env:
  API_KEY: "mi-clave-secreta"

# ✅ BIEN
env:
  API_KEY: ${{ secrets.API_KEY }}
```

### 2. Usar Permisos Mínimos
```yaml
permissions:
  contents: read        # Solo lectura
  pull-requests: write  # Escribir en PRs
```

### 3. Validar Inputs Externos
```yaml
- name: Validate input
  run: |
    if [[ ! "$URL" =~ ^https:// ]]; then
      echo "Invalid URL"
      exit 1
    fi
```

---

## 📚 Recursos Adicionales

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Marketplace de Actions](https://github.com/marketplace?type=actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

**Última actualización**: 2025-11-16
**Versión**: 1.0.0
**Mantenedor**: ChatEnTiempoRealV2 Team
