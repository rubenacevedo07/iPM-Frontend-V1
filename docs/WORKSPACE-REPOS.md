# Mapa de repositorios iPM_GV (Frontend)

**Carga al inicio de sesión (Cursor, Claude Code, o cualquier agente).** Evita tocar el `main` de producción desde el clon equivocado o mezclar el propósito de cada carpeta.

---

## Rutas fijas (Windows)

| Rol | Ruta | Uso |
|-----|------|-----|
| **MAIN (producción / referencia estable)** | `C:\Users\ruben\source\repos\iPM_GV\IPM_Frontend_V1` | Código alineado con la línea `main`/`master` del producto. **Mantener libre de errores:** `npm run build` verde antes de considerar cierre. Integración seria y lo que se despliega o se etiqueta. |
| **Claude Code (sandbox creativo y API)** | `C:\Users\ruben\source\repos\iPM_GV\IPM_Frontend_V2` | Probar **diseño**, **cinemática**, validaciones con **el backend** (APIs, proxy, DTOs en servicios). Ramas y experimentos. No exige el mismo rigor que V1, pero el objetivo final es **volver a portar a V1** (o a V3) lo que se apruebe. |
| **Cursor (features avanzadas)** | `C:\Users\ruben\source\repos\iPM_GV\IPM_Frontend_V3` | Implementación de **funcionalidad avanzada** en clon con `main` canónica local (repo sembrado desde V1). Trabajo en **ramas**; merge a `main` de V3 cuando pase criterio de calidad, luego **sincronizar o PR hacia** el remoto/MAIN según el flujo del equipo. |

---

## Objetivo operativo

- **Diseñar y desarrollar** el frontend en **diferentes ramas** (y en V2 / V3 sin ensuciar el tronco de V1).
- **Mantener el MAIN (V1) siempre libre de errores** en el `main` desplegado/aceptado: no fusionar a `main` de producción sin build verde, revisión y criterio explícito.
- V2 = laboratorio; V3 = motor de evolución con `main` local estable; V1 = verdad de producción **cuando** el equipo haya decidido subir/mergear.

---

## Comportamiento esperado (agentes e IA)

1. **Preguntar o inferir** en qué ruta del disco está el workspace **antes** de asumir que “este repo” es el MAIN.
2. Si el usuario trabaja en **V2** o **V3**, respetar que los cambios **no actualizan V1** hasta que haya copia, cherry-pick, PR o `robocopy` + revisión.
3. **Nunca** sugerir “commitea directo a main de V1” desde un clon de experimento sin dejar claro el flujo (PR, rebase, etc.).
4. Tras probar en V2/V3, el **cierre** sano es: resumen, diff claro, y ruta hacia V1 o `git push` al remoto acordado.

---

## Sincronización (referencia, no automática)

- **V1 → V2 / V3 (sembrar):** `robocopy` excl. `.git`, `node_modules`, `dist` (o `git` según el caso).
- **V2 o V3 → V1 (subir a producción):** branch + PR, o parches manuales revisados; no mezclar historiales sin criterio.

---

## Dónde vive este archivo

Copia de referencia: **`docs/WORKSPACE-REPOS.md`**. Debe existir (o **copiarse** sin cambios) en V1, V2 y V3 para que abrir **cualquier** carpeta tenga el mismo mapa. Si en el futuro un solo repositorio remoto reemplaza los tres, actualizar **solo** este documento y el remoto al que apunta cada clon.

## Automatización (después de editar aquí, en V1)

1. En la raíz de **V1** ejecutar: `npm run workspace:sync-doc` (copia el Markdown a V2 y V3).
2. En **V2** y **V3** (si usáis esos Git aparte): `git add docs/WORKSPACE-REPOS.md` y commit, luego `git push` al remoto **privado**.

El canónico es **V1**; el script evita desalinear texto entre carpetas. Si cambias nombres de ruta, edita el script `scripts/sync-workspace-repos.ps1` o las rutas internas bajo `C:\Users\...\iPM_GV\`.
