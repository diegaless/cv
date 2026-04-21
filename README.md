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

- `index.html`: web estática final.
- `cv-data.json`: datos estructurados extraídos del PDF.
- `cv.pdf`: copia descargable del PDF original.
- `assets/profile.jpg`: foto extraída del PDF o la indicada con `--photo`.

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

Puedes abrir `index.html` directamente con `file://` o levantar un servidor local:

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
