# Actualización de Estado 2FA en Frontend

## Problema
Después de activar o desactivar el 2FA, el frontend no reflejaba el cambio de estado inmediatamente. El usuario tenía que cerrar y volver a abrir el panel de configuración para ver el estado actualizado.

## Solución Implementada

### Backend

#### 1. Endpoint `/api/user-auth/verify` - ACTUALIZADO
**Archivo**: `backend/routes/userAuthRoutes.js`

**Cambio**: Ahora retorna el campo `twoFactorEnabled`

```javascript
res.json({
    valid: true,
    user: {
        username: user.username,
        role: user.role,
        stats: user.stats,
        twoFactorEnabled: user.twoFactorEnabled || false  // ← NUEVO
    }
});
```

#### 2. Endpoint `/api/auth/verify` (Admin) - ACTUALIZADO
**Archivo**: `backend/controllers/authController.js`

**Cambio**: Ahora retorna explícitamente el campo `twoFactorEnabled`

```javascript
res.json({ 
    user: {
        id: user._id,
        username: user.username,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled || false,  // ← NUEVO
        stats: user.stats
    }
});
```

### Frontend

#### 1. Componente AdminPanel - MEJORADO
**Archivo**: `frontend/src/components/AdminPanel.js`

**Cambios principales:**

1. **Estado de 2FA agregado**:
```javascript
const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
const [loading, setLoading] = useState(true);
```

2. **Verificación de estado al montar**:
```javascript
useEffect(() => {
    checkTwoFactorStatus();
}, []);

const checkTwoFactorStatus = async () => {
    try {
        setLoading(true);
        const baseRoute = userRole === 'admin' ? '/api/auth' : '/api/user-auth';
        const response = await axios.get(`${API_URL}${baseRoute}/verify`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        const userData = response.data.user || response.data.admin || response.data;
        setTwoFactorEnabled(userData.twoFactorEnabled || false);
    } catch (err) {
        console.error('Error checking 2FA status:', err);
        setTwoFactorEnabled(false);
    } finally {
        setLoading(false);
    }
};
```

3. **Mostrar estado visual**:
```javascript
{loading ? (
    <p className="status-loading">⏳ Verificando estado...</p>
) : (
    <p className={`status-badge ${twoFactorEnabled ? 'enabled' : 'disabled'}`}>
        {twoFactorEnabled ? '✅ 2FA Activado' : '⚠️ 2FA Desactivado'}
    </p>
)}
```

4. **Botón dinámico**:
```javascript
<button 
    className="config-button"
    onClick={() => setShow2FA(true)}
    disabled={loading}
>
    {twoFactorEnabled ? 'Gestionar 2FA' : 'Configurar 2FA'}
</button>
```

5. **Actualización al cerrar modal**:
```javascript
{show2FA && (
    <TwoFactorSetup
        token={userToken}
        userRole={userRole}
        onClose={() => {
            setShow2FA(false);
            checkTwoFactorStatus(); // ← Refrescar estado
        }}
        onUpdate={handle2FAUpdate}
    />
)}
```

6. **Handler de actualización**:
```javascript
const handle2FAUpdate = (enabled) => {
    console.log('2FA actualizado a:', enabled);
    setTwoFactorEnabled(enabled);
    setShow2FA(false);
};
```

#### 2. Estilos CSS - NUEVOS
**Archivo**: `frontend/src/styles/AdminPanel.css`

**Agregados:**

```css
/* Status badges */
.status-badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    margin-top: 8px;
}

.status-badge.enabled {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.status-badge.disabled {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
}

.status-loading {
    color: #666;
    font-size: 13px;
    font-style: italic;
    margin-top: 8px;
}

/* Dark mode */
body.dark-mode .status-badge.enabled {
    background: #1e4620;
    color: #90ee90;
    border-color: #2d5a2e;
}

body.dark-mode .status-badge.disabled {
    background: #4a3f1a;
    color: #ffd966;
    border-color: #5c4d20;
}

body.dark-mode .status-loading {
    color: #999;
}
```

## Flujo de Actualización

### Al Abrir Panel de Configuración:
1. Usuario hace clic en "⚙️ Configuración"
2. `AdminPanel` se monta y ejecuta `useEffect`
3. Se llama a `checkTwoFactorStatus()`
4. Se hace request a `/api/[auth|user-auth]/verify`
5. Backend retorna `twoFactorEnabled: true/false`
6. Estado se actualiza y se muestra badge visual

### Al Activar 2FA:
1. Usuario completa el flujo de activación en `TwoFactorSetup`
2. Backend actualiza `user.twoFactorEnabled = true`
3. `TwoFactorSetup` llama a `onUpdate(true)`
4. `AdminPanel` recibe el callback y actualiza estado local
5. Badge cambia a "✅ 2FA Activado"
6. Botón cambia a "Gestionar 2FA"

### Al Desactivar 2FA:
1. Usuario desactiva 2FA en `TwoFactorSetup`
2. Backend actualiza `user.twoFactorEnabled = false`
3. `TwoFactorSetup` llama a `onUpdate(false)`
4. `AdminPanel` recibe el callback y actualiza estado local
5. Badge cambia a "⚠️ 2FA Desactivado"
6. Botón cambia a "Configurar 2FA"

### Al Cerrar Modal:
1. Usuario cierra `TwoFactorSetup`
2. Se ejecuta `onClose` callback
3. `checkTwoFactorStatus()` se vuelve a ejecutar
4. Se verifica estado actual desde el servidor
5. Se muestra estado actualizado

## Indicadores Visuales

### Estado Activado
```
┌─────────────────────────────────────┐
│ 🔐 Autenticación de Dos Factores    │
│ Agrega una capa adicional de...     │
│                                      │
│ ✅ 2FA Activado                     │
│                          [Gestionar] │
└─────────────────────────────────────┘
```

### Estado Desactivado
```
┌─────────────────────────────────────┐
│ 🔐 Autenticación de Dos Factores    │
│ Agrega una capa adicional de...     │
│                                      │
│ ⚠️ 2FA Desactivado                  │
│                        [Configurar]  │
└─────────────────────────────────────┘
```

### Estado Cargando
```
┌─────────────────────────────────────┐
│ 🔐 Autenticación de Dos Factores    │
│ Agrega una capa adicional de...     │
│                                      │
│ ⏳ Verificando estado...             │
│                        [Configurar]  │
└─────────────────────────────────────┘
```

## Archivos Modificados

### Backend (2 archivos)
1. ✅ `backend/routes/userAuthRoutes.js` - Endpoint `/verify` retorna `twoFactorEnabled`
2. ✅ `backend/controllers/authController.js` - Endpoint admin `/verify` retorna `twoFactorEnabled`

### Frontend (2 archivos)
1. ✅ `frontend/src/components/AdminPanel.js` - Gestión de estado 2FA
2. ✅ `frontend/src/styles/AdminPanel.css` - Estilos para badges de estado

## Beneficios

✅ **Feedback Inmediato**: Usuario ve el cambio sin recargar
✅ **Consistencia**: Estado siempre sincronizado con servidor
✅ **UX Mejorada**: Indicadores visuales claros del estado
✅ **Responsive**: Se adapta a modo claro y oscuro
✅ **Confiable**: Verifica estado al abrir y al cerrar

## Pruebas Recomendadas

1. ✅ Abrir configuración → Ver estado actual
2. ✅ Activar 2FA → Badge cambia a "Activado"
3. ✅ Cerrar y reabrir → Sigue mostrando "Activado"
4. ✅ Desactivar 2FA → Badge cambia a "Desactivado"
5. ✅ Cerrar y reabrir → Sigue mostrando "Desactivado"
6. ✅ Refrescar página completa → Estado persiste

---

**Fecha**: 25 de Octubre, 2025
**Estado**: ✅ IMPLEMENTADO - Listo para probar
