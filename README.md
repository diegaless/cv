# CV Web Generado Desde PDF

Este proyecto genera una interfaz web estática a partir de un CV en PDF. No usa capturas de las páginas: extrae texto, secciones, fechas, bullets, saltos de página y la foto embebida para renderizar HTML/CSS editable y reutilizable.

## Generar La Web

Requisitos en Linux/WSL:

```bash
sudo apt-get install poppler-utils
python3 -m pip install Pillow
```

Generar la primera versión desde un PDF:

```bash
python3 scripts/generate_cv_site.py /ruta/al/cv.pdf --out .
```

Usar una foto externa en vez de la foto embebida del PDF:

```bash
python3 scripts/generate_cv_site.py /ruta/al/cv.pdf --out . --photo /ruta/foto.jpg
```

El comando crea o actualiza:

- `index.html`: entrada principal con login de Google/Firebase.
- `cv-viewer.html`: visor estático final del CV.
- `builder.html`: formulario web para rellenar datos y generar el CV con el mismo diseño.
- `cv-data.json`: datos estructurados extraídos del PDF.
- `cv.pdf`: copia descargable del PDF original.
- `assets/profile.jpg`: foto extraída del PDF o la indicada con `--photo`.

## Formulario Web Para Alumnos

Abre `builder.html` en el navegador para rellenar el CV sin editar JSON a mano:

```bash
python3 -m http.server 4000
```

Después abre `http://127.0.0.1:4000/builder.html`.

También puede abrirse directamente con `file://`.

Desde el formulario puedes:

- Rellenar nombre, título, teléfono, email y foto.
- Añadir, borrar, subir o bajar entradas en experiencia, formación y premios.
- Escribir bullets, uno por línea.
- Forzar que una entrada empiece en una página nueva.
- Ver la preview en vivo con el estilo del CV original.
- Usar `Imprimir / guardar PDF` para generar el PDF final desde el navegador.
- Descargar `cv-data.json` para reutilizar esos datos más adelante.
- Importar un JSON anterior y seguir editándolo.

El formulario guarda un borrador local en el navegador. Si quieres empezar desde cero, usa `Nuevo / vaciar`.

## Login Con Google Y CVs Guardados

El formulario funciona sin backend en modo local. Para que cada alumno inicie sesión con Google y guarde sus CVs anteriores, usa Firebase Authentication + Cloud Firestore. El despliegue puede seguir en GitHub Pages.

Pasos en Firebase:

1. Abre [Firebase Console](https://console.firebase.google.com/) y crea un proyecto.
2. En `Authentication` activa `Google` como proveedor de acceso.
3. En `Authentication > Settings > Authorized domains` añade tu dominio de GitHub Pages y el dominio final, por ejemplo `diegaless.github.io` y `cvapp.diegoayala.com`. Para pruebas locales añade también `localhost` si no está.
4. En `Firestore Database` crea una base de datos en modo producción.
5. En `Firestore Database > Rules` pega el contenido de `firestore.rules` y publícalo.
6. En `Project settings > General > Your apps` crea una app Web y copia el objeto `firebaseConfig`.
7. Edita `assets/firebase-config.js`, pega tu configuración y cambia `enabled` a `true`.

Ejemplo:

```js
window.CV_FIREBASE_CONFIG = {
  enabled: true,
  firebaseConfig: {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    appId: "TU_APP_ID",
    messagingSenderId: "TU_SENDER_ID"
  }
};
```

Los datos se guardan en:

```text
users/{uid}/cvs/{cvId}
```

Cada usuario solo puede leer y escribir sus propios CVs si publicas las reglas incluidas. La configuración de Firebase del frontend no es secreta; la seguridad depende de las reglas.

Para probar Google Login no uses `file://`. Levanta servidor local:

```bash
python3 -m http.server 4000
```

Después abre `http://127.0.0.1:4000/` para probar la entrada con login o `http://127.0.0.1:4000/builder.html` para abrir el editor directamente.

## Añadir Datos Sin Modificar El PDF

Después de la primera extracción, edita `cv-data.json` y regenera solo la web:

```bash
python3 scripts/generate_cv_site.py --data cv-data.json --out .
```

En este modo el PDF ya no se reprocesa y `cv-data.json` no se sobrescribe, por lo que puedes añadir, corregir o borrar datos directamente en el JSON.

Ejemplo de nueva entrada en `experience`:

```json
{
  "date": "Abr 2026 - Presente",
  "title": "Nuevo puesto, Empresa",
  "meta": null,
  "bullets": [
    "Primer punto del puesto.",
    "Segundo punto del puesto."
  ]
}
```

Las secciones editables son:

- `experience`: experiencia laboral.
- `education`: formación.
- `awards`: reconocimientos, premios e hitos.

La paginación es automática. Si una página se llena, el generador mueve las siguientes entradas a una nueva hoja.

Si quieres forzar que una entrada empiece en una hoja nueva, añade:

```json
"page_break_before": true
```

El generador valida el JSON antes de crear la web. Si falta un campo obligatorio como `date` o `title`, muestra un error indicando la ruta exacta del dato que hay que corregir.

Existe un modo de compatibilidad para respetar campos `page` escritos a mano:

```bash
python3 scripts/generate_cv_site.py --data cv-data.json --out . --manual-pages
```

## Previsualizar

Puedes abrir `cv-viewer.html` directamente con `file://` para ver el CV estático o levantar un servidor local para probar la app completa:

```bash
python3 -m http.server 4000
```

Después abre `http://127.0.0.1:4000/`.

## Formato Esperado

El extractor está orientado a CVs con estructura similar a este PDF:

- Cabecera con `Nombre Apellidos, Título`.
- Teléfono y email en la segunda línea.
- Secciones en mayúsculas como `EXPERIENCIA LABORAL`, `FORMACIÓN` y `RECONOCIMIENTOS, PREMIOS E HITOS`.
- Fechas en la columna izquierda y títulos en la derecha.
- Bullets marcados con `•`.

Para otros alumnos funcionará mejor si usan la misma plantilla o una estructura parecida.
