(() => {
  const STORAGE_KEY = "cv-builder-state-v3";
  const RESUME_COLLECTION_KEY = "cv-builder-documents-v1";
  const ACTIVE_RESUME_KEY = "cv-builder-active-resume-id";
  const DEFAULT_RESUME_ID = "44230391";
  const list = document.getElementById("resume-list");
  const coverPanel = document.getElementById("cover-letter-panel");
  const createButton = document.getElementById("create-resume-button");
  const createCard = document.getElementById("create-resume-card");
  let activeTab = "resumes";
  let toastTimer = null;

  const ACTION_ICON_PATHS = {
    pdf: "M9,6 L9,13 L7.20376823,13 L12,18.4814077 L16.7962318,13 L15,13 L15,6 L9,6 Z M7,11 L7,5 C7,4.44771525 7.44771525,4 8,4 L16,4 C16.5522847,4 17,4.44771525 17,5 L17,11 L19,11 C19.8591588,11 20.3183367,12.0119217 19.7525767,12.6585046 L12.7525767,20.6585046 C12.3541654,21.1138318 11.6458346,21.1138318 11.2474233,20.6585046 L4.24742331,12.6585046 C3.68166327,12.0119217 4.14084119,11 5,11 L7,11 Z",
    docx: "M17 19V7.82843L14.1716 5H7v14h10zm1 2H6c-.55228 0-1-.4477-1-1V4c0-.55228.44772-1 1-1h8.5858c.2652 0 .5196.10536.7071.29289l3.4142 3.41422c.1875.18753.2929.44189.2929.7071V20c0 .5523-.4477 1-1 1z M10.5169 12.8175L9.66292 10H8l1.75281 5h1.30339L12 12.2222 12.9438 15h1.3034L16 10h-1.6629l-.854 2.8175L12.5393 10h-1.0786l-.9438 2.8175z",
    txt: "M17 19V7.87116L14.1643 5H7v14h10zm1 2H6c-.55228 0-1-.4477-1-1V4c0-.55228.44772-1 1-1h8.5821c.2674 0 .5236.10707.7115.2973l3.4179 3.46058c.1848.18717.2885.43963.2885.7027V20c0 .5523-.4477 1-1 1z M15 10H9v2h2v4h2v-4h2v-2z",
    duplicate: "M5 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zm1 2v8h8v-8H6zm12-4H9V5h10a1 1 0 0 1 1 1v10h-2V7z",
    more: "M6.5,14 C5.67157288,14 5,13.3284271 5,12.5 C5,11.6715729 5.67157288,11 6.5,11 C7.32842712,11 8,11.6715729 8,12.5 C8,13.3284271 7.32842712,14 6.5,14 Z M12.5,14 C11.6715729,14 11,13.3284271 11,12.5 C11,11.6715729 11.6715729,11 12.5,11 C13.3284271,11 14,11.6715729 14,12.5 C14,13.3284271 13.3284271,14 12.5,14 Z M18.5,14 C17.6715729,14 17,13.3284271 17,12.5 C17,11.6715729 17.6715729,11 18.5,11 C19.3284271,11 20,11.6715729 20,12.5 C20,13.3284271 19.3284271,14 18.5,14 Z",
  };
  const CREATE_ICON = '<svg width="20" height="20" viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11 5H9v4H5v2h4v4h2v-4h4V9h-4V5z"></path></svg>';

  function actionIcon(type) {
    const path = ACTION_ICON_PATHS[type];
    return path
      ? `<svg width="24" height="24" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${path}"></path></svg>`
      : "";
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function compactSpaces(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function readJson(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
      console.warn(`No se pudo leer ${key}`, error);
      return fallback;
    }
  }

  function writeDocuments(documents) {
    localStorage.setItem(RESUME_COLLECTION_KEY, JSON.stringify(documents));
  }

  function fallbackState() {
    return {
      data: {
        name: "Diego Ayala Bernal",
        title: "Ingeniero Informático, Docente",
        email: "diego.ayala2@um.es",
        phone: "+34601250396",
        linkedin: "",
        postalCode: "",
        city: "",
        country: "",
        experience: [
          {
            date: "Oct 2023 - Presente",
            title: "Docente FP Grado Superior, Cesur",
            meta: null,
            bullets: ["Docente de los modulos DAM, DAW y ASIR."],
          },
          {
            date: "Sep 2023 - Presente",
            title: "Docente FP Grado Superior y Grado Medio, Colegio Miralmonte",
            meta: null,
            bullets: ["Docente de los módulos DAM y SMR.", "Clases impartidas a grupos bilingües.", "Tutor 2°DAM, coordinador FCT."],
          },
          {
            date: "May 2023 - Ago 2023",
            title: "Docente Titular de Grado Superior, Universae",
            meta: null,
            bullets: ["Responsable de crear material didáctico e impartir clases en las titulaciones de DAW, DAM y ASIR."],
          },
          {
            date: "Ene 2023 - May 2023",
            title: "Profesor de educación secundaria Bilingüe, CEIPS Torre Salinas",
            meta: null,
            bullets: [],
          },
          {
            date: "Feb 2021 - Abr 2022",
            title: "Freelance Ingeniero Software",
            meta: null,
            bullets: ["Numerosos proyectos de diversa índole."],
          },
          {
            date: "Ene 2021 - Feb 2022",
            title: "Profesor Particular",
            meta: null,
            bullets: ["Enfocadas al alumnado de Bachillerato, FP, Universidad, Master.", "Flexibles y adaptadas a los requisitos solicitados por el alumno."],
          },
          {
            date: "Ene 2020 - Abr 2021",
            title: "Ingeniero Software Junior, Tecnoavanz S.L",
            meta: null,
            bullets: ["Startup Tecnológica subsidiaria de Orange.", "Construí características clave del CRM, como desarrollador Symfony, dentro de un equipo ágil de 5 personas.", "Implementación de reglas de negocio, para mejorar la calidad de los datos de los clientes."],
          },
        ],
        education: [
          {
            date: "Oct 2022 - Jun 2023",
            title: "Máster Universitario en Formación del Profesorado, VIU",
            meta: "Media de 8.9",
            bullets: [],
          },
          {
            date: "Sep 2014 - Jul 2019",
            title: "Ingeniería Informática Mención en Software, Universidad Murcia",
            meta: null,
            bullets: [],
          },
          {
            date: "Jul 2022 - Jul 2022",
            title: "Overall CEFR Grade English C, British Council Aptis",
            meta: null,
            bullets: [],
          },
          {
            date: "Ene 2022 - May 2022",
            title: "Lengua de Signos Española A2, Lengua de Signos",
            meta: null,
            bullets: [],
          },
        ],
        awards: [
          {
            date: "Ene 2023",
            title: "3 Cartas de recomendación expedidas por profesores titulados de la Universidad de Murcia",
            meta: null,
            bullets: ["3 cartas de recomendación redactadas y firmadas por profesores titulados de la Universidad de Murcia, donde se da muestra de mis conocimientos, cualidades e hitos alcanzados en mi paso por la facultad de Informática. (adjuntadas en el propio correo o en el siguiente link: bit.ly/4deEQHl )"],
          },
          {
            date: "Mar 2021 - Ago 2021",
            title: "Finalista Lanzadera, Marina de Empresas",
            meta: null,
            bullets: ["Finalista en Lanzadera (2021), la mayor aceleradora e incubadora de startups a nivel nacional, con una iniciativa de corte educativo, realizando un pitch presencial ante el jurado en la sede de Lanzadera. Siendo finalista junto a otros 30 proyectos restantes de entre los 2500 iniciales."],
          },
          {
            page_break_before: true,
            date: "Ago 2021 - Dic 2021",
            title: "Entrepreneurship World Cup (EWC) - Preseleccionado",
            meta: null,
            bullets: ["Preseleccionado en la mayor iniciativa de emprendimiento a nivel global, Entrepreneurship World Cup (EWC), con una iniciativa de corte educativo."],
          },
          {
            date: "Dic 2021",
            title: "NextCarm (Next Generation) - Aprobación y remisión del proyecto por la Región de Murcia al Gobierno Central.",
            meta: null,
            bullets: ["Propuesta integrada y aprobada en el documento conjunto de iniciativas de la Región de Murcia que se remitió al Gobierno de España para su evaluación y financiación a través de los fondos Next Generation."],
          },
        ],
      },
      photoSrc: "",
    };
  }

  function ensureDocuments() {
    const documents = readJson(RESUME_COLLECTION_KEY, []);
    if (Array.isArray(documents) && documents.length) return documents;

    const currentState = readJson(STORAGE_KEY, null) || fallbackState();
    const seeded = [{
      id: DEFAULT_RESUME_ID,
      kind: "resume",
      title: "CV ESPAÑOL",
      language: "Español",
      score: 66,
      updatedAt: "2026-04-22T02:23:00+02:00",
      state: currentState,
    }];
    writeDocuments(seeded);
    localStorage.setItem(ACTIVE_RESUME_KEY, DEFAULT_RESUME_ID);
    return seeded;
  }

  function getDocuments() {
    return ensureDocuments().filter((document) => document.kind !== "cover-letter");
  }

  function saveActiveDocument(document) {
    localStorage.setItem(ACTIVE_RESUME_KEY, document.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(document.state || fallbackState()));
  }

  function openBuilder(document) {
    saveActiveDocument(document);
    window.location.href = `./builder.html?resumeId=${encodeURIComponent(document.id)}`;
  }

  function createResume() {
    const id = `resume-${Date.now()}`;
    const document = {
      id,
      kind: "resume",
      title: "Nuevo CV",
      language: "Español",
      score: 0,
      updatedAt: new Date().toISOString(),
      state: {
        data: {
          name: "",
          title: "",
          email: "",
          phone: "",
          linkedin: "",
          postalCode: "",
          city: "",
          country: "",
          experience: [],
          education: [],
          awards: [],
        },
        photoSrc: "",
      },
    };
    const documents = ensureDocuments();
    documents.unshift(document);
    writeDocuments(documents);
    openBuilder(document);
  }

  function duplicateResume(id) {
    const documents = ensureDocuments();
    const source = documents.find((document) => document.id === id);
    if (!source) return;
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = `resume-${Date.now()}`;
    copy.title = `${source.title || "CV ESPAÑOL"} copia`;
    copy.updatedAt = new Date().toISOString();
    documents.unshift(copy);
    writeDocuments(documents);
    render();
    showToast("CV duplicado.");
  }

  function deleteResume(id) {
    const documents = ensureDocuments();
    const document = documents.find((entry) => entry.id === id);
    if (!document) return;
    if (!confirm(`Eliminar "${document.title || "CV"}"?`)) return;
    const next = documents.filter((entry) => entry.id !== id);
    writeDocuments(next);
    render();
    showToast("CV eliminado.");
  }

  function renameResume(id) {
    const documents = ensureDocuments();
    const document = documents.find((entry) => entry.id === id);
    if (!document) return;
    const nextTitle = compactSpaces(prompt("Nuevo nombre del CV", document.title || "CV ESPAÑOL"));
    if (!nextTitle) return;
    document.title = nextTitle;
    document.updatedAt = new Date().toISOString();
    writeDocuments(documents);
    render();
  }

  function formatUpdatedAt(value) {
    return "Actualizado";
  }

  function resumeText(document) {
    const data = document.state?.data || {};
    const lines = [
      data.name,
      data.title,
      [data.email, data.phone].filter(Boolean).join(" · "),
      "",
      "Experiencia",
      ...(data.experience || []).flatMap((item) => [compactSpaces(`${item.date || ""} ${item.title || ""}`), ...(item.bullets || []).map((bullet) => `- ${bullet}`), ""]),
      "Formación",
      ...(data.education || []).flatMap((item) => [compactSpaces(`${item.date || ""} ${item.title || ""}`), ...(item.bullets || []).map((bullet) => `- ${bullet}`), ""]),
      "Reconocimientos",
      ...(data.awards || []).flatMap((item) => [compactSpaces(`${item.date || ""} ${item.title || ""}`), ...(item.bullets || []).map((bullet) => `- ${bullet}`), ""]),
    ];
    return lines.filter((line, index, arr) => line || arr[index - 1]).join("\n");
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadTxt(document) {
    downloadFile(`${document.title || "cv"}.txt`, resumeText(document), "text/plain;charset=utf-8");
  }

  function downloadDoc(document) {
    const body = resumeText(document).split("\n").map((line) => `<p>${esc(line) || "&nbsp;"}</p>`).join("");
    downloadFile(`${document.title || "cv"}.doc`, `<!doctype html><html><meta charset="utf-8"><body>${body}</body></html>`, "application/msword;charset=utf-8");
  }

  function printPdf(document) {
    saveActiveDocument(document);
    showToast("Abriendo vista de impresión para descargar PDF.");
    window.open(`./builder.html?resumeId=${encodeURIComponent(document.id)}#print`, "_blank", "noopener");
  }

  function renderMiniPreview(document) {
    const data = document.state?.data || {};
    const name = compactSpaces(data.name || "Diego Ayala Bernal");
    const title = compactSpaces(data.title || "Ingeniero Informático, Docente");
    const firstExperience = data.experience?.[0]?.title || "Experiencia profesional";
    const secondExperience = data.experience?.[1]?.title || "Formación y logros";
    return `
      <div class="resume-mini-page" aria-hidden="true">
        <strong>${esc(name)}</strong>
        <small>${esc(title)}</small>
        <span></span>
        <p>${esc(firstExperience)}</p>
        <p>${esc(secondExperience)}</p>
        <span></span>
        <p>FORMACIÓN</p>
      </div>
    `;
  }

  function renderResumeCard(document) {
    const score = Number(document.score || 0);
    const title = document.title || "CV ESPAÑOL";
    return `
      <article class="dashboard-resume-card" data-resume-id="${esc(document.id)}">
        <button class="resume-card-main" type="button" data-dashboard-action="open" data-resume-id="${esc(document.id)}">
          ${renderMiniPreview(document)}
          <span class="resume-card-details">
            <strong>${esc(title)}</strong>
            <small>${esc(formatUpdatedAt(document.updatedAt))}</small>
            <span class="resume-score"><b>${score}%</b><span>Puntuación de tu currículum</span></span>
          </span>
        </button>
        <div class="resume-card-actions">
          <button type="button" data-dashboard-action="pdf" data-resume-id="${esc(document.id)}">${actionIcon("pdf")}Descargar PDF</button>
          <button type="button" data-dashboard-action="docx" data-resume-id="${esc(document.id)}">${actionIcon("docx")}Descargar en DOCX</button>
          <button type="button" data-dashboard-action="txt" data-resume-id="${esc(document.id)}">${actionIcon("txt")}Exportar a TXT</button>
          <button type="button" data-dashboard-action="duplicate" data-resume-id="${esc(document.id)}">${actionIcon("duplicate")}Duplicar</button>
          <div class="resume-more-wrap">
            <button type="button" data-dashboard-action="more" data-resume-id="${esc(document.id)}">${actionIcon("more")}Más</button>
            <div class="resume-more-menu" hidden>
              <button type="button" data-dashboard-action="combine" data-resume-id="${esc(document.id)}">Combinar con...</button>
              <button type="button" data-dashboard-action="delete" data-resume-id="${esc(document.id)}">Borrar</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    const resumes = getDocuments();
    const documentsGrid = document.querySelector(".documents-grid");
    list.hidden = activeTab !== "resumes";
    coverPanel.hidden = activeTab !== "letters";
    documentsGrid.hidden = activeTab !== "resumes";
    document.querySelector(".new-document-card").hidden = activeTab !== "resumes";
    createButton.innerHTML = `<span>${CREATE_ICON}Crear nuevo</span>`;
    list.innerHTML = resumes.length
      ? resumes.map(renderResumeCard).join("")
      : '<p class="dashboard-empty">No hay currículums todavía.</p>';
  }

  function showToast(message) {
    let toast = document.getElementById("dashboard-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "dashboard-toast";
      toast.className = "builder-toast";
      toast.setAttribute("role", "status");
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function documentById(id) {
    return ensureDocuments().find((document) => document.id === id);
  }

  document.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-document-tab]");
    if (tab) {
      activeTab = tab.dataset.documentTab;
      document.querySelectorAll("[data-document-tab]").forEach((button) => button.classList.toggle("is-active", button === tab));
      render();
      return;
    }

    if (event.target.closest("#create-resume-button") || event.target.closest("#create-resume-card")) {
      if (activeTab === "letters") showToast("Carta preparada: selecciona primero un CV para generar contenido.");
      else createResume();
      return;
    }

    const nav = event.target.closest("[data-dashboard-nav]");
    if (nav) {
      event.preventDefault();
      showToast("Sección disponible en la web original. Esta copia local replica Documentos.");
      return;
    }

    const actionButton = event.target.closest("[data-dashboard-action]");
    if (!actionButton) return;
    event.preventDefault();
    const action = actionButton.dataset.dashboardAction;
    const id = actionButton.dataset.resumeId;
    const resume = id ? documentById(id) : null;

    document.querySelectorAll(".resume-more-menu").forEach((menu) => {
      if (!actionButton.closest(".resume-more-wrap")?.contains(menu)) menu.hidden = true;
    });

    if (action === "boost") showToast("Promoción preparada como en cvapp.es.");
    if (action === "new-letter") showToast("Selecciona un CV para generar una carta de presentación.");
    if (action === "menu") showToast("El menú lateral ya está visible.");
    if (action === "premium") showToast("Renovación Premium simulada en la copia local.");
    if (action === "settings") showToast("Ajustes de cuenta disponibles en la web original.");
    if (!resume) return;
    if (action === "open") openBuilder(resume);
    if (action === "pdf") printPdf(resume);
    if (action === "docx") downloadDoc(resume);
    if (action === "txt") downloadTxt(resume);
    if (action === "duplicate") duplicateResume(id);
    if (action === "combine") showToast("Combinar con otro documento está disponible en cvapp.es.");
    if (action === "rename") renameResume(id);
    if (action === "delete") deleteResume(id);
    if (action === "more") {
      const menu = actionButton.parentElement.querySelector(".resume-more-menu");
      if (menu) menu.hidden = !menu.hidden;
    }
  });

  render();
})();
