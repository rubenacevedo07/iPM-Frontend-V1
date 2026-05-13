# 📊 Guía de Nodos del Grafo — Iconos y Avatares

## ✅ Cambios Implementados

### 1. **Border Radius Más Cuadrado**
- **Antes**: `rounded-xl` (12px)
- **Ahora**: `rounded-md` (6px)
- Estilo más angular y profesional

### 2. **Iconos y Avatares en Nodos**
Cada nodo ahora puede tener:
- **Icono** (usando Lucide React)
- **Avatar** (iniciales con color personalizado)

---

## 🎨 Tipos de Visualización

### **Opción A: Icono**
```tsx
{
  id: 'empresaB',
  data: {
    label: 'Empresa B',
    sublabel: 'Shared director',
    icon: <Building2 size={18} />,  // ← Lucide icon
    nodeType: 'risk'
  }
}
```

**Iconos disponibles** (importados de `lucide-react`):
- `Building2` - Empresas/organizaciones
- `User` - Personas individuales
- `Briefcase` - Bancos/instituciones financieras
- `AlertTriangle` - Alertas/warnings
- `Users` - Grupos/equipos
- `TrendingDown` - Proveedores/tendencias negativas

### **Opción B: Avatar con Iniciales**
```tsx
{
  id: 'clienteA',
  data: {
    label: 'Cliente A',
    sublabel: 'Primary entity',
    avatar: 'CA',              // ← Iniciales (2 letras)
    avatarColor: '#4DA3FF',    // ← Color del avatar
    nodeType: 'highlight'
  }
}
```

**Colores de Avatar Recomendados**:
- `#4DA3FF` - Azul (entidades principales)
- `#F5A623` - Amber (riesgo)
- `#E05252` - Rojo (alertas)
- `#6B8099` - Gris (secundarios)
- `#3ECF8E` - Verde (activos/ok)

---

## 📐 Estructura del Nodo

```
┌─────────────────────────────┐
│  [Icono/Avatar]  Nombre     │  ← Header con icono
│                  Sublabel   │
│                             │
│  [Badge opcional]           │  ← Risk 72, etc.
└─────────────────────────────┘
```

### Layout Interno:
```tsx
<div className="flex items-center gap-2.5">
  {/* Icono o Avatar (32x32px) */}
  <div className="w-8 h-8 rounded-md">
    {icon || avatar}
  </div>

  {/* Textos */}
  <div className="flex-1">
    <div className="font-['Rajdhani']">Nombre</div>
    <div className="font-['DM_Mono']">Sublabel</div>
  </div>
</div>
```

---

## 🔧 Cómo Agregar Más Iconos

### 1. Importar desde Lucide React
```tsx
import { 
  Building2, 
  User, 
  Briefcase,
  Shield,      // ← Nuevo: seguridad
  Database,    // ← Nuevo: datos
  Globe        // ← Nuevo: internacional
} from 'lucide-react';
```

### 2. Usar en los datos del nodo
```tsx
{
  id: 'security-dept',
  data: {
    label: 'Security Dept',
    icon: <Shield size={18} />,
    nodeType: 'default'
  }
}
```

### 3. Iconos recomendados por tipo de entidad

| Tipo de Entidad | Icono Recomendado |
|----------------|------------------|
| Persona | `<User size={18} />` |
| Empresa | `<Building2 size={18} />` |
| Banco | `<Briefcase size={18} />` |
| Alerta | `<AlertTriangle size={18} />` |
| Grupo | `<Users size={18} />` |
| Proveedor | `<TrendingDown size={18} />` |
| Seguridad | `<Shield size={18} />` |
| Base de datos | `<Database size={18} />` |
| Internacional | `<Globe size={18} />` |

---

## 🎨 Ejemplos Completos

### Ejemplo 1: Nodo de Persona con Avatar
```tsx
{
  id: 'john-doe',
  type: 'entity',
  position: { x: 200, y: 100 },
  data: {
    label: 'John Doe',
    sublabel: 'CEO',
    avatar: 'JD',
    avatarColor: '#4DA3FF',
    badge: 'Active',
    nodeType: 'highlight'
  }
}
```

### Ejemplo 2: Nodo de Empresa con Icono
```tsx
{
  id: 'acme-corp',
  type: 'entity',
  position: { x: 400, y: 200 },
  data: {
    label: 'ACME Corp',
    sublabel: 'Technology',
    icon: <Building2 size={18} />,
    badge: 'Partner',
    nodeType: 'default'
  }
}
```

### Ejemplo 3: Nodo de Alerta con Icono
```tsx
{
  id: 'fraud-alert',
  type: 'entity',
  position: { x: 600, y: 300 },
  data: {
    label: 'Fraud Alert',
    sublabel: 'Detection system',
    icon: <AlertTriangle size={18} />,
    badge: '⚠ Critical',
    badgeType: 'danger',
    nodeType: 'danger'
  }
}
```

---

## 🎨 Estilos de Avatar Automáticos

El color del avatar se adapta según el `nodeType`:

| nodeType | Background | Border | Color |
|----------|-----------|--------|-------|
| `highlight` | `#4DA3FF` 30% | `#4DA3FF` | `#4DA3FF` |
| `risk` | `#F5A623` 30% | `#F5A623` | `#F5A623` |
| `danger` | `#E05252` 30% | `#E05252` | `#E05252` |
| `default` | `#2A3644` 30% | `#2A3644` | `#6B8099` |
| `secondary` | `#2A3644` 30% | `#2A3644` | `#6B8099` |

---

## 📸 Usar Imágenes Reales (Opcional)

Si quieres usar fotos reales en lugar de iniciales:

```tsx
const renderIconOrAvatar = () => {
  if (nodeData.avatarUrl) {
    return (
      <img 
        src={nodeData.avatarUrl} 
        alt={nodeData.label}
        className="w-8 h-8 rounded-md object-cover border border-[#2A3644]"
      />
    );
  }
  // ... resto del código
};
```

Y en los datos:
```tsx
{
  id: 'user-1',
  data: {
    label: 'Jane Smith',
    avatarUrl: 'https://i.pravatar.cc/32?img=1',  // ← URL de imagen
    nodeType: 'highlight'
  }
}
```

---

## 🔄 Actualizar Nodos Existentes

Para actualizar todos los nodos con iconos:

```tsx
const updatedNodes = nodes.map(node => ({
  ...node,
  data: {
    ...node.data,
    icon: <Building2 size={18} />  // ← Agrega icono a todos
  }
}));

setNodes(updatedNodes);
```

---

## ✅ Resumen de Mejoras

1. ✅ **Border radius reducido** de 12px → 6px (más cuadrado)
2. ✅ **Iconos Lucide** integrados (18px)
3. ✅ **Avatares con iniciales** personalizables
4. ✅ **Colores automáticos** según tipo de nodo
5. ✅ **Layout mejorado** con flex gap
6. ✅ **4 handles** para conexiones en todas direcciones
7. ✅ **Z-index correcto** para evitar superposiciones

¡El grafo ahora tiene un aspecto más profesional y visual! 🎨
