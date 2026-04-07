# ⚡ Creador Pro — Generador Universal de Google Forms

Convierte **cualquier CSV** (con cualquier estructura de columnas y filas) en un **Google Form tipo Quiz** desde Google Sheets, sin necesidad de adaptar tu archivo a un formato fijo.

---

## 📋 Índice

1. [Características](#-características)
2. [Instalación](#-instalación)
3. [Uso rápido](#-uso-rápido)
4. [Mapeo de columnas](#-mapeo-de-columnas)
5. [Tipos de pregunta soportados](#-tipos-de-pregunta-soportados)
6. [Opciones de configuración](#-opciones-de-configuración)
7. [Ejemplos de CSV](#-ejemplos-de-csv)
8. [Previsualización](#-previsualización)
9. [Registro de auditoría (Logs)](#-registro-de-auditoría-logs)
10. [Solución de problemas](#-solución-de-problemas)

---

## ✨ Características

- **Universal**: funciona con cualquier CSV, sin importar nombres ni orden de columnas.
- **Mapeo visual**: el sidebar detecta automáticamente tus encabezados y te permite asignar cada campo con desplegables.
- **Auto-detección**: si tus columnas se llaman "Pregunta", "Opción 1", "Respuesta Correcta", etc., el sistema las asigna automáticamente.
- **5 tipos de pregunta**: Test (radio), Casillas (checkbox), Texto corto, Párrafo largo, Desplegable.
- **Feedback automático**: retroalimentación personalizada para respuestas correctas e incorrectas.
- **Sección de datos del alumno**: nombre y grupo obligatorios antes del examen.
- **Filtro por rango de filas**: genera solo un bloque específico de preguntas.
- **Previsualización**: comprueba cuántas preguntas son válidas antes de generar.
- **Registro de auditoría**: cada ejecución se documenta en una pestaña de Logs.

---

## 🚀 Instalación

### Paso 1: Crear el proyecto en Apps Script

1. Abre una **Hoja de Cálculo de Google** (nueva o existente).
2. Ve a **Extensiones → Apps Script**.
3. Borra el contenido de `Código.gs` y pega el contenido del archivo `codigo.gs`.
4. Crea un nuevo archivo HTML: clic en **+** → **HTML** → nómbralo `sidebar` (sin extensión).
5. Pega el contenido del archivo `sidebar.html`.
6. Guarda todo con **Ctrl+S**.

### Paso 2: Autorizar permisos

1. Recarga la Hoja de Cálculo (F5).
2. Aparecerá el menú **⚙️ Creador Pro** en la barra superior.
3. Haz clic en **🚀 Abrir Panel de Control**.
4. Google te pedirá autorizar permisos la primera vez:
   - Lectura/escritura de hojas de cálculo
   - Creación de formularios
   - Gestión de archivos en Drive
5. Acepta y el sidebar se abrirá.

### Estructura del proyecto

```
📁 Proyecto Apps Script
├── codigo.gs        ← Backend (lectura, validación, generación)
└── sidebar.html     ← Interfaz del panel lateral
```

---

## 🎯 Uso rápido

1. **Importa tu CSV** a Google Sheets (Archivo → Importar o copiar-pegar).
2. Abre el sidebar: **⚙️ Creador Pro → 🚀 Abrir Panel de Control**.
3. En la pestaña **🔗 Mapeo**, asigna las columnas:
   - ¿Cuál tiene las preguntas?
   - ¿Cuáles tienen las opciones?
   - ¿Cuál tiene la respuesta correcta?
4. (Opcional) Configura título, puntos, comportamiento en las otras pestañas.
5. Pulsa **🔍 Previsualizar** para verificar.
6. Pulsa **🚀 Generar Formulario**.
7. Recibirás los enlaces de edición y vista de alumno.

---

## 🔗 Mapeo de columnas

El sistema lee la **fila 1** de tu hoja como encabezados y te permite asignar cada uno a un campo del formulario.

| Campo del sidebar | Descripción | ¿Obligatorio? |
|---|---|---|
| **Columna de Pregunta** | Texto de la pregunta | ✅ Sí |
| **Columnas de Opciones** | Una o más columnas con opciones de respuesta (selección múltiple) | ✅ Para tipos test/casillas/desplegable |
| **Columna de Respuesta Correcta** | Debe coincidir exactamente con una opción | Recomendado |
| **Columna de Tipo** | test, casillas, texto, parrafo, desplegable | Opcional (usa el default) |
| **Columna de Puntos** | Valor numérico | Opcional (usa puntos default) |
| **Columna de Descripción** | Texto de ayuda bajo la pregunta | Opcional |
| **Columna Feedback Correcto** | Mensaje al acertar | Opcional |
| **Columna Feedback Incorrecto** | Mensaje al fallar | Opcional |

### Auto-detección

Si tus columnas contienen estas palabras, se asignan automáticamente:

- `pregunta`, `titulo`, `question`, `enunciado` → Pregunta
- `opción`, `opcion`, `opt` → Opciones
- `respuesta correcta`, `correcta`, `answer` → Respuesta correcta
- `tipo`, `type`, `formato` → Tipo
- `puntos`, `puntuacion`, `points`, `score` → Puntos
- `descripcion`, `description`, `detalle` → Descripción
- `feedback correcto`, `comentario acierto` → Feedback correcto
- `feedback incorrecto`, `comentario fallo` → Feedback incorrecto

---

## 📝 Tipos de pregunta soportados

| Valor en la celda | Tipo generado | Notas |
|---|---|---|
| `test`, `radio`, `opción múltiple` | Opción múltiple (radio) | Una sola respuesta correcta |
| `casillas`, `checkbox`, `checkboxes` | Casillas de verificación | Varias correctas separadas por coma |
| `texto`, `text`, `abierta`, `corta` | Texto corto | Validación exacta si hay respuesta definida |
| `parrafo`, `párrafo`, `paragraph`, `larga` | Párrafo | Corrección manual del profesor |
| `desplegable`, `dropdown`, `lista` | Menú desplegable | Una sola respuesta correcta |

Si no asignas columna de tipo, se usa el **tipo por defecto** configurado en la pestaña Extra (por defecto: `test`).

### Casillas con múltiples respuestas correctas

Separa las respuestas correctas con coma en la celda:

```
HTML, CSS, JavaScript
```

Cada valor debe coincidir exactamente con una de las opciones.

---

## ⚙️ Opciones de configuración

### Pestaña General

| Opción | Descripción | Default |
|---|---|---|
| Título del Cuestionario | Nombre del Google Form | "Cuestionario Generado" |
| Mensaje al Finalizar | Texto que ve el alumno tras enviar | Mensaje genérico |
| Datos del Alumno | Sección con Nombre y Grupo | ✅ Activado |

### Pestaña Ajustes

| Opción | Descripción | Default |
|---|---|---|
| Pregunta por Página | Salto de sección tras cada pregunta | ❌ |
| Barajar Preguntas | Orden aleatorio | ✅ |
| Preguntas Obligatorias | Requiere responder todas | ✅ |
| Limitar a 1 respuesta | Solo un envío por cuenta Google | ❌ |
| Permitir editar | Modificar tras enviar | ❌ |
| Desde fila / Hasta fila | Filtrar qué filas procesar (0 = todas) | 0 |

### Pestaña Extra

| Opción | Descripción | Default |
|---|---|---|
| Puntos por defecto | Valor cuando la celda está vacía | 1 |
| Tipo de pregunta por defecto | Tipo cuando no hay columna de tipo | test |
| Color del Tema | Color visual del formulario | #673AB7 |
| Barra de Progreso | Indicador visual para el alumno | ✅ |

---

## 📄 Ejemplos de CSV

### Ejemplo básico (formato estándar)

```csv
Pregunta,Opción 1,Opción 2,Opción 3,Opción 4,Respuesta Correcta,Puntos
¿Capital de Francia?,Madrid,París,Londres,Berlín,París,1
¿2 + 2?,3,4,5,6,4,1
¿Color del cielo?,Verde,Azul,Rojo,Amarillo,Azul,1
```

### Ejemplo con tipos mixtos

```csv
Pregunta,Opción A,Opción B,Opción C,Correcta,Tipo,Puntos,Feedback OK,Feedback Fail
¿Capital de España?,Madrid,Barcelona,Sevilla,Madrid,test,2,¡Correcto!,La capital es Madrid
Explica la fotosíntesis,,,,,,texto,3,,
Selecciona lenguajes web,HTML,CSS,Java,HTML; CSS,casillas,2,,Java no es un lenguaje web
```

### Ejemplo con formato completamente personalizado

```csv
ID,Enunciado,Resp_A,Resp_B,Resp_C,Resp_D,Solucion,Valor
1,¿Qué es HTTP?,Un lenguaje,Un protocolo,Una base de datos,Un sistema operativo,Un protocolo,2
2,¿Puerto SSH?,21,22,80,443,22,1
3,¿Qué hace DNS?,Enrutar paquetes,Resolver nombres,Cifrar datos,Comprimir archivos,Resolver nombres,1
```

En este caso, en el sidebar mapearías:
- Pregunta → `Enunciado`
- Opciones → `Resp_A`, `Resp_B`, `Resp_C`, `Resp_D`
- Respuesta Correcta → `Solucion`
- Puntos → `Valor`

---

## 🔍 Previsualización

Antes de generar, pulsa **🔍 Previsualizar** en la pestaña de Mapeo para:

- Ver cuántas preguntas son válidas con el mapeo actual.
- Identificar filas con problemas (opciones faltantes, respuesta incorrecta, etc.).
- Corregir antes de gastar tiempo generando.

---

## 📊 Registro de auditoría (Logs)

Cada ejecución crea (o actualiza) una pestaña llamada **"Logs Formularios"** en tu hoja de cálculo con:

| Fecha y Hora | Nivel | Mensaje |
|---|---|---|
| 07/04/2026 10:30:15 | INFO | Formulario "Examen Redes" creado. |
| 07/04/2026 10:30:16 | OK | Fila 2: "¿Qué es una IP?…" [test] |
| 07/04/2026 10:30:16 | WARN | Fila 5: Respuesta "HTTP" no coincide con opciones. |

Accede también desde el menú: **⚙️ Creador Pro → 📋 Ver Registro de Auditoría**.

---

## 🔧 Solución de problemas

### "No se encontró columna de Pregunta"
→ Asigna manualmente la columna en la pestaña **Mapeo**. La auto-detección solo funciona si el encabezado contiene palabras como "pregunta", "titulo" o "question".

### "Tipo X requiere al menos 2 opciones"
→ Selecciona más columnas de opciones en el mapeo, o asegúrate de que las celdas no están vacías.

### "La respuesta correcta no coincide con ninguna opción"
→ El texto debe ser **exactamente igual** (mayúsculas, tildes, espacios). Compara carácter por carácter.

### "No se generó ninguna pregunta"
→ Revisa el log de auditoría. Las causas más comunes son: columna de pregunta vacía, opciones insuficientes, o respuesta correcta mal escrita.

### El formulario se crea en "Mi Unidad" en vez de en la carpeta
→ El script intenta moverlo a la misma carpeta donde está la hoja. Si falla (permisos), lo deja en Mi Unidad. Revisa el log.

### Error de permisos al ejecutar por primera vez
→ Es normal. Google requiere autorización explícita. Acepta los permisos y vuelve a intentar.

---

## 📜 Licencia

Proyecto educativo de [Cibermedida](https://cibermedida.es). Uso libre para fines formativos.
