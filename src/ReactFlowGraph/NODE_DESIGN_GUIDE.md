# 🎨 Guía Completa de Diseño de Nodos

## 📋 12 Estilos Disponibles

### **MINIMALISTAS** (ligeros, performance)
1. **Minimal Flat** - Diseño plano simple
2. **Minimal Outline** - Solo bordes, sin fondo

### **TARJETAS** (profesionales, destacadas)
3. **Card Shadow** - Tarjeta con sombra profunda
4. **Card Glass** - Efecto glassmorphism
5. **Card Gradient** - Fondo con gradiente

### **CON BADGES** (alertas, etiquetas)
6. **Badge Top** - Badge flotante superior
7. **Badge Ribbon** - Cinta lateral diagonal

### **TÉCNICOS** (tech, futurista)
8. **Tech Hexagon** - Forma hexagonal
9. **Tech Circuit** - Decoración de circuito

### **AVATARES** (personas, usuarios)
10. **Avatar Circle** - Avatar circular grande
11. **Avatar Square** - Avatar cuadrado
12. **Icon Header** - Icono prominente en header

---

## 🎨 Comparación Visual

| Estilo | Mejor Para | Peso Visual | Performance |
|--------|-----------|-------------|-------------|
| Minimal Flat | Grafos grandes | Bajo | ⚡⚡⚡⚡⚡ |
| Minimal Outline | Diseño limpio | Muy bajo | ⚡⚡⚡⚡⚡ |
| Card Shadow | Nodos importantes | Alto | ⚡⚡⚡ |
| Card Glass | UI moderna | Medio | ⚡⚡⚡⚡ |
| Card Gradient | Destacar categorías | Medio | ⚡⚡⚡⚡ |
| Badge Top | Alertas/estados | Medio | ⚡⚡⚡⚡ |
| Badge Ribbon | Etiquetas destacadas | Medio | ⚡⚡⚡ |
| Tech Hexagon | Apps técnicas | Alto | ⚡⚡ |
| Tech Circuit | Estilo cyberpunk | Alto | ⚡⚡ |
| Avatar Circle | Perfiles de usuario | Medio | ⚡⚡⚡ |
| Avatar Square | Equipos/grupos | Medio | ⚡⚡⚡⚡ |
| Icon Header | Categorías visuales | Medio | ⚡⚡⚡ |

---

## 💡 Recomendaciones de Uso

### **Para Grafos de Análisis Financiero/Riesgo:**
✅ **Card Glass** - Entidades principales (clientes, empresas)  
✅ **Badge Ribbon** - Alertas de riesgo  
✅ **Minimal Flat** - Entidades secundarias  

### **Para Organigramas/Redes Sociales:**
✅ **Avatar Circle** - Personas individuales  
✅ **Icon Header** - Departamentos/grupos  
✅ **Card Shadow** - Líderes/posiciones clave  

### **Para Diagramas Técnicos:**
✅ **Tech Circuit** - Servicios/APIs  
✅ **Tech Hexagon** - Componentes del sistema  
✅ **Minimal Outline** - Conexiones auxiliares  

### **Para Dashboards Ejecutivos:**
✅ **Card Gradient** - KPIs principales  
✅ **Badge Top** - Métricas con estado  
✅ **Card Glass** - Datos agregados  

---

## 🔧 Cómo Implementar

### Paso 1: Define tu componente de nodo personalizado

```tsx
import { Handle, Position } from 'reactflow';

const CustomNode = ({ data, selected }: any) => {
  return (
    <div className="bg-[#1A222C] border border-[#4DA3FF] rounded-md p-3">
      {/* Tu diseño aquí */}
      
      {/* Handles para conexiones */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};
```

### Paso 2: Registra el tipo de nodo

```tsx
const nodeTypes = {
  custom: CustomNode,
};

<ReactFlow
  nodes={nodes}
  nodeTypes={nodeTypes}
  // ...
/>
```

### Paso 3: Usa el tipo en tus datos

```tsx
const nodes = [
  {
    id: '1',
    type: 'custom',  // ← Usa tu nodo personalizado
    position: { x: 100, y: 100 },
    data: {
      name: 'Cliente A',
      role: 'Primary entity',
      badge: 'Risk 72'
    }
  }
];
```

---

## 🎨 Ejemplos de Código por Estilo

### 1️⃣ Minimal Flat
```tsx
<div className="bg-[#1A222C] border border-[#4DA3FF] rounded-md p-3 w-48">
  <div className="flex items-center gap-2.5 mb-2">
    <div className="w-8 h-8 rounded-md bg-[#4DA3FF]/10 flex items-center justify-center">
      <Building2 size={16} className="text-[#4DA3FF]"/>
    </div>
    <div>
      <div className="text-sm font-semibold text-white">Cliente A</div>
      <div className="text-[10px] text-[#6B8099]">Primary entity</div>
    </div>
  </div>
  <div className="text-[9px] px-2 py-0.5 bg-[#F5A623]/10 text-[#F5A623] rounded">
    Risk 72
  </div>
</div>
```

### 2️⃣ Card Glass (Glassmorphism)
```tsx
<div className="bg-[rgba(26,34,44,0.4)] backdrop-blur-xl border border-[#4DA3FF]/30 rounded-xl p-4 w-48 shadow-[0_0_20px_rgba(77,163,255,0.1)]">
  <div className="flex items-center gap-2.5 mb-3">
    <div className="w-9 h-9 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
      <Building2 size={16} className="text-[#4DA3FF]"/>
    </div>
    <div>
      <div className="text-sm font-semibold text-white">Cliente A</div>
      <div className="text-[10px] text-[#94A3B8]">Primary entity</div>
    </div>
  </div>
  <div className="text-[9px] px-2.5 py-1 bg-[#F5A623]/10 backdrop-blur-sm border border-[#F5A623]/20 text-[#F5A623] rounded-lg">
    Risk 72
  </div>
</div>
```

### 3️⃣ Badge Ribbon
```tsx
<div className="bg-[#1A222C] border border-[#2A3644] rounded-lg p-3 w-48 relative overflow-hidden">
  <div className="absolute -right-8 top-3 rotate-45 px-8 py-1 bg-[#F5A623] text-[#0D1219] text-[8px] font-bold shadow-lg">
    RISK
  </div>
  <div className="flex items-center gap-2.5 mb-2">
    <div className="w-8 h-8 rounded-md bg-[#4DA3FF]/10 flex items-center justify-center">
      <Building2 size={16} className="text-[#4DA3FF]"/>
    </div>
    <div>
      <div className="text-sm font-semibold text-white">Cliente A</div>
      <div className="text-[10px] text-[#6B8099]">Primary entity</div>
    </div>
  </div>
</div>
```

### 4️⃣ Avatar Circle
```tsx
<div className="bg-[#1A222C] border border-[#2A3644] rounded-lg p-4 w-48">
  <div className="flex flex-col items-center text-center mb-3">
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4DA3FF] to-[#2563eb] flex items-center justify-center text-white font-bold text-xl mb-2 shadow-[0_0_20px_rgba(77,163,255,0.3)]">
      CA
    </div>
    <div className="text-sm font-bold text-white">Cliente A</div>
    <div className="text-[10px] text-[#6B8099]">Primary entity</div>
  </div>
  <div className="text-center">
    <div className="text-[9px] px-2.5 py-1 bg-[#F5A623]/15 border border-[#F5A623]/30 text-[#F5A623] rounded-md">
      Risk 72
    </div>
  </div>
</div>
```

### 5️⃣ Tech Circuit
```tsx
<div className="bg-[#1A222C] border border-[#4DA3FF] rounded-md p-3 w-48 relative overflow-hidden">
  {/* Circuit decoration */}
  <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 200 100">
    <line x1="0" y1="20" x2="40" y2="20" stroke="#4DA3FF" strokeWidth="1"/>
    <circle cx="40" cy="20" r="2" fill="#4DA3FF"/>
    <line x1="160" y1="80" x2="200" y2="80" stroke="#4DA3FF" strokeWidth="1"/>
    <circle cx="160" cy="80" r="2" fill="#4DA3FF"/>
  </svg>
  
  <div className="relative z-10">
    <div className="flex items-center gap-2.5 mb-2">
      <div className="w-8 h-8 rounded-sm bg-[#4DA3FF]/10 border border-[#4DA3FF]/30 flex items-center justify-center">
        <Building2 size={16} className="text-[#4DA3FF]"/>
      </div>
      <div>
        <div className="text-sm font-semibold text-white font-['JetBrains_Mono']">Cliente A</div>
        <div className="text-[10px] text-[#6B8099] font-['JetBrains_Mono']">Primary entity</div>
      </div>
    </div>
  </div>
</div>
```

---

## 🎨 Personalización Avanzada

### Agregar Estados Hover
```tsx
<div className="... hover:scale-105 hover:shadow-[0_0_24px_rgba(77,163,255,0.4)] transition-all duration-200">
  {/* contenido */}
</div>
```

### Estado Seleccionado
```tsx
const CustomNode = ({ data, selected }: any) => (
  <div className={`... ${
    selected 
      ? 'border-[#FF5A00] shadow-[0_0_20px_rgba(255,90,0,0.5)]' 
      : 'border-[#4DA3FF]'
  }`}>
    {/* contenido */}
  </div>
);
```

### Animación de Entrada
```tsx
<div className="... animate-[fadeInUp_0.4s_ease-out]">
  {/* contenido */}
</div>

{/* Agrega en CSS */}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 🚀 Optimización de Performance

### Para Grafos Grandes (&gt;100 nodos):
1. Usa **Minimal Flat** o **Minimal Outline**
2. Evita `backdrop-blur` en todos los nodos
3. Reduce shadows complejos
4. Usa `will-change: transform` en CSS

### Para Grafos Pequeños (&lt;50 nodos):
- ✅ Usa cualquier estilo sin restricciones
- ✅ Añade animaciones hover
- ✅ Usa glassmorphism, gradientes, etc.

---

## 🎯 Mejores Prácticas

1. **Consistencia**: No mezcles más de 2-3 estilos diferentes
2. **Jerarquía**: Usa estilos más prominentes para nodos importantes
3. **Colores**: Mantén la paleta (azul → activo, amber → riesgo, rojo → peligro)
4. **Tamaño**: Ajusta según la densidad del grafo
5. **Accesibilidad**: Mantén contraste mínimo 4.5:1

---

## 📦 Recursos

- **Iconos**: Lucide React (ya instalado)
- **Fuentes**: Rajdhani (títulos), DM Sans (body), JetBrains Mono (código)
- **Colores**: CSS variables en `theme.css`

¡Explora la galería interactiva para ver todos los estilos en acción! 🎨
