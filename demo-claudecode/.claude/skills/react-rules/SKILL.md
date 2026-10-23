---
name: react-rules
description: Genera un proyecto con la estructura de React con TypeScript y aplica buenas prácticas. Úsalo cuando el usuario pida crear una aplicación o componente React, o agregar/modificar componentes, hooks, estado, formularios o lógica de UI en React.
---

# react-rules

Buenas prácticas para crear y modificar código React con TypeScript.

## Cuándo activarse

- El usuario pide crear una aplicación o un componente React.
- El usuario pide agregar o modificar componentes, hooks, estado, formularios o lógica de UI en React.

## Versión de React

- Usa la versión de `react` que ya tenga el proyecto (`package.json`).
- Si el proyecto no la define, usa la última disponible: https://www.npmjs.com/package/react
- Antes de usar una API nueva, consulta la documentación de esa versión.

## Reglas

### Lenguaje y estructura
- Usa TypeScript en lugar de JavaScript para mejorar el tipado, la seguridad del código y la mantenibilidad.
- Mantén los componentes pequeños, simples y con una sola responsabilidad.

### Estado
- Usa Zustand para el estado global: crea un store con `create()` donde defines estado y acciones.
- Evita mutar el estado directamente; crea siempre copias nuevas de objetos y arrays.
- Para reiniciar o ajustar estado usa `key`, deriva el estado desde las props o actualízalo en eventos.

### Validación y formularios
- Usa Zod para validar datos con esquemas (`z.object`, `z.string`) y valida con `parse` o `safeParse`.
- En formularios integra Zod con React Hook Form (`@hookform/resolvers/zod`).

### Effects
- Usa `useEffect` solo para sincronizar con sistemas externos (API, DOM, librerías).
- No uses `useEffect` para lógica derivada de props o estado: calcúlala en el render o en handlers.
- Mantén los effects simples y con dependencias claras.
- La lógica causada por interacción del usuario va en event handlers, no en `useEffect`.

### Hooks y reutilización
- Extrae lógica reutilizable en custom hooks (`useAuth`, `useFetch`, etc.) para dejar los componentes más claros.
- Comparte lógica entre eventos con funciones reutilizables o hooks.
- No llames hooks dentro de bucles, condicionales o funciones anidadas.
- Usa `useMemo` para cachear cálculos costosos.

### Comunicación entre componentes
- Para comunicar cambios al padre, usa callbacks por props y ejecútalos desde el componente hijo cuando cambie algo.

### Pureza
- Evita side effects durante el render; los componentes y hooks deben ser puros.

### Datos remotos
- Usa React Query o SWR cuando un componente obtenga datos de una API y deban compartirse o reutilizarse entre varios componentes, con caché y refetch automático.

## Antes de terminar

- Comprueba tipos y lint (`npm run build`, `npm run lint`).
- Si añades una dependencia nueva (Zustand, Zod, React Hook Form, React Query, SWR), indícalo al usuario.
