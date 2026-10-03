import {openRepository, CvRepository, loadFirebase, signIn, signOut, friendlyError} from "./cv-store.js?v=20260927-account";
import {normalizeData as normalizeCvData, normalizeState, normalizeOrder, SECTION_ORDER, SECTION_TITLES, progress, resumeText as plainText, fileName, downloadBlob} from "./cv-model.js";
import {renderPreview, preparePrint} from "./cv-preview.js";
import {askDialog} from "./cv-dialog.js?v=20260927-account";
import {mountDesignGallery} from "./cv-design-gallery.js?v=20261003-legal";

async function main() {
  const SECTION_DEFINITIONS = [["experience", "EXPERIENCIA PROFESIONAL", "Experiencia profesional"], ["education", "FORMACIÓN", "Formación"], ["awards", "PREMIOS Y CERTIFICACIONES", "Premios y certificaciones"]];
  const SECTION_KEYS = SECTION_DEFINITIONS.map(([key]) => key);
  const DEFAULT_FORM_SECTION_ORDER = SECTION_ORDER;
  const OPEN_ALL_CHEVRON_PATH = "M10.243 10.414l2.828-2.828L14.485 9l-4.242 4.243L6 9l1.414-1.414 2.829 2.828z";
  const form = document.getElementById("cv-form");
  const preview = document.getElementById("cv-preview-pages");
  const pageCountLabel = document.getElementById("page-count-label");
  const previewCurrentPage = document.getElementById("preview-current-page");
  const previewTotalPages = document.getElementById("preview-total-pages");
  const cloudStatus = document.getElementById("cloud-status");
  const loginGoogle = document.getElementById("login-google");
  const logoutGoogle = document.getElementById("logout-google");
  const saveCloud = document.getElementById("save-cloud");
  const cvScore = document.getElementById("cv-score");
  const cvScoreBar = document.getElementById("cv-score-bar");
  const scoreList = document.getElementById("score-list");
  const accountMenuButton = document.getElementById("account-menu-button");
  const accountPopover = document.getElementById("account-popover");
  const downloadButton = document.getElementById("print-cv");
  const downloadMenu = document.getElementById("download-menu");
  const titleInput = document.getElementById("resume-title");
  const errorEl = document.getElementById("editor-error");
  const repository = await openRepository();
  if (!repository) return;
  const requestedId = new URLSearchParams(location.search).get("resumeId");
  let record = requestedId ? await repository.get(requestedId) : await repository.create();
  if (!record) throw new Error("Este CV no está disponible. Vuelve a Mis CVs para abrirlo o crear uno nuevo.");
  if (!requestedId) history.replaceState(null, "", repository.url("builder.html", record.id) + location.hash);
  let state = normalizeState(record.state);
  const draft = repository.readDraft(record.id);
  let recoveryPending = Boolean(draft);
  let ready = false;
  let revision = 0;
  let savedRevision = 0;
  let saveTimer;
  let saving = null;
  const expandedSections = new Set(["personal", ...SECTION_ORDER]);
  const expandedItems = new Set();
  let draggedItem = null;
  let pointerDrag = null;
  let sectionDrag = null;
  let activeEntryMenu = null;
  let suppressNextClick = false;
  let toastTimer = null;
  const SECTION_UI = {
    experience: {
      title: "Experiencia Profesional",
      description: "Indica tu experiencia más relevante (los últimos 10 años). Utiliza viñetas para destacar tus logros y, si es posible, utiliza números/hechos (conseguí X, según Y, haciendo Z).",
      add: "Añade un empleo",
      emptyTitle: "Añade tu experiencia laboral",
      emptyText: "Incluye empresa, puesto, fechas y 2-3 logros medibles.",
    },
    education: {
      title: "Formación",
      description: "Si procede, incluye aquí tus logros académicos más recientes y las fechas",
      add: "Añade una formación",
      emptyTitle: "Añade tu formación",
      emptyText: "Incluye titulaciones, centros, fechas y notas si aportan valor.",
    },
    awards: {
      title: "Premios y certificaciones",
      description: "",
      add: "Añade un elemento",
      emptyTitle: "Añade premios o hitos",
      emptyText: "Incluye reconocimientos, certificaciones, idiomas o logros relevantes.",
    },
  };

  function setCloudStatus(message, status = "saved") {
    cloudStatus.textContent = message;
    cloudStatus.dataset.status = status;
  }
  function showError(error) {
    console.error(error);
    errorEl.textContent = friendlyError(error);
    errorEl.hidden = false;
    if (revision !== savedRevision) setCloudStatus("Cambios pendientes", "error");
  }
  function showToast(message) {
    let toast = document.getElementById("builder-toast");
    if (!toast) {toast = document.createElement("div"); toast.id = "builder-toast"; toast.className = "builder-toast"; toast.setAttribute("role", "status"); document.body.append(toast);}
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }
  function normalizeFormSectionOrder(order) {return normalizeOrder(order);}
  function persist() {
    if (!ready || recoveryPending || repository.accountDeletionPending) return;
    revision++;
    try {repository.saveDraft({...record, state});} catch (error) {showError(new Error("No queda espacio para el borrador. Descarga una copia de tu CV antes de salir."));}
    setCloudStatus(navigator.onLine || repository.isGuest ? "Guardando…" : "Sin conexión · borrador local", "pending");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCurrent, repository.isGuest ? 150 : 800);
  }
  async function saveCurrent() {
    if (recoveryPending || repository.accountDeletionPending) return false;
    if (saving) return saving;
    if (savedRevision === revision) return true;
    clearTimeout(saveTimer);
    saveCloud.disabled = true;
    saving = (async () => {
      try {
        while (savedRevision < revision) {
          const savingRevision = revision;
          const saved = await repository.save(structuredClone({...record, state}));
          record.updatedAt = saved.updatedAt;
          record.createdAt = saved.createdAt;
          savedRevision = savingRevision;
          if (savedRevision === revision) repository.clearDraft(record.id);
        }
        errorEl.hidden = true;
        setCloudStatus(repository.isGuest ? "Guardado en esta pestaña" : "Guardado en tu cuenta");
        return true;
      } catch (error) {showError(error); return false;}
      finally {saving = null; saveCloud.disabled = false;}
    })();
    return saving;
  }

  function compactSpaces(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function splitPersonName(value) {
    const parts = compactSpaces(value).split(" ").filter(Boolean);
    if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }

  function joinPersonName(firstName, lastName) {
    return compactSpaces(`${firstName || ""} ${lastName || ""}`);
  }

  function normalizeData(data) {return normalizeCvData(data);}
  function cleanDataForDownload(data) {return normalizeData(data);}

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    return String(value || "").replace(/\s+-\s+/g, " — ");
  }

  function renderForm() {
    const person = state.data.firstName || state.data.lastName ? state.data : splitPersonName(state.data.name);
    form.innerHTML = `
      <section class="form-card editor-section-card" id="section-personal" data-section-panel="personal">
        <button class="card-title-row section-toggle" type="button" data-action="toggle-section" data-panel="personal" aria-expanded="${expandedSections.has("personal")}">
          <div>
            <h2>Datos personales</h2>
            <span class="edit-mark" aria-hidden="true"></span>
          </div>
          <span class="card-title-meta">
            <span class="chevron">⌄</span>
          </span>
        </button>
        <div class="section-content" ${expandedSections.has("personal") ? "" : "hidden"}>
          <div class="field-grid">
            ${renderField("Puesto laboral", "title", state.data.title, "text", "p. ej., desarrollador/a web")}
            <div class="field photo-field">
              <label for="photo-input">Foto opcional</label>
              <div class="photo-row">
                ${state.photoSrc
                  ? `<img class="photo-preview" id="photo-preview" src="${esc(state.photoSrc)}" alt="" />`
                  : `<span class="photo-placeholder" aria-hidden="true">◌</span>`}
                <div class="photo-controls">
                  <label class="item-btn file-btn" for="photo-input">Subir foto</label>
                  <input class="visually-hidden" type="file" id="photo-input" accept="image/*" />
                  <button class="item-btn" type="button" data-action="clear-photo">Quitar foto</button>
                </div>
              </div>
            </div>
            ${renderField("Nombre", "firstName", person.firstName, "text", "Nombre")}
            ${renderField("Apellidos", "lastName", person.lastName, "text", "Apellidos")}
            ${renderField("Email", "email", state.data.email, "email", "correo@ejemplo.com")}
            ${renderField("Teléfono", "phone", state.data.phone, "text", "+34 600 000 000")}
            ${renderField("LinkedIn URL", "linkedin", state.data.linkedin, "text", "linkedin.com/in/tu-perfil")}
            ${renderField("Código postal", "postalCode", state.data.postalCode)}
            ${renderField("Ciudad", "city", state.data.city)}
            ${renderField("País", "country", state.data.country, "text", "", "", "")}
          </div>
        </div>
      </section>
      ${state.formSectionOrder.map(renderSortableSectionPanel).join("")}
    `;
    updateSectionNav();
  }

  function renderSortableSectionPanel(panel) {
    const definition = SECTION_DEFINITIONS.find(([section]) => section === panel);
    if (definition) return renderSectionForm(definition[0], definition[2]);
    const value = panel === "summary" ? state.data.summary : (state.data[panel] || []).join("\n");
    const hint = panel === "summary" ? "Resume tu experiencia y lo que puedes aportar." : "Escribe un elemento por línea.";
    const expanded = expandedSections.has(panel);
    return `<section class="form-card editor-section-card" data-section-panel="${panel}" data-sortable-section data-panel="${panel}">
      ${renderSectionDragHandle(panel)}
      <button class="section-head section-toggle" type="button" data-action="toggle-section" data-panel="${panel}" aria-expanded="${expanded}"><h2>${SECTION_TITLES[panel]}</h2><span class="chevron">⌄</span></button>
      <div class="section-content" ${expanded ? "" : "hidden"}><div class="field full"><label for="field-${panel}">${SECTION_TITLES[panel]}</label><p class="field-help">${hint}</p><textarea id="field-${panel}" data-field="${panel}" rows="${panel === "summary" ? 5 : 3}" placeholder="${panel === "summary" ? "Tu perfil profesional" : panel === "skills" ? "JavaScript\nTrabajo en equipo" : panel === "languages" ? "Español · nativo\nInglés · B2" : "https://tu-portfolio.com"}">${esc(value)}</textarea></div></div>
    </section>`;
  }

  function renderField(label, field, value, type = "text", placeholder = "", className = "", hint = "") {
    return `
      <div class="field ${esc(className)}">
        <label for="field-${field}">${esc(label)}</label>
        <input id="field-${field}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" data-field="${esc(field)}" />
        ${hint ? `<span class="field-hint">${esc(hint)}</span>` : ""}
      </div>
    `;
  }

  function splitTitleParts(value) {
    const title = String(value || "").trim();
    const commaIndex = title.lastIndexOf(",");
    if (commaIndex === -1) return { prefix: title, suffix: "" };
    return {
      prefix: title.slice(0, commaIndex).trim(),
      suffix: title.slice(commaIndex + 1).trim(),
    };
  }

  function splitDateRange(value) {
    const [start = "", ...rest] = String(value || "").split(/\s+[—-]\s+/);
    return {
      start: compactSpaces(start),
      end: compactSpaces(rest.join(" - ")),
    };
  }

  function formatDateInputValue(value) {
    return compactSpaces(value).replace(/^([A-Za-zÁÉÍÓÚáéíóúÑñüÜ]+)\s+(\d{4})$/u, "$1, $2");
  }

  function normalizeDateInputValue(value) {
    return compactSpaces(value).replace(/^([A-Za-zÁÉÍÓÚáéíóúÑñüÜ]+),\s*(\d{4})$/u, "$1 $2");
  }

  function joinTitleParts(prefix, suffix) {
    const cleanPrefix = String(prefix || "").trim();
    const cleanSuffix = String(suffix || "").trim();
    return cleanSuffix ? `${cleanPrefix}, ${cleanSuffix}` : cleanPrefix;
  }

  function joinDateRange(start, end) {
    const cleanStart = compactSpaces(start);
    const cleanEnd = compactSpaces(end);
    return cleanEnd ? `${cleanStart} - ${cleanEnd}` : cleanStart;
  }

  function itemTitleForForm(section, title) {
    if (section === "awards") return compactSpaces(title);
    const parts = splitTitleParts(title);
    if (!parts.suffix) return parts.prefix;
    return `${parts.prefix} en ${parts.suffix}`;
  }

  function sectionFieldCopy(section) {
    if (section === "experience") {
      return {
        entityLabel: "Empleador",
        titleLabel: "Puesto laboral",
        metaLabel: "Ciudad",
        descriptionPlaceholder: "p. e. logros, responsabilidades y resultados medibles",
      };
    }
    if (section === "awards") {
      return {
        titleLabel: "Nombre de la actividad, cargo, título del libro, etc.",
        metaLabel: "Ciudad",
        descriptionPlaceholder: "Describe aquí el reconocimiento, premio o hito.",
      };
    }
    return {
      entityLabel: "Entidad",
      titleLabel: "Título",
      metaLabel: "Ciudad",
      descriptionPlaceholder: "por ejemplo, graduado/a con matrícula de honor",
    };
  }

  function renderDragHandle(section, index) {
    return `<button class="entry-drag-handle" type="button" data-drag-handle data-section="${esc(section)}" data-index="${index}" title="Haz clic y arrastra para mover" aria-label="Haz clic y arrastra para mover"></button>`;
  }

  function renderSectionDragHandle(panel) {
    return `<button class="section-drag-handle" type="button" data-section-drag-handle data-panel="${esc(panel)}" title="Haz clic y arrastra para mover" aria-label="Haz clic y arrastra para mover"></button>`;
  }

  function renderDateInputs(prefix, section, index, dates) {
    return `
      <div class="field date-range-field">
        <label for="${prefix}-date-start">Fecha de inicio y de fin <span class="help-dot" aria-hidden="true">?</span></label>
        <div class="date-range-inputs">
          <input id="${prefix}-date-start" value="${esc(formatDateInputValue(dates.start))}" placeholder="MM / AAAA" data-section="${esc(section)}" data-index="${index}" data-item-field="date_start" />
          <input aria-label="Fecha de fin" id="${prefix}-date-end" value="${esc(formatDateInputValue(dates.end))}" placeholder="MM / AAAA" data-section="${esc(section)}" data-index="${index}" data-item-field="date_end" />
        </div>
      </div>
    `;
  }

  function renderDescriptionInput(prefix, section, index, bullets) {
    return `
      <div class="field full rich-field">
        <label for="${prefix}-bullets">Descripción</label>
        <div class="rich-input-shell">
          <textarea id="${prefix}-bullets" placeholder="${esc(sectionFieldCopy(section).descriptionPlaceholder)}" data-section="${esc(section)}" data-index="${index}" data-item-field="bullets">${esc(bullets.join("\n"))}</textarea>
        </div>
      </div>
    `;
  }

  function renderEntryLinks(prefix, section, index, item) {
    const attrs = `data-section="${esc(section)}" data-index="${index}"`;
    return `<div class="field full"><strong>Enlaces del texto</strong>${(item.links || []).map((link,i) => `
      <div class="field-grid" style="margin-top:12px">
        <div class="field"><label for="${prefix}-link-${i}-label">Texto que enlazar</label><input id="${prefix}-link-${i}-label" value="${esc(link.label)}" ${attrs} data-item-field="link_label" data-link-index="${i}" /></div>
        <div class="field"><label for="${prefix}-link-${i}-url">Dirección del enlace</label><input id="${prefix}-link-${i}-url" type="url" value="${esc(link.url)}" ${attrs} data-item-field="link_url" data-link-index="${i}" placeholder="https://…" /></div>
        <div class="field"><label for="${prefix}-link-${i}-target">Dónde aparece</label><select id="${prefix}-link-${i}-target" ${attrs} data-item-field="link_target" data-link-index="${i}"><option value="text" ${link.target === "text" ? "selected" : ""}>Párrafo</option>${item.bullets.map((_,j) => `<option value="bullet:${j}" ${link.target === `bullet:${j}` ? "selected" : ""}>Viñeta ${j+1}</option>`).join("")}</select></div>
        <button class="item-btn danger" type="button" data-action="remove-link" ${attrs} data-link-index="${i}">Quitar enlace</button>
      </div>`).join("")}<button class="item-btn" type="button" data-action="add-link" ${attrs}>Añadir enlace</button></div>`;
  }

  function renderSectionForm(section, label) {
    const items = state.data[section] || [];
    const isExpanded = expandedSections.has(section);
    const isAllExpanded = items.length > 0 && items.every((_, index) => expandedItems.has(`${section}:${index}`));
    const copy = SECTION_UI[section] || {
      title: label,
      description: "",
      add: `Añadir ${label.toLowerCase()}`,
      emptyTitle: "Añade una entrada",
      emptyText: "Completa esta sección cuando tenga sentido para tu CV.",
    };
    return `
      <section class="form-card editor-section-card" id="section-${esc(section)}" data-section-card="${esc(section)}" data-sortable-section data-panel="${esc(section)}">
        ${renderSectionDragHandle(section)}
        <button class="section-head section-toggle" type="button" data-action="toggle-section" data-panel="${esc(section)}" aria-expanded="${isExpanded}">
          <div>
            <h2>${esc(copy.title)}${section === "awards" ? "" : ' <span class="edit-mark" aria-hidden="true">✎</span>'}</h2>
            ${copy.description ? `<p class="section-note">${esc(copy.description)}</p>` : ""}
          </div>
          <span class="card-title-meta">
            <span class="chevron">⌄</span>
          </span>
        </button>
        <div class="section-content" ${isExpanded ? "" : "hidden"}>
          ${items.length ? `<button class="open-all-pill" type="button" data-action="toggle-all-items" data-section="${esc(section)}">${isAllExpanded ? "Cerrar todas las entradas" : "Abrir todas las entradas"}${renderOpenAllChevron(isAllExpanded)}</button>` : ""}
          ${items.length ? items.map((item, index) => renderItemForm(section, item, index)).join("") : renderEmptySection(section)}
          <button class="add-wide-btn" type="button" data-action="add-item" data-section="${esc(section)}">+ ${esc(copy.add)}</button>
        </div>
      </section>
    `;
  }

  function renderEmptySection(section) {
    const copy = SECTION_UI[section] || {
      emptyTitle: "Añade una entrada",
      emptyText: "Completa esta sección cuando tenga sentido para tu CV.",
    };

    return `
      <div class="empty-section">
        <strong>${esc(copy.emptyTitle)}</strong>
        <p>${esc(copy.emptyText)}</p>
        <button class="add-section-btn" type="button" data-action="add-item" data-section="${esc(section)}">Crear primera entrada</button>
      </div>
    `;
  }

  function renderOpenAllChevron(isExpanded) {
    return `<svg width="20" height="20" viewBox="0 0 20 20" class="open-all-chevron${isExpanded ? " is-up" : ""}" aria-hidden="true"><path d="${OPEN_ALL_CHEVRON_PATH}"></path></svg>`;
  }

  function renderItemForm(section, item, index) {
    const prefix = `${section}-${index}`;
    const itemKey = `${section}:${index}`;
    const isExpanded = expandedItems.has(itemKey);
    const isMenuOpen = activeEntryMenu === itemKey;
    const title = itemTitleForForm(section, item.title) || "Nueva entrada";
    const date = item.date || "Sin fecha";
    if (!isExpanded) {
      return `
        <article class="entry-card is-compact${isMenuOpen ? " is-menu-open" : ""}" data-draggable-item data-section="${esc(section)}" data-index="${index}">
          ${renderDragHandle(section, index)}
          <button class="entry-menu-button" type="button" data-action="toggle-entry-menu" data-section="${esc(section)}" data-index="${index}" aria-haspopup="menu" aria-expanded="${isMenuOpen}" aria-label="Más opciones"></button>
          <button class="entry-summary" type="button" data-action="toggle-item" data-section="${esc(section)}" data-index="${index}">
            <span>
              <span class="entry-title">${esc(title)}</span>
              <span class="entry-date">${esc(date)}</span>
            </span>
            <span class="entry-expand-control">
              <span class="entry-expand-label">Ampliar</span>
              <span class="entry-chevron" aria-hidden="true">⌄</span>
            </span>
          </button>
          ${isMenuOpen ? renderEntryMenu(section, index) : ""}
          <button class="entry-delete-button" type="button" data-action="remove-item" data-section="${esc(section)}" data-index="${index}" aria-label="Eliminar"></button>
        </article>
      `;
    }

    const parts = splitTitleParts(item.title);
    const dates = splitDateRange(item.date);
    const fieldCopy = sectionFieldCopy(section);
    const titleAndEntityFields = section === "experience"
      ? `
              <div class="field">
                <label for="${prefix}-prefix">${esc(fieldCopy.titleLabel)}</label>
                <input id="${prefix}-prefix" value="${esc(parts.prefix)}" data-section="${esc(section)}" data-index="${index}" data-item-field="title_prefix" />
              </div>
              <div class="field">
                <label for="${prefix}-suffix">${esc(fieldCopy.entityLabel)}</label>
                <input id="${prefix}-suffix" value="${esc(parts.suffix)}" data-section="${esc(section)}" data-index="${index}" data-item-field="title_suffix" />
              </div>
            `
      : `
              <div class="field">
                <label for="${prefix}-suffix">${esc(fieldCopy.entityLabel)}</label>
                <input id="${prefix}-suffix" value="${esc(parts.suffix)}" data-section="${esc(section)}" data-index="${index}" data-item-field="title_suffix" />
              </div>
              <div class="field">
                <label for="${prefix}-prefix">${esc(fieldCopy.titleLabel)}</label>
                <input id="${prefix}-prefix" value="${esc(parts.prefix)}" data-section="${esc(section)}" data-index="${index}" data-item-field="title_prefix" />
              </div>
            `;
    return `
      <article class="entry-card is-expanded" data-draggable-item data-section="${esc(section)}" data-index="${index}">
        ${renderDragHandle(section, index)}
        <div class="entry-header">
          <button class="entry-summary" type="button" data-action="toggle-item" data-section="${esc(section)}" data-index="${index}">
            <span>
              <span class="entry-title">${esc(title)}</span>
              <span class="entry-date">${esc(date)}</span>
            </span>
            <span class="entry-chevron" aria-hidden="true">⌃</span>
          </button>
        </div>
        <div class="entry-edit-panel">
          <div class="field-grid entry-fields">
            ${section === "awards" ? `
              <div class="field">
                <label for="${prefix}-title">${esc(fieldCopy.titleLabel)}</label>
                <input id="${prefix}-title" value="${esc(item.title)}" data-section="${esc(section)}" data-index="${index}" data-item-field="title" />
              </div>
              <div class="field">
                <label for="${prefix}-meta">${esc(fieldCopy.metaLabel)}</label>
                <input id="${prefix}-meta" value="${esc(item.meta || "")}" data-section="${esc(section)}" data-index="${index}" data-item-field="meta" />
              </div>
            ` : `
              ${titleAndEntityFields}
            `}
            ${renderDateInputs(prefix, section, index, dates)}
            ${section === "awards" ? "" : `
              <div class="field">
                <label for="${prefix}-meta">${esc(fieldCopy.metaLabel)}</label>
                <input id="${prefix}-meta" value="${esc(item.meta || "")}" data-section="${esc(section)}" data-index="${index}" data-item-field="meta" />
              </div>
            `}
            <div class="field full"><label for="${prefix}-text">Párrafo sin viñetas (opcional)</label><textarea id="${prefix}-text" rows="3" data-section="${esc(section)}" data-index="${index}" data-item-field="text">${esc(item.text || "")}</textarea></div>
            ${renderDescriptionInput(prefix, section, index, item.bullets)}
            ${renderEntryLinks(prefix, section, index, item)}
            <div class="field full"><label for="${prefix}-space-after">Espacio adicional debajo (pt)</label><input id="${prefix}-space-after" type="number" min="0" max="36" step="0.125" value="${item.spaceAfter || 0}" data-section="${esc(section)}" data-index="${index}" data-item-field="spaceAfter" /></div>
          <label class="check-field full">
            <input type="checkbox" ${item.page_break_before ? "checked" : ""} data-section="${esc(section)}" data-index="${index}" data-item-field="page_break_before" />
            Empezar esta entrada en una página nueva
          </label>
          </div>
        </div>
        <div class="entry-actions">
          <button class="item-btn" type="button" data-action="move-item" data-direction="up" data-section="${esc(section)}" data-index="${index}">Subir</button>
          <button class="item-btn" type="button" data-action="move-item" data-direction="down" data-section="${esc(section)}" data-index="${index}">Bajar</button>
          <button class="item-btn danger" type="button" data-action="remove-item" data-section="${esc(section)}" data-index="${index}">Eliminar</button>
        </div>
      </article>
    `;
  }

  function renderEntryMenu(section, index) {
    const items = state.data[section] || [];
    return `
      <div class="entry-more-menu" role="menu" data-entry-menu>
        <button type="button" role="menuitem" data-action="duplicate-item" data-section="${esc(section)}" data-index="${index}">Duplicar</button>
        <button type="button" role="menuitem" data-action="move-item" data-direction="up" data-section="${esc(section)}" data-index="${index}" ${index <= 0 ? "disabled" : ""}>Mover arriba</button>
        <button type="button" role="menuitem" data-action="move-item" data-direction="down" data-section="${esc(section)}" data-index="${index}" ${index >= items.length - 1 ? "disabled" : ""}>Mover abajo</button>
        <button class="danger" type="button" role="menuitem" data-action="remove-item" data-section="${esc(section)}" data-index="${index}">Eliminar</button>
      </div>
    `;
  }

  function updateFromControl(control) {
    const field = control.dataset.field;
    if (field) {
      if (field === "firstName" || field === "lastName") {
        state.data.firstName = document.getElementById("field-firstName").value;
        state.data.lastName = document.getElementById("field-lastName").value;
        state.data.name = joinPersonName(state.data.firstName, state.data.lastName);
        return;
      }
      state.data[field] = ["skills", "languages", "websites"].includes(field)
        ? control.value.split(/\r?\n/).map(compactSpaces).filter(Boolean)
        : field === "summary" ? control.value : compactSpaces(control.value);
      return;
    }

    const section = control.dataset.section;
    const index = Number(control.dataset.index);
    const itemField = control.dataset.itemField;
    if (!section || Number.isNaN(index) || !itemField) return;

    const item = state.data[section][index];
    if (!item) return;

    if (itemField.startsWith("link_")) {
      const link = item.links?.[Number(control.dataset.linkIndex)];
      if (link) link[itemField.slice(5)] = control.value;
    } else if (itemField === "text") {
      item.text = control.value;
    } else if (itemField === "bullets") {
      item.bullets = control.value.split(/\n+/).map(compactSpaces).filter(Boolean);
    } else if (itemField === "page_break_before") {
      item.page_break_before = control.checked;
    } else if (itemField === "title_prefix" || itemField === "title_suffix") {
      const parts = splitTitleParts(item.title);
      if (itemField === "title_prefix") parts.prefix = control.value;
      if (itemField === "title_suffix") parts.suffix = control.value;
      item.title = joinTitleParts(parts.prefix, parts.suffix);
    } else if (itemField === "date_start" || itemField === "date_end") {
      const range = splitDateRange(item.date);
      if (itemField === "date_start") range.start = normalizeDateInputValue(control.value);
      if (itemField === "date_end") range.end = normalizeDateInputValue(control.value);
      item.date = joinDateRange(range.start, range.end);
    } else if (itemField === "meta" || itemField === "title") {
      item[itemField] = control.value;
    } else {
      item[itemField] = compactSpaces(control.value);
    }
  }

  function updatePreview(save = true) {
    const count = renderPreview(preview, state);
    pageCountLabel.textContent = `${count} ${count === 1 ? "página" : "páginas"}`;
    previewCurrentPage.textContent = "1";
    previewTotalPages.textContent = String(count);
    updateSectionNav();
    updateScoreCard();
    if (save) persist();
  }

  document.querySelector(".preview-scroll").addEventListener("scroll", event => {
    const top = event.currentTarget.getBoundingClientRect().top + event.currentTarget.clientHeight / 2;
    const pages = [...preview.querySelectorAll(".cv-page")];
    const index = pages.findIndex(page => page.getBoundingClientRect().bottom > top);
    previewCurrentPage.textContent = String(index < 0 ? pages.length : index + 1);
  }, {passive:true});

  function updateSectionNav() {
    SECTION_KEYS.forEach((section) => {
      const label = document.getElementById(`nav-count-${section}`);
      if (!label) return;
      const count = state.data[section]?.length || 0;
      label.textContent = `${count} ${count === 1 ? "entrada" : "entradas"}`;
    });
  }

  function updateScoreCard() {
    const {checks, percent} = progress(state.data);
    cvScore.textContent = String(percent);
    cvScoreBar.style.width = `${percent}%`;
    scoreList.innerHTML = checks.map(([done, label]) => `<li class="${done ? "is-done" : ""}"><span>${done ? "✓" : "○"}</span>${esc(label)}</li>`).join("");
  }

  function addItem(section) {
    const nextIndex = state.data[section].length;
    const defaults = {
      experience: {date:"", title:"", bullets:[]},
      education: {date:"", title:"", bullets:[]},
      awards: {date:"", title:"", bullets:[]},
    };
    const template = defaults[section] || defaults.experience;
    state.data[section].push({
      date: template.date,
      title: template.title,
      meta: null,
      bullets: template.bullets,
      page_break_before: false,
    });
    expandedItems.add(`${section}:${nextIndex}`);
  }

  function duplicateItem(section, index) {
    const items = state.data[section];
    if (!items || index < 0 || index >= items.length) return false;
    const source = items[index] || {};
    const duplicate = JSON.parse(JSON.stringify(source));
    items.splice(index + 1, 0, duplicate);
    return true;
  }

  function moveItem(section, index, direction) {
    const items = state.data[section];
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
  }

  function moveItemTo(section, fromIndex, toIndex) {
    const items = state.data[section];
    if (!items || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return false;
    const [item] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, item);
    return true;
  }

  function moveItemToInsertion(section, fromIndex, insertionIndex) {
    const items = state.data[section];
    if (!items || fromIndex < 0 || fromIndex >= items.length) return false;
    const maxInsertion = items.length;
    let nextIndex = Math.max(0, Math.min(maxInsertion, insertionIndex));
    if (nextIndex === fromIndex || nextIndex === fromIndex + 1) return false;
    const [item] = items.splice(fromIndex, 1);
    if (nextIndex > fromIndex) nextIndex -= 1;
    items.splice(nextIndex, 0, item);
    return true;
  }

  function toggleAllItems(section) {
    const items = state.data[section] || [];
    const keys = items.map((_, index) => `${section}:${index}`);
    const allExpanded = keys.length > 0 && keys.every((key) => expandedItems.has(key));
    keys.forEach((key) => {
      if (allExpanded) expandedItems.delete(key);
      else expandedItems.add(key);
    });
  }

  function syncStaticSection(panel) {
    const section = document.querySelector(`[data-section-panel="${panel}"]`);
    if (!section) return;
    const isExpanded = expandedSections.has(panel);
    const toggle = section.querySelector(`[data-action="toggle-section"][data-panel="${panel}"]`);
    const content = section.querySelector(".section-content");
    if (toggle) toggle.setAttribute("aria-expanded", String(isExpanded));
    if (content) content.hidden = !isExpanded;
  }

  form.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) return;
    if (event.target.type === "file") return;
    updateFromControl(event.target);
    updatePreview();
  });
  form.addEventListener("submit", event => event.preventDefault());

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement || (target instanceof HTMLInputElement && target.type === "checkbox")) {
      updateFromControl(target);
      updatePreview();
    }

    if (target instanceof HTMLInputElement && target.id === "photo-input" && target.files?.[0]) {
      readPhotoFile(target.files[0]).then((photoSrc) => {
        state.photoSrc = photoSrc;
        renderForm();
        updatePreview();
      }).catch((error) => {
        console.error("No se pudo leer la foto", error);
        showError(new Error("No se pudo cargar la foto. Prueba con una imagen JPG o PNG."));
      });
    }
  });

  form.addEventListener("click", (event) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.action;
    const section = button.dataset.section;
    const index = Number(button.dataset.index);

    if (action === "add-link" && section && !Number.isNaN(index)) {
      const item = state.data[section][index];
      (item.links ||= []).push({label:"Link",url:"",target:item.bullets.length ? "bullet:0" : "text"});
    } else if (action === "remove-link" && section && !Number.isNaN(index)) {
      state.data[section][index].links.splice(Number(button.dataset.linkIndex),1);
    } else if (action === "add-item" && section) {
      activeEntryMenu = null;
      addItem(section);
      expandedSections.add(section);
    } else if (action === "remove-item" && section && !Number.isNaN(index)) {
      activeEntryMenu = null;
      state.data[section].splice(index, 1);
      expandedItems.clear();
    } else if (action === "duplicate-item" && section && !Number.isNaN(index)) {
      if (!duplicateItem(section, index)) return;
      activeEntryMenu = null;
      expandedItems.clear();
    } else if (action === "move-item" && section && !Number.isNaN(index)) {
      activeEntryMenu = null;
      moveItem(section, index, button.dataset.direction);
      expandedItems.clear();
    } else if (action === "toggle-entry-menu" && section && !Number.isNaN(index)) {
      const key = `${section}:${index}`;
      const willOpen = activeEntryMenu !== key;
      activeEntryMenu = willOpen ? key : null;
      renderForm();
      if (willOpen) {
        window.requestAnimationFrame(() => {
          document.querySelector(`[data-draggable-item][data-section="${section}"][data-index="${index}"] [data-entry-menu] button:not(:disabled)`)?.focus();
        });
      }
      return;
    } else if (action === "toggle-all-items" && section) {
      activeEntryMenu = null;
      toggleAllItems(section);
    } else if (action === "clear-photo") {
      activeEntryMenu = null;
      state.photoSrc = "";
    } else if (action === "toggle-section") {
      activeEntryMenu = null;
      const panel = button.dataset.panel;
      if (!panel) return;
      if (expandedSections.has(panel)) expandedSections.delete(panel);
      else expandedSections.add(panel);
    } else if (action === "toggle-item" && section && !Number.isNaN(index)) {
      activeEntryMenu = null;
      const key = `${section}:${index}`;
      if (expandedItems.has(key)) expandedItems.delete(key);
      else expandedItems.add(key);
    } else {
      return;
    }

    renderForm();
    updatePreview();
  });

  form.addEventListener("pointerdown", (event) => {
    const sectionHandle = event.target.closest("[data-section-drag-handle]");
    if (sectionHandle) {
      const panel = sectionHandle.dataset.panel;
      const source = sectionHandle.closest("[data-sortable-section]");
      const fromIndex = state.formSectionOrder.indexOf(panel);
      if (!panel || !source || fromIndex === -1) return;
      const rect = source.getBoundingClientRect();
      event.preventDefault();
      event.stopPropagation();
      activeEntryMenu = null;
      document.body.classList.add("is-dragging-ui");
      sectionDrag = {
        panel,
        fromIndex,
        startX: event.clientX,
        startY: event.clientY,
        sourceRect: rect,
        cards: draggableSectionCards().map((card) => ({
          panel: card.dataset.panel,
          index: state.formSectionOrder.indexOf(card.dataset.panel),
          rect: card.getBoundingClientRect(),
        })),
        slotSize: sectionSlotSize(panel, rect),
        insertionIndex: fromIndex,
        active: false,
      };
      sectionHandle.setPointerCapture?.(event.pointerId);
      return;
    }

    const handle = event.target.closest("[data-drag-handle]");
    if (!handle) return;
    const section = handle.dataset.section;
    const index = Number(handle.dataset.index);
    const source = handle.closest("[data-draggable-item]");
    if (!section || Number.isNaN(index)) return;
    if (!source) return;
    const rect = source.getBoundingClientRect();

    event.preventDefault();
    event.stopPropagation();
    activeEntryMenu = null;
    document.body.classList.add("is-dragging-ui");
    pointerDrag = {
      section,
      index,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      sourceRect: rect,
      slotSize: itemSlotSize(section, index, rect),
      targetIndex: index,
      insertionIndex: index,
      active: false,
    };
    handle.setPointerCapture?.(event.pointerId);
  });

  function draggableSectionCards() {
    return Array.from(document.querySelectorAll("[data-sortable-section]"));
  }

  function sectionSlotSize(panel, sourceRect) {
    const cards = draggableSectionCards();
    const sourceIndex = cards.findIndex((card) => card.dataset.panel === panel);
    const next = cards[sourceIndex + 1];
    if (next) return Math.max(sourceRect.height, next.getBoundingClientRect().top - sourceRect.top);
    return sourceRect.height + 6;
  }

  function sectionDropTargetFromPoint(event) {
    const cards = sectionDrag?.cards || [];
    if (!cards.length || !sectionDrag) return null;

    let insertionIndex = cards.length;
    let targetPanel = cards[cards.length - 1]?.panel;

    for (const card of cards) {
      const panel = card.panel;
      const panelIndex = card.index;
      if (panelIndex === sectionDrag.fromIndex) continue;
      const midpoint = card.rect.top + card.rect.height / 2;
      if (event.clientY < midpoint) {
        insertionIndex = panelIndex;
        targetPanel = panel;
        break;
      }
    }

    if (insertionIndex > sectionDrag.fromIndex) {
      const previous = cards[insertionIndex - 1];
      if (previous && previous.panel !== sectionDrag.panel) targetPanel = previous.panel;
    }

    return {
      target: document.querySelector(`[data-sortable-section][data-panel="${targetPanel}"]`),
      insertionIndex,
    };
  }

  function resetSectionDragStyles() {
    draggableSectionCards().forEach((card) => {
      card.classList.remove("is-section-dragging", "is-section-drag-shifted");
      card.style.transform = "";
      card.style.zIndex = "";
    });
  }

  function applySectionDragTransforms(event, source) {
    if (!sectionDrag || !source) return;
    const dx = event.clientX - sectionDrag.startX;
    const dy = event.clientY - sectionDrag.startY;
    const insertionIndex = sectionDrag.insertionIndex;

    draggableSectionCards().forEach((card) => {
      if (card === source) return;
      const panelIndex = state.formSectionOrder.indexOf(card.dataset.panel);
      let shift = 0;
      if (insertionIndex > sectionDrag.fromIndex && panelIndex > sectionDrag.fromIndex && panelIndex < insertionIndex) {
        shift = -sectionDrag.slotSize;
      } else if (insertionIndex < sectionDrag.fromIndex && panelIndex >= insertionIndex && panelIndex < sectionDrag.fromIndex) {
        shift = sectionDrag.slotSize;
      }
      card.classList.toggle("is-section-drag-shifted", shift !== 0);
      card.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : "";
      card.style.zIndex = "";
    });

    source.classList.add("is-section-dragging");
    source.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    source.style.zIndex = "1";
  }

  function cancelSectionDrag() {
    if (!sectionDrag) return;
    const { active } = sectionDrag;
    sectionDrag = null;
    resetSectionDragStyles();
    document.body.classList.remove("is-dragging-ui");
    if (active) {
      suppressNextClick = true;
      window.setTimeout(() => {
        suppressNextClick = false;
      }, 0);
    }
  }

  function moveSectionToInsertion(fromIndex, insertionIndex) {
    const order = state.formSectionOrder;
    if (fromIndex < 0 || fromIndex >= order.length) return false;
    let nextIndex = Math.max(0, Math.min(order.length, insertionIndex));
    if (nextIndex === fromIndex || nextIndex === fromIndex + 1) return false;
    const [panel] = order.splice(fromIndex, 1);
    if (nextIndex > fromIndex) nextIndex -= 1;
    order.splice(nextIndex, 0, panel);
    return true;
  }

  function dropTargetFromPoint(event, section) {
    const items = draggableItemsForSection(section);
    if (!items.length) return null;

    let insertionIndex = items.length;
    let target = items[items.length - 1];
    let position = "after";

    for (const item of items) {
      const itemIndex = Number(item.dataset.index);
      if (pointerDrag && itemIndex === pointerDrag.index) continue;
      const rect = item.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (event.clientY < midpoint) {
        insertionIndex = itemIndex;
        target = item;
        position = "before";
        break;
      }
    }

    if (pointerDrag && insertionIndex > pointerDrag.index) {
      const previous = items[insertionIndex - 1];
      if (previous && Number(previous.dataset.index) !== pointerDrag.index) {
        target = previous;
        position = "after";
      }
    }

    const targetIndex = Number(target?.dataset.index);
    if (!target || Number.isNaN(targetIndex)) return null;
    return {
      target,
      targetIndex,
      position,
      insertionIndex,
    };
  }

  function clearDropTargets() {
    document.querySelectorAll(".entry-card.is-drop-target").forEach((entry) => {
      entry.classList.remove("is-drop-target");
      entry.removeAttribute("data-drop-position");
    });
  }

  function draggableItemsForSection(section) {
    return Array.from(document.querySelectorAll(`[data-draggable-item][data-section="${section}"]`));
  }

  function itemSlotSize(section, index, sourceRect) {
    const items = draggableItemsForSection(section);
    const next = items[index + 1];
    if (next) return Math.max(sourceRect.height, next.getBoundingClientRect().top - sourceRect.top);
    return sourceRect.height + 12;
  }

  function resetPointerDragStyles(section) {
    const items = section ? draggableItemsForSection(section) : Array.from(document.querySelectorAll("[data-draggable-item]"));
    items.forEach((entry) => {
      entry.classList.remove("is-dragging", "is-drag-shifted", "is-drop-target");
      entry.removeAttribute("data-drop-position");
      entry.style.transform = "";
      entry.style.zIndex = "";
    });
  }

  function applyPointerDragTransforms(event, source) {
    if (!pointerDrag || !source) return;
    const items = draggableItemsForSection(pointerDrag.section);
    const dx = event.clientX - pointerDrag.startX;
    const dy = event.clientY - pointerDrag.startY;
    const insertionIndex = pointerDrag.insertionIndex;

    items.forEach((entry) => {
      if (entry === source) return;
      const itemIndex = Number(entry.dataset.index);
      let shift = 0;
      if (insertionIndex > pointerDrag.index && itemIndex > pointerDrag.index && itemIndex < insertionIndex) {
        shift = -pointerDrag.slotSize;
      } else if (insertionIndex < pointerDrag.index && itemIndex >= insertionIndex && itemIndex < pointerDrag.index) {
        shift = pointerDrag.slotSize;
      }
      entry.classList.toggle("is-drag-shifted", shift !== 0);
      entry.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : "";
      entry.style.zIndex = "";
    });

    source.classList.add("is-dragging");
    source.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    source.style.zIndex = "1";
  }

  function cancelPointerDrag() {
    if (!pointerDrag) return;
    const { section, active } = pointerDrag;
    pointerDrag = null;
    clearDropTargets();
    resetPointerDragStyles(section);
    document.body.classList.remove("is-dragging-ui");
    if (active) {
      suppressNextClick = true;
      window.setTimeout(() => {
        suppressNextClick = false;
      }, 0);
    }
  }

  document.addEventListener("pointermove", (event) => {
    if (sectionDrag) {
      const distance = Math.abs(event.clientX - sectionDrag.startX) + Math.abs(event.clientY - sectionDrag.startY);
      if (!sectionDrag.active && distance < 3) return;
      event.preventDefault();

      const source = document.querySelector(`[data-sortable-section][data-panel="${sectionDrag.panel}"]`);
      sectionDrag.active = true;
      const dropTarget = sectionDropTargetFromPoint(event);
      sectionDrag.insertionIndex = dropTarget?.insertionIndex ?? sectionDrag.fromIndex;
      applySectionDragTransforms(event, source);
      return;
    }

    if (!pointerDrag) return;
    const distance = Math.abs(event.clientX - pointerDrag.startX) + Math.abs(event.clientY - pointerDrag.startY);
    if (!pointerDrag.active && distance < 3) return;
    event.preventDefault();

    const source = document.querySelector(`[data-draggable-item][data-section="${pointerDrag.section}"][data-index="${pointerDrag.index}"]`);
    pointerDrag.active = true;

    clearDropTargets();
    const dropTarget = dropTargetFromPoint(event, pointerDrag.section);
    if (dropTarget) {
      pointerDrag.targetIndex = dropTarget.targetIndex;
      pointerDrag.insertionIndex = dropTarget.insertionIndex;
    } else {
      pointerDrag.targetIndex = pointerDrag.index;
      pointerDrag.insertionIndex = pointerDrag.index;
    }
    applyPointerDragTransforms(event, source);
    if (dropTarget && dropTarget.insertionIndex !== pointerDrag.index && dropTarget.insertionIndex !== pointerDrag.index + 1) {
      dropTarget.target.classList.add("is-drop-target");
      dropTarget.target.dataset.dropPosition = dropTarget.position;
    }
  });

  function finishPointerDrag(event) {
    if (sectionDrag) {
      const { fromIndex, insertionIndex, active } = sectionDrag;
      const finalDropTarget = active && event ? sectionDropTargetFromPoint(event) : null;
      const finalInsertionIndex = finalDropTarget?.insertionIndex ?? insertionIndex;
      sectionDrag = null;
      resetSectionDragStyles();
      document.body.classList.remove("is-dragging-ui");
      if (!active) return;
      suppressNextClick = true;
      window.setTimeout(() => {
        suppressNextClick = false;
      }, 0);
      if (!moveSectionToInsertion(fromIndex, finalInsertionIndex)) return;
      renderForm();
      updatePreview();
      return;
    }

    if (!pointerDrag) return;
    const { section, index, insertionIndex, active } = pointerDrag;
    const finalDropTarget = active && event ? dropTargetFromPoint(event, section) : null;
    const finalInsertionIndex = finalDropTarget?.insertionIndex ?? insertionIndex;
    pointerDrag = null;
    clearDropTargets();
    resetPointerDragStyles(section);
    document.body.classList.remove("is-dragging-ui");
    if (!active) return;
    suppressNextClick = true;
    window.setTimeout(() => {
      suppressNextClick = false;
    }, 0);
    if (!moveItemToInsertion(section, index, finalInsertionIndex)) return;
    expandedItems.clear();
    renderForm();
    updatePreview();
  }

  document.addEventListener("pointerup", finishPointerDrag);
  document.addEventListener("pointercancel", finishPointerDrag);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (activeEntryMenu) {
      event.preventDefault();
      activeEntryMenu = null;
      renderForm();
      return;
    }
    if (!pointerDrag && !sectionDrag) return;
    event.preventDefault();
    if (sectionDrag) {
      cancelSectionDrag();
      return;
    }
    cancelPointerDrag();
  });

  form.addEventListener("dragstart", (event) => {
    const handle = event.target.closest("[data-drag-handle]");
    if (!handle) return;
    const section = handle.dataset.section;
    const index = Number(handle.dataset.index);
    if (!section || Number.isNaN(index)) return;
    draggedItem = { section, index };
    const card = handle.closest("[data-draggable-item]");
    card?.classList.add("is-dragging");
    document.body.classList.add("is-dragging-ui");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${section}:${index}`);
  });

  form.addEventListener("dragover", (event) => {
    if (!draggedItem) return;
    const card = event.target.closest("[data-draggable-item]");
    if (!card || card.dataset.section !== draggedItem.section) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    document.querySelectorAll(".entry-card.is-drop-target").forEach((entry) => entry.classList.remove("is-drop-target"));
    card.classList.add("is-drop-target");
  });

  form.addEventListener("dragleave", (event) => {
    const card = event.target.closest("[data-draggable-item]");
    if (card && !card.contains(event.relatedTarget)) card.classList.remove("is-drop-target");
  });

  form.addEventListener("drop", (event) => {
    if (!draggedItem) return;
    const card = event.target.closest("[data-draggable-item]");
    if (!card || card.dataset.section !== draggedItem.section) return;
    event.preventDefault();
    const moved = moveItemTo(draggedItem.section, draggedItem.index, Number(card.dataset.index));
    draggedItem = null;
    document.body.classList.remove("is-dragging-ui");
    document.querySelectorAll(".entry-card.is-drop-target, .entry-card.is-dragging").forEach((entry) => {
      entry.classList.remove("is-drop-target", "is-dragging");
    });
    if (!moved) return;
    expandedItems.clear();
    renderForm();
    updatePreview();
  });

  form.addEventListener("dragend", () => {
    draggedItem = null;
    document.body.classList.remove("is-dragging-ui");
    document.querySelectorAll(".entry-card.is-drop-target, .entry-card.is-dragging").forEach((entry) => {
      entry.classList.remove("is-drop-target", "is-dragging");
    });
  });

  function readPhotoFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("error", reject);
      reader.addEventListener("load", () => {
        const image = new Image();
        image.addEventListener("error", reject);
        image.addEventListener("load", () => {
          const size = 240;
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          const side = Math.min(image.width, image.height);
          const sx = (image.width - side) / 2;
          const sy = (image.height - side) / 2;
          canvas.width = size;
          canvas.height = size;
          context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        });
        image.src = String(reader.result || "");
      });
      reader.readAsDataURL(file);
    });
  }

  async function requestPrint() {
    setDownloadMenu(false);
    await preparePrint(preview, state);
    window.print();
  }
  function setDownloadMenu(open) {
    downloadMenu.hidden = !open;
    downloadButton.setAttribute("aria-expanded", String(open));
  }
  downloadButton.addEventListener("click", event => {event.stopPropagation(); setDownloadMenu(downloadMenu.hidden);});
  downloadMenu.addEventListener("click", async event => {
    const action = event.target.closest("[data-download-action]")?.dataset.downloadAction;
    if (!action) return;
    setDownloadMenu(false);
    try {
      if (action === "pdf") await requestPrint();
      if (action === "txt") downloadBlob(`${fileName(record)}.txt`, new Blob([plainText(state)], {type:"text/plain;charset=utf-8"}));
      if (action === "docx") {
        downloadButton.disabled = true;
        const {createDocx} = await import("./vendor/cv-docx.js");
        downloadBlob(`${fileName(record)}.docx`, await createDocx(state));
      }
    } catch (error) {showError(error);} finally {downloadButton.disabled = false;}
  });
  document.getElementById("download-json").addEventListener("click", () => {
    downloadBlob(`${fileName(record)}.json`, new Blob([JSON.stringify({schemaVersion:2,title:record.title,state},null,2)], {type:"application/json"}));
  });
  const jsonInput = document.getElementById("json-file");
  document.getElementById("import-json").addEventListener("click", () => jsonInput.click());
  jsonInput.addEventListener("change", async () => {
    const file = jsonInput.files[0];
    if (!file) return;
    try {
      if (file.size > 900000) throw new Error("La copia es demasiado grande. Elige un JSON de menos de 900 KB.");
      const imported = JSON.parse(await file.text());
      const data = imported?.state?.data || imported?.data || imported;
      if (!data || typeof data !== "object" || !["name","experience","education","summary"].some(key => key in data)) throw new Error("El archivo no contiene datos de un CV.");
      if (!await askDialog({title:"Importar copia del CV",description:"Los datos de este CV se sustituirán por los de la copia importada.",confirmLabel:"Importar copia"})) return;
      state = normalizeState(imported.state || (imported.data ? imported : {data:imported}));
      if (imported.title && imported.state) record.title = String(imported.title).slice(0,100);
      titleInput.value = record.title;
      renderForm(); updatePreview(); syncDesign();
    } catch (error) {showError(error);} finally {jsonInput.value = "";}
  });
  saveCloud.addEventListener("click", saveCurrent);
  titleInput.addEventListener("input", () => {record.title = titleInput.value.trim() || "Mi CV"; persist();});
  accountMenuButton.addEventListener("click", event => {event.stopPropagation(); setDownloadMenu(false); accountPopover.hidden = !accountPopover.hidden;});
  document.addEventListener("click", event => {
    if (!event.target.closest(".top-actions")) {accountPopover.hidden = true; setDownloadMenu(false);}
  });
  document.addEventListener("keydown", event => {if (event.key === "Escape") {accountPopover.hidden = true; setDownloadMenu(false);}});
  async function moveToAccount() {
    loginGoogle.disabled = true;
    document.getElementById("guest-login").disabled = true;
    try {
      const services = await signIn();
      const target = new CvRepository(services);
      const saved = await target.create(state, record.title);
      location.assign(target.url("builder.html", saved.id));
    } catch (error) {showError(error);}
    finally {loginGoogle.disabled = false; document.getElementById("guest-login").disabled = false;}
  }
  loginGoogle.addEventListener("click", moveToAccount);
  document.getElementById("guest-login").addEventListener("click", moveToAccount);
  logoutGoogle.addEventListener("click", async () => {
    if (revision !== savedRevision && !(await saveCurrent())) return;
    try {await signOut();} catch (error) {showError(error);}
  });
  document.getElementById("manage-account").addEventListener("click", async () => {
    if (revision !== savedRevision && !(await saveCurrent())) return;
    location.assign("./account.html");
  });
  function setBuilderTab(name) {
    document.body.dataset.builderTab = name;
    document.querySelectorAll("[data-tab-action]").forEach(button => button.classList.toggle("is-active", button.dataset.tabAction === name));
    document.querySelectorAll("[data-builder-tab-panel]").forEach(panel => panel.hidden = panel.dataset.builderTabPanel !== name);
  }
  document.querySelectorAll("[data-tab-action]").forEach(button => button.addEventListener("click", () => setBuilderTab(button.dataset.tabAction)));
  const designGallery = mountDesignGallery(document.getElementById("cv-template-catalog"), {
    search: document.getElementById("design-template-search"),
    group: document.getElementById("design-template-group"),
    status: document.getElementById("design-template-status"),
    onSelect(template) {
      if (!ready || recoveryPending || repository.accountDeletionPending) return;
      state.design.template = template;
      syncDesign(); updatePreview();
    },
  });
  function syncDesign() {
    document.getElementById("design-page-numbers").checked = state.design.pageNumbers;
    document.getElementById("design-page-prefix").value = state.design.pageNumberPrefix;
    designGallery.sync(state.design.template);
    document.querySelectorAll("[data-accent]").forEach(button => {button.classList.toggle("is-selected", button.dataset.accent === state.design.accent); button.setAttribute("aria-pressed", button.dataset.accent === state.design.accent);});
  }
  document.querySelectorAll("[data-accent]").forEach(button => button.addEventListener("click", () => {state.design.accent = button.dataset.accent; syncDesign(); updatePreview();}));
  document.getElementById("design-page-numbers").addEventListener("change", event => {state.design.pageNumbers = event.target.checked; updatePreview();});
  document.getElementById("design-page-prefix").addEventListener("input", event => {state.design.pageNumberPrefix = event.target.value; updatePreview();});
  window.addEventListener("beforeunload", event => {if (revision !== savedRevision && !repository.accountDeletionPending) {event.preventDefault(); event.returnValue = "";}});
  window.addEventListener("offline", () => {if (!repository.isGuest && revision !== savedRevision) setCloudStatus("Sin conexión · borrador local", "pending");});
  window.addEventListener("online", saveCurrent);
  const recovery = document.getElementById("draft-recovery");
  function finishRecovery() {
    recoveryPending = false; recovery.hidden = true; form.inert = false; titleInput.disabled = false; saveCloud.disabled = false;
    document.querySelector(".cv-design-panel").inert = false;
    document.querySelector(".cv-data-tools").inert = false;
  }
  document.getElementById("recover-draft").addEventListener("click", () => {
    state = normalizeState(draft.record.state);
    record.title = draft.record.title;
    titleInput.value = record.title;
    finishRecovery(); renderForm(); syncDesign(); updatePreview();
  });
  document.getElementById("discard-draft").addEventListener("click", () => {repository.clearDraft(record.id); finishRecovery();});
  const name = repository.user?.displayName || repository.user?.email || "Invitado";
  document.getElementById("account-name").textContent = name;
  document.getElementById("account-detail").textContent = repository.user?.email || "CV temporal en esta pestaña";
  document.getElementById("guest-notice").hidden = !repository.isGuest;
  document.getElementById("back-to-cvs").href = repository.url("resumes.html");
  loginGoogle.hidden = !repository.isGuest;
  logoutGoogle.hidden = repository.isGuest;
  document.getElementById("manage-account").hidden = repository.isGuest;
  titleInput.value = record.title;
  titleInput.disabled = recoveryPending;
  saveCloud.disabled = recoveryPending;
  downloadButton.disabled = false;
  form.inert = recoveryPending;
  document.querySelector(".cv-design-panel").inert = recoveryPending;
  document.querySelector(".cv-data-tools").inert = recoveryPending;
  recovery.hidden = !recoveryPending;
  if (repository.isGuest) loadFirebase().catch(() => {});
  setCloudStatus(repository.isGuest ? "Guardado en esta pestaña" : "Guardado en tu cuenta");
  setBuilderTab(location.hash === "#design" ? "design" : "editor");
  renderForm(); syncDesign(); updatePreview(false);
  ready = true;
  document.fonts.ready.then(() => updatePreview(false));
  let resizeTimer;
  window.addEventListener("resize", () => {clearTimeout(resizeTimer); resizeTimer = setTimeout(() => updatePreview(false),100);});
  if (location.hash === "#print" && !recoveryPending) await requestPrint();
}
main().catch(error => {
  console.error(error);
  const errorEl = document.getElementById("editor-error");
  errorEl.textContent = friendlyError(error);
  errorEl.hidden = false;
  document.getElementById("cloud-status").textContent = "No se pudo cargar el CV";
});
