(() => {
  const SECTION_DEFINITIONS = [
    ["experience", "EXPERIENCIA LABORAL", "Experiencia laboral"],
    ["education", "FORMACIÓN", "Formación"],
    ["awards", "RECONOCIMIENTOS, PREMIOS E HITOS", "Reconocimientos, premios e hitos"],
  ];

  const SECTION_KEYS = SECTION_DEFINITIONS.map(([key]) => key);
  const DEFAULT_FORM_SECTION_ORDER = ["powerStatement", "profile", "achievements", "experience", "education", "awards", "areas", "websites"];
  const RESUME_COLLECTION_KEY = "cv-builder-documents-v1";
  const ACTIVE_RESUME_KEY = "cv-builder-active-resume-id";
  const DEFAULT_RESUME_ID = "44230391";
  const STORAGE_KEY = "cv-builder-state-v3";
  const FIREBASE_SDK_VERSION = "10.14.1";
  const FIRST_PAGE_BODY_LIMIT = 1015;
  const FOLLOWING_PAGE_BODY_LIMIT = 1050;
  const FIRST_PAGE_HEADER_COST = 92;
  const SECTION_HEADING_COST = 29;
  const SECTION_BOUNDARY_COST = 19;
  const AI_SCORE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="20" viewBox="0 0 32 20" fill="none" aria-hidden="true"><rect width="32" height="20" rx="4" fill="#F1F2FF"></rect><path opacity="0.4" d="M11.2611 3.29444C11.3175 3.15621 11.5132 3.15621 11.5697 3.29444L11.887 4.07168C11.9717 4.27902 12.1362 4.44355 12.3435 4.5282L13.1208 4.84554C13.259 4.90197 13.259 5.0977 13.1208 5.15414L12.3435 5.47147C12.1362 5.55612 11.9717 5.72066 11.887 5.92799L11.5697 6.70524C11.5132 6.84346 11.3175 6.84346 11.2611 6.70524L10.9437 5.92799C10.8591 5.72066 10.6945 5.55612 10.4872 5.47147L9.70996 5.15414C9.57174 5.0977 9.57174 4.90197 9.70996 4.84554L10.4872 4.5282C10.6945 4.44355 10.8591 4.27902 10.9437 4.07168L11.2611 3.29444Z" fill="#7A82F5"></path><path d="M10.4303 12.4614C10.4868 12.3232 10.6825 12.3232 10.7389 12.4614L11.2979 13.8304C11.3825 14.0377 11.5471 14.2023 11.7544 14.2869L13.1234 14.8459C13.2616 14.9023 13.2616 15.098 13.1234 15.1545L11.7544 15.7134C11.5471 15.798 11.3825 15.9626 11.2979 16.1699L10.7389 17.5389C10.6825 17.6771 10.4868 17.6771 10.4303 17.5389L9.8714 16.1699C9.78675 15.9626 9.62222 15.798 9.41489 15.7134L8.0459 15.1545C7.90768 15.098 7.90768 14.9023 8.0459 14.8459L9.41489 14.2869C9.62222 14.2023 9.78675 14.0377 9.8714 13.8304L10.4303 12.4614Z" fill="#7A82F5"></path><path d="M17.3272 3.93897C17.2989 3.86985 17.2011 3.86985 17.1728 3.93897L15.9674 6.89137C15.6288 7.7207 14.9707 8.37884 14.1414 8.71744L11.189 9.92285C11.1199 9.95107 11.1199 10.0489 11.189 10.0772L14.1414 11.2826C14.9707 11.6212 15.6288 12.2793 15.9674 13.1086L17.1728 16.061C17.2011 16.1301 17.2989 16.1301 17.3272 16.061L18.5326 13.1086C18.8712 12.2793 19.5293 11.6212 20.3586 11.2826L23.311 10.0772C23.3801 10.0489 23.3801 9.95107 23.311 9.92285L20.3586 8.71744C19.5293 8.37884 18.8712 7.7207 18.5326 6.89137L17.3272 3.93897Z" fill="#7A82F5" stroke="#7A82F5" stroke-width="0.833333" stroke-miterlimit="3.99933"></path></svg>`;

  const form = document.getElementById("cv-form");
  const preview = document.getElementById("cv-preview-pages");
  const pageCountLabel = document.getElementById("page-count-label");
  const previewCurrentPage = document.getElementById("preview-current-page");
  const previewTotalPages = document.getElementById("preview-total-pages");
  const cloudMode = document.getElementById("cloud-mode");
  const cloudStatus = document.getElementById("cloud-status");
  const loginGoogle = document.getElementById("login-google");
  const logoutGoogle = document.getElementById("logout-google");
  const saveCloud = document.getElementById("save-cloud");
  const savedList = document.getElementById("saved-list");
  const navCloudLabel = document.getElementById("nav-cloud-label");
  const cvScore = document.getElementById("cv-score");
  const cvScoreBar = document.getElementById("cv-score-bar");
  const scoreList = document.getElementById("score-list");
  const scoreFloat = document.getElementById("score-float");
  const mobileScoreFloat = document.getElementById("mobile-score-float");
  const accountMenuButton = document.getElementById("account-menu-button");
  const accountPopover = document.getElementById("account-popover");
  const downloadButton = document.getElementById("print-cv");
  const downloadMenu = document.getElementById("download-menu");
  const mobileDownloadButton = document.getElementById("mobile-download-button");
  const photoFallback = "";
  let activeResumeId = new URLSearchParams(window.location.search).get("resumeId")
    || localStorage.getItem(ACTIVE_RESUME_KEY)
    || DEFAULT_RESUME_ID;
  const initialData = readInitialData();
  const savedState = readLocalResumeState(activeResumeId) || readSavedState();
  let state = hasUsableCvData(savedState?.data) ? savedState : {
    data: normalizeData(initialData),
    photoSrc: photoFallback,
  };
  state.formSectionOrder = normalizeFormSectionOrder(state.formSectionOrder);
  clearLegacyForcedPageBreaks(state.data);
  const cloud = {
    enabled: false,
    ready: false,
    user: null,
    activeCvId: null,
    modules: null,
    auth: null,
    db: null,
    provider: null,
    unsubscribe: null,
    savedDocs: new Map(),
  };
  const expandedSections = new Set(["personal", "profile", "experience", "education", "awards", "areas", "websites", "cover", "add-sections", "cloud"]);
  const expandedItems = new Set();
  let draggedItem = null;
  let pointerDrag = null;
  let sectionDrag = null;
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
      title: "Education",
      description: "Si procede, incluye aquí tus logros académicos más recientes y las fechas",
      add: "Añade una formación",
      emptyTitle: "Añade tu formación",
      emptyText: "Incluye titulaciones, centros, fechas y notas si aportan valor.",
    },
    awards: {
      title: "RECONOCIMIENTOS, PREMIOS E HITOS",
      toggleLabel: "Sin título",
      description: "",
      add: "Añade un elemento",
      emptyTitle: "Añade premios o hitos",
      emptyText: "Incluye reconocimientos, certificaciones, idiomas o logros relevantes.",
    },
  };

  function readInitialData() {
    const script = document.getElementById("initial-cv-data");
    try {
      return JSON.parse(script.textContent || "{}");
    } catch (error) {
      console.error("No se pudo leer el JSON inicial", error);
      return {};
    }
  }

  function clearLegacyForcedPageBreaks(data) {
    const awards = Array.isArray(data?.awards) ? data.awards : [];
    awards.forEach((item) => {
      if (item.title === "Entrepreneurship World Cup (EWC) - Preseleccionado") {
        item.page_break_before = false;
      }
    });
  }

  function readSavedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return {
        data: normalizeData(parsed.data || {}),
        photoSrc: parsed.photoSrc || photoFallback,
        formSectionOrder: normalizeFormSectionOrder(parsed.formSectionOrder),
      };
    } catch (error) {
      console.warn("No se pudo restaurar el borrador guardado", error);
      return null;
    }
  }

  function readResumeCollection() {
    try {
      const saved = localStorage.getItem(RESUME_COLLECTION_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("No se pudo leer el listado local de CVs", error);
      return [];
    }
  }

  function writeResumeCollection(documents) {
    localStorage.setItem(RESUME_COLLECTION_KEY, JSON.stringify(documents));
  }

  function readLocalResumeState(resumeId) {
    if (!resumeId) return null;
    const document = readResumeCollection().find((entry) => entry.id === resumeId);
    const saved = document?.state;
    if (!saved?.data) return null;
    return {
      data: normalizeData(saved.data),
      photoSrc: saved.photoSrc || photoFallback,
      formSectionOrder: normalizeFormSectionOrder(saved.formSectionOrder),
    };
  }

  function hasUsableCvData(data) {
    return Boolean(data && (
      data.name ||
      data.title ||
      data.email ||
      data.phone ||
      data.experience?.length ||
      data.education?.length ||
      data.awards?.length
    ));
  }

  function normalizeFormSectionOrder(order) {
    const known = new Set(DEFAULT_FORM_SECTION_ORDER);
    const normalized = Array.isArray(order)
      ? order.filter((panel, index, list) => known.has(panel) && list.indexOf(panel) === index)
      : [];
    return [
      ...normalized,
      ...DEFAULT_FORM_SECTION_ORDER.filter((panel) => !normalized.includes(panel)),
    ];
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    syncLocalResumeDocument();
  }

  function syncLocalResumeDocument() {
    if (!activeResumeId) activeResumeId = DEFAULT_RESUME_ID;
    const documents = readResumeCollection();
    const currentIndex = documents.findIndex((entry) => entry.id === activeResumeId);
    const existing = currentIndex >= 0 ? documents[currentIndex] : {};
    const entry = {
      id: activeResumeId,
      kind: "resume",
      title: existing.title || "CV ESPAÑOL",
      language: existing.language || "Español",
      score: existing.score || 66,
      updatedAt: new Date().toISOString(),
      state,
    };

    if (currentIndex >= 0) documents[currentIndex] = { ...documents[currentIndex], ...entry };
    else documents.unshift(entry);

    localStorage.setItem(ACTIVE_RESUME_KEY, activeResumeId);
    writeResumeCollection(documents);
  }

  function setCloudStatus(message, mode = "Modo local") {
    cloudStatus.textContent = message;
    cloudMode.textContent = mode;
    navCloudLabel.textContent = mode;
  }

  function showToast(message) {
    let toast = document.getElementById("builder-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "builder-toast";
      toast.className = "builder-toast";
      toast.setAttribute("role", "status");
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  function firebaseConfig() {
    const settings = window.CV_FIREBASE_CONFIG;
    if (!settings || settings.enabled !== true) return null;
    return settings.firebaseConfig || settings;
  }

  function hasFirebaseConfig(config) {
    return Boolean(config?.apiKey && config?.authDomain && config?.projectId && config?.appId);
  }

  function cvLabel(data) {
    const name = compactSpaces(data.name);
    const title = compactSpaces(data.title);
    if (name && title) return `${name} - ${title}`;
    return name || title || "CV sin título";
  }

  async function loadFirebaseModules() {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
    const [app, auth, firestore] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-auth.js`),
      import(`${base}/firebase-firestore.js`),
    ]);
    return { app, auth, firestore };
  }

  async function initCloud() {
    const config = firebaseConfig();
    if (!hasFirebaseConfig(config)) {
      loginGoogle.disabled = true;
      saveCloud.disabled = true;
      savedList.innerHTML = "";
      setCloudStatus("Configura Firebase para activar login y guardado por usuario.");
      return;
    }

    try {
      cloud.modules = await loadFirebaseModules();
      const app = cloud.modules.app.initializeApp(config);
      cloud.auth = cloud.modules.auth.getAuth(app);
      cloud.db = cloud.modules.firestore.getFirestore(app);
      cloud.provider = new cloud.modules.auth.GoogleAuthProvider();
      await cloud.modules.auth.setPersistence(cloud.auth, cloud.modules.auth.browserLocalPersistence);
      cloud.enabled = true;
      loginGoogle.disabled = false;
      setCloudStatus("Firebase configurado. Inicia sesión con Google para guardar tus CVs.", "Firebase");
      cloud.modules.auth.onAuthStateChanged(cloud.auth, handleAuthState);
    } catch (error) {
      console.error("No se pudo iniciar Firebase", error);
      loginGoogle.disabled = true;
      saveCloud.disabled = true;
      setCloudStatus("No se pudo cargar Firebase. Revisa assets/firebase-config.js y la conexión.");
    }
  }

  function handleAuthState(user) {
    cloud.user = user;
    cloud.activeCvId = null;

    if (cloud.unsubscribe) {
      cloud.unsubscribe();
      cloud.unsubscribe = null;
    }

    if (!user) {
      loginGoogle.hidden = false;
      logoutGoogle.hidden = true;
      saveCloud.disabled = true;
      savedList.innerHTML = "";
      setCloudStatus("Firebase listo. Entra con Google para ver y guardar tus CVs.", "Firebase");
      return;
    }

    loginGoogle.hidden = true;
    logoutGoogle.hidden = false;
    saveCloud.disabled = false;
    setCloudStatus(`Sesion iniciada: ${user.email || user.displayName || user.uid}`, "Conectado");
    subscribeToSavedCvs();
  }

  function subscribeToSavedCvs() {
    const { collection, limit, onSnapshot, orderBy, query } = cloud.modules.firestore;
    const cvsRef = collection(cloud.db, "users", cloud.user.uid, "cvs");
    const cvsQuery = query(cvsRef, orderBy("updatedAt", "desc"), limit(20));

    cloud.unsubscribe = onSnapshot(cvsQuery, (snapshot) => {
      cloud.savedDocs.clear();
      snapshot.docs.forEach((docSnap) => cloud.savedDocs.set(docSnap.id, docSnap.data()));
      renderSavedList();
    }, (error) => {
      console.error("No se pudieron leer los CVs guardados", error);
      savedList.innerHTML = `<p class="saved-empty">No se pudieron cargar tus CVs. Revisa las reglas de Firestore.</p>`;
    });
  }

  function renderSavedList() {
    if (!cloud.user) {
      savedList.innerHTML = "";
      return;
    }

    if (!cloud.savedDocs.size) {
      savedList.innerHTML = `<p class="saved-empty">Aún no tienes CVs guardados en esta cuenta.</p>`;
      return;
    }

    const items = Array.from(cloud.savedDocs.entries()).map(([id, doc]) => {
      const title = doc.title || cvLabel(doc.data || {});
      const updated = formatSavedDate(doc.updatedAt);
      const active = id === cloud.activeCvId ? " CV activo" : "";
      return `
        <article class="saved-cv${active ? " is-active" : ""}">
          <div>
            <strong>${esc(title)}</strong>
            <span>${esc(updated)}${esc(active)}</span>
          </div>
          <div class="saved-actions">
            <button class="item-btn" type="button" data-cloud-action="load" data-cv-id="${esc(id)}">Cargar</button>
            <button class="item-btn danger" type="button" data-cloud-action="delete" data-cv-id="${esc(id)}">Borrar</button>
          </div>
        </article>
      `;
    });
    savedList.innerHTML = items.join("");
  }

  function formatSavedDate(value) {
    if (!value) return "Sin fecha";
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin fecha";
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  async function saveToCloud() {
    if (!cloud.user) {
      setCloudStatus("Inicia sesión con Google antes de guardar.", "Firebase");
      return;
    }

    const { addDoc, collection, doc, serverTimestamp, setDoc } = cloud.modules.firestore;
    const payload = {
      title: cvLabel(state.data),
      data: cleanDataForDownload(state.data),
      photoSrc: state.photoSrc || "",
      updatedAt: serverTimestamp(),
      ownerUid: cloud.user.uid,
    };

    saveCloud.disabled = true;
    try {
      if (cloud.activeCvId) {
        await setDoc(doc(cloud.db, "users", cloud.user.uid, "cvs", cloud.activeCvId), payload, { merge: true });
      } else {
        const created = await addDoc(collection(cloud.db, "users", cloud.user.uid, "cvs"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        cloud.activeCvId = created.id;
      }
      setCloudStatus("CV guardado en tu cuenta.", "Guardado");
      renderSavedList();
    } catch (error) {
      console.error("No se pudo guardar el CV", error);
      setCloudStatus("No se pudo guardar. Revisa Firestore y las reglas de seguridad.", "Error");
    } finally {
      saveCloud.disabled = false;
    }
  }

  function loadCloudCv(id) {
    const doc = cloud.savedDocs.get(id);
    if (!doc) return;
    state.data = normalizeData(doc.data || {});
    state.photoSrc = doc.photoSrc || "";
    cloud.activeCvId = id;
    renderForm();
    updatePreview();
    renderSavedList();
    setCloudStatus("CV cargado desde tu cuenta.", "Conectado");
  }

  async function deleteCloudCv(id) {
    if (!cloud.user || !confirm("Quieres borrar este CV guardado?")) return;
    const { deleteDoc, doc } = cloud.modules.firestore;
    try {
      await deleteDoc(doc(cloud.db, "users", cloud.user.uid, "cvs", id));
      if (cloud.activeCvId === id) cloud.activeCvId = null;
      setCloudStatus("CV borrado.", "Conectado");
    } catch (error) {
      console.error("No se pudo borrar el CV", error);
      setCloudStatus("No se pudo borrar el CV.", "Error");
    }
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

  function normalizeItem(item = {}) {
    return {
      date: compactSpaces(item.date),
      title: compactSpaces(item.title),
      meta: item.meta ? compactSpaces(item.meta) : null,
      bullets: Array.isArray(item.bullets)
        ? item.bullets.map(compactSpaces).filter(Boolean)
        : [],
      page_break_before: Boolean(item.page_break_before),
    };
  }

  function normalizeData(data = {}) {
    const normalized = {
      name: compactSpaces(data.name),
      title: compactSpaces(data.title),
      email: compactSpaces(data.email),
      phone: compactSpaces(data.phone),
      linkedin: compactSpaces(data.linkedin),
      postalCode: compactSpaces(data.postalCode),
      city: compactSpaces(data.city),
      country: compactSpaces(data.country),
    };

    SECTION_KEYS.forEach((section) => {
      normalized[section] = Array.isArray(data[section])
        ? data[section].map(normalizeItem)
        : [];
    });

    return normalized;
  }

  function cleanDataForDownload(data) {
    const clean = normalizeData(data);
    SECTION_KEYS.forEach((section) => {
      clean[section] = clean[section].map((item) => {
        const output = {
          date: item.date,
          title: item.title,
          meta: item.meta || null,
          bullets: item.bullets,
        };
        if (item.page_break_before) output.page_break_before = true;
        return output;
      });
    });
    return clean;
  }

  function orderedCvSections() {
    const definitions = new Map(SECTION_DEFINITIONS.map((definition) => [definition[0], definition]));
    return state.formSectionOrder
      .filter((panel) => definitions.has(panel))
      .map((panel) => definitions.get(panel));
  }

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

  function renderInline(value) {
    const text = String(value || "");
    const urlRe = /((?:https?:\/\/)?(?:www\.)?(?:bit\.ly|[\w.-]+\.\w{2,})\/[^\s)]+)/g;
    return esc(text).replace(urlRe, (rawUrl) => {
      let urlText = rawUrl;
      let trailing = "";
      while (/[.,;:]$/.test(urlText)) {
        trailing = urlText.slice(-1) + trailing;
        urlText = urlText.slice(0, -1);
      }
      const href = /^https?:\/\//.test(urlText) ? urlText : `https://${urlText}`;
      return `<a href="${esc(href)}">${esc(urlText)}</a>${esc(trailing)}`;
    });
  }

  function renderContact(data) {
    const parts = [];
    if (data.phone) {
      const tel = data.phone.replace(/(?!^)[^\d]/g, "");
      parts.push(`<a href="tel:${esc(tel)}">${esc(data.phone)}</a>`);
    }
    if (data.email) {
      parts.push(`<a href="mailto:${esc(data.email)}">${esc(data.email)}</a>`);
    }
    return parts.join(", ");
  }

  function wrappedLineCount(value, charsPerLine) {
    const text = compactSpaces(value);
    return text ? Math.max(1, Math.ceil(text.length / charsPerLine)) : 1;
  }

  function estimateItemHeight(item) {
    const titleLines = wrappedLineCount(`${item.title || ""} ${item.meta || ""}`, 62);
    const bulletLines = item.bullets.reduce((sum, bullet) => sum + wrappedLineCount(bullet, 78), 0);
    const bulletCount = item.bullets.length;
    const textHeight = titleLines * 16 + bulletLines * 14 + bulletCount;
    const bulletGap = bulletCount ? 4 : 0;
    return Math.max(32, textHeight + bulletGap + 12);
  }

  function pageBodyLimit(pageNumber) {
    return pageNumber === 1 ? FIRST_PAGE_BODY_LIMIT : FOLLOWING_PAGE_BODY_LIMIT;
  }

  function pageBaseCost(pageNumber) {
    return pageNumber === 1 ? FIRST_PAGE_HEADER_COST : 0;
  }

  function paginateAuto(data) {
    const paginated = {
      name: data.name,
      title: data.title,
      email: data.email,
      phone: data.phone,
    };
    let currentPage = 1;
    let used = pageBaseCost(currentPage);

    orderedCvSections().forEach(([section]) => {
      const paginatedItems = [];
      let sectionStarted = false;

      data[section].forEach((item) => {
        const pageItem = { ...item };
        let base = pageBaseCost(currentPage);

        if (pageItem.page_break_before && used > base) {
          currentPage += 1;
          used = pageBaseCost(currentPage);
          base = used;
        }

        let headingCost = sectionStarted ? 0 : SECTION_HEADING_COST;
        let boundaryCost = 0;
        if (headingCost && used > base) boundaryCost = SECTION_BOUNDARY_COST;

        const itemCost = estimateItemHeight(pageItem);
        let totalCost = boundaryCost + headingCost + itemCost;

        if (used + totalCost > pageBodyLimit(currentPage) && used > base) {
          currentPage += 1;
          used = pageBaseCost(currentPage);
          base = used;
          headingCost = sectionStarted ? 0 : SECTION_HEADING_COST;
          boundaryCost = 0;
          totalCost = headingCost + itemCost;
        }

        pageItem.page = currentPage;
        paginatedItems.push(pageItem);
        used += totalCost;
        sectionStarted = true;
      });

      paginated[section] = paginatedItems;
    });

    paginated.page_count = Math.max(1, currentPage);
    return paginated;
  }

  function renderItems(items, section) {
    return items.map((item) => {
      const bullets = item.bullets.length
        ? `<ul>${item.bullets.map((bullet) => `<li>${renderInline(bullet)}</li>`).join("")}</ul>`
        : "";
      const meta = item.meta ? ` <span class="meta">${esc(item.meta)}</span>` : "";
      const classes = ["cv-item", `cv-item--${section}`];
      if (bullets) classes.push("cv-item--with-bullets");

      return `
        <article class="${classes.join(" ")}">
          <time>${esc(formatDate(item.date))}</time>
          <div class="item-body">
            <h3>${esc(item.title)}${meta}</h3>
            ${bullets}
          </div>
        </article>
      `;
    }).join("");
  }

  function renderSection(data, section, title, pageNumber) {
    const items = data[section] || [];
    const pageItems = items.filter((item) => (item.page || 1) === pageNumber);
    if (!pageItems.length) return "";
    const firstPage = Math.min(...items.map((item) => item.page || 1));
    const heading = pageNumber === firstPage ? `<h2 class="section-title">${esc(title)}</h2>` : "";
    const continuation = pageNumber !== firstPage ? " cv-section--continued" : "";

    return `
      <section class="cv-section${continuation}">
        ${heading}
        ${renderItems(pageItems, section)}
      </section>
    `;
  }

  function renderPages(data) {
    const paginated = paginateAuto(normalizeData(data));
    const displayName = paginated.name || "Nombre Apellidos";
    const displayTitle = paginated.title || "Puesto laboral";
    const title = displayTitle ? `${displayName}, ${displayTitle}` : displayName;
    const photo = state.photoSrc
      ? `<img class="profile-photo" src="${esc(state.photoSrc)}" alt="Foto de ${esc(displayName)}" />`
      : "";

    let html = "";
    for (let pageNumber = 1; pageNumber <= paginated.page_count; pageNumber += 1) {
      const header = pageNumber === 1
        ? `
          <header class="cv-header">
            <div>
              <h1>${esc(title)}</h1>
              <p class="contact">${renderContact(paginated)}</p>
            </div>
            ${photo}
          </header>
        `
        : "";

      html += `
        <article class="cv-page" aria-label="Página ${pageNumber} del currículum de ${esc(displayName)}">
          ${header}
          ${orderedCvSections().map(([section, sectionTitle]) => renderSection(paginated, section, sectionTitle, pageNumber)).join("")}
        </article>
      `;
    }

    pageCountLabel.textContent = `${paginated.page_count} ${paginated.page_count === 1 ? "página" : "páginas"}`;
    return html;
  }

  function renderForm() {
    const person = splitPersonName(state.data.name);
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
            ${renderField("Puesto laboral", "title", state.data.title, "text", "Ingeniero Informático, Docente")}
            <div class="field photo-field">
              <label for="photo-input">Foto</label>
              <div class="photo-row">
                ${state.photoSrc
                  ? `<img class="photo-preview" id="photo-preview" src="${esc(state.photoSrc)}" alt="" />`
                  : `<span class="photo-placeholder" aria-hidden="true">◌</span>`}
                <div class="photo-controls">
                  <span>Esta plantilla no admite foto</span>
                  <label class="item-btn file-btn" for="photo-input">Subir foto</label>
                  <input class="visually-hidden" type="file" id="photo-input" accept="image/*" />
                  <button class="item-btn" type="button" data-action="clear-photo">Quitar foto</button>
                </div>
              </div>
            </div>
            ${renderField("Nombre", "firstName", person.firstName, "text", "Diego")}
            ${renderField("Apellidos", "lastName", person.lastName, "text", "Ayala Bernal")}
            ${renderField("Email", "email", state.data.email, "email", "correo@ejemplo.com")}
            ${renderField("Teléfono", "phone", state.data.phone, "text", "+34 600 000 000")}
            ${renderField("LinkedIn URL", "linkedin", state.data.linkedin, "text", "linkedin.com/in/yourprofile")}
            ${renderField("Código postal", "postalCode", state.data.postalCode)}
            ${renderField("Ciudad", "city", state.data.city)}
            ${renderField("País", "country", state.data.country, "text", "", "", "For users outside the US")}
          </div>
          <button class="details-link" type="button" data-action="toggle-personal-extra" aria-expanded="${expandedSections.has("personal-extra")}">
            ${expandedSections.has("personal-extra") ? "Ocultar detalles adicionales" : "Mostrar detalles adicionales"} ⌄
          </button>
          <div class="extra-details-panel" ${expandedSections.has("personal-extra") ? "" : "hidden"}>
            <p>Campos adicionales listos para la versión completa: dirección, nacionalidad, permiso de conducir y fecha de nacimiento.</p>
          </div>
        </div>
      </section>
      ${state.formSectionOrder.map(renderSortableSectionPanel).join("")}
      ${renderStaticExtraPanels()}
    `;
    updateSectionNav();
  }

  function renderSortableSectionPanel(panel) {
    if (panel === "powerStatement") return renderRichSection("Propuesta de valor", "", true, "", "powerStatement");
    if (panel === "profile") return renderRichSection("Perfil profesional", "Añade dos o tres frases sobre tu experiencia general.", false, "+15%", "profile");
    if (panel === "achievements") return renderRichSection("Logros", "", true, "", "achievements");
    if (panel === "areas") return renderAreasPanel();
    if (panel === "websites") return renderWebsitesPanel();
    const definition = SECTION_DEFINITIONS.find(([section]) => section === panel);
    if (definition) return renderSectionForm(definition[0], definition[2]);
    return "";
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

  function renderRichSection(title, description = "", locked = false, badge = "", panel = title.toLowerCase().replace(/\s+/g, "-")) {
    const isExpanded = expandedSections.has(panel);
    return `
      <section class="form-card rich-card" data-section-panel="${esc(panel)}" data-sortable-section data-panel="${esc(panel)}">
        ${renderSectionDragHandle(panel)}
        <button class="section-head section-toggle" type="button" data-action="toggle-section" data-panel="${esc(panel)}" aria-expanded="${isExpanded}">
          <div>
            <h2>${esc(title)}${locked ? ' <span class="lock-icon" aria-label="bloqueado"></span>' : ""}${badge ? ` <span class="completion-pill">${esc(badge)}</span>` : ""}</h2>
            ${description ? `<p class="card-kicker">${esc(description)}</p>` : ""}
          </div>
          <span class="chevron">⌄</span>
        </button>
        <div class="section-content" ${isExpanded ? "" : "hidden"}>
          <div class="rich-area ${title === "Logros" ? "" : "small"}">
            <div class="rich-toolbar" aria-hidden="true">
              <span>B</span><span>I</span><span>U</span><span>S</span><span class="divider"></span><span>1.</span><span>•</span><span class="divider"></span><span>↗</span>
            </div>
            ${locked ? "" : '<p>p. e. profesor/a de ciencias apasionado/a por su profesión con más de 8 años de experiencia y una trayectoria...</p>'}
          </div>
          ${locked ? "" : `
            <div class="rich-footer">
              <span>Consejo de los seleccionadores: escribe más de 400-600 caracteres para incrementar las posibilidades de una entrevista</span>
              <strong>0 / 400+</strong>
            </div>
            <button class="ai-pill" type="button" data-action="writer-help">Obtener ayuda con la escritura</button>
          `}
        </div>
      </section>
    `;
  }

  function splitTitleParts(value) {
    const title = compactSpaces(value);
    const commaIndex = title.lastIndexOf(",");
    if (commaIndex === -1) return { prefix: title, suffix: "" };
    return {
      prefix: compactSpaces(title.slice(0, commaIndex)),
      suffix: compactSpaces(title.slice(commaIndex + 1)),
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
    const cleanPrefix = compactSpaces(prefix);
    const cleanSuffix = compactSpaces(suffix);
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
          <input id="${prefix}-date-end" value="${esc(formatDateInputValue(dates.end))}" placeholder="MM / AAAA" data-section="${esc(section)}" data-index="${index}" data-item-field="date_end" />
        </div>
      </div>
    `;
  }

  function renderDescriptionInput(prefix, section, index, bullets) {
    return `
      <div class="field full rich-field">
        <label for="${prefix}-bullets">Descripción</label>
        <div class="rich-input-shell">
          <div class="rich-toolbar" aria-hidden="true">
            <span>B</span><span>I</span><span>U</span><span>S</span><span class="divider"></span><span>1.</span><span>•</span><span class="divider"></span><span>↗</span><span>A</span>
          </div>
          <textarea id="${prefix}-bullets" placeholder="${esc(sectionFieldCopy(section).descriptionPlaceholder)}" data-section="${esc(section)}" data-index="${index}" data-item-field="bullets">${esc(bullets.join("\n"))}</textarea>
        </div>
      </div>
    `;
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
          ${items.length ? `<button class="open-all-pill" type="button" data-action="toggle-all-items" data-section="${esc(section)}">${isAllExpanded ? `Cierra todos los ${esc(copy.toggleLabel || copy.title)}` : `Abre todo ${esc(copy.toggleLabel || copy.title)}`} <span aria-hidden="true">${isAllExpanded ? "⌃" : "⌄"}</span></button>` : ""}
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

  function renderItemForm(section, item, index) {
    const prefix = `${section}-${index}`;
    const itemKey = `${section}:${index}`;
    const isExpanded = expandedItems.has(itemKey);
    const title = itemTitleForForm(section, item.title) || "Nueva entrada";
    const date = item.date || "Sin fecha";
    if (!isExpanded) {
      return `
        <article class="entry-card is-compact" data-draggable-item data-section="${esc(section)}" data-index="${index}">
          ${renderDragHandle(section, index)}
          <button class="entry-menu-button" type="button" data-action="noop" data-message="Opciones del elemento." aria-label="Más opciones"></button>
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
            ${renderDescriptionInput(prefix, section, index, item.bullets)}
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

  function renderAreasPanel() {
    const areasOpen = expandedSections.has("areas");
    return `
      <section class="form-card editor-section-card" data-section-panel="areas" data-sortable-section data-panel="areas">
        ${renderSectionDragHandle("areas")}
        <button class="section-head section-toggle" type="button" data-action="toggle-section" data-panel="areas" aria-expanded="${areasOpen}">
          <div>
            <h2>Áreas de Especialización <span class="completion-pill">+4%</span></h2>
            <p class="section-note">Elige 5 habilidades importantes que demuestren que encajas en el puesto y asegúrate de que coinciden con las competencias clave mencionadas en el anuncio de empleo.</p>
          </div>
          <span class="chevron">⌄</span>
        </button>
        <div class="section-content" ${areasOpen ? "" : "hidden"}>
          <button class="add-wide-btn" type="button" data-action="noop" data-message="La edición de competencias se añadirá como sección propia.">+ Añadir competencia</button>
        </div>
      </section>
    `;
  }

  function renderWebsitesPanel() {
    const websitesOpen = expandedSections.has("websites");
    return `
      <section class="form-card editor-section-card" data-section-panel="websites" data-sortable-section data-panel="websites">
        ${renderSectionDragHandle("websites")}
        <button class="section-head section-toggle" type="button" data-action="toggle-section" data-panel="websites" aria-expanded="${websitesOpen}">
          <div>
            <h2>Websites & Social Links <span class="edit-mark" aria-hidden="true">✎</span></h2>
            <p class="section-note">Ahora puedes añadir enlaces a los sitios que quieras que vean los empleadores. Puede ser un enlace a tu portfolio, a tu perfil de LinkedIn o a tu sitio web personal.</p>
          </div>
          <span class="chevron">⌄</span>
        </button>
        <div class="section-content" ${websitesOpen ? "" : "hidden"}>
          <article class="entry-card is-compact">
            <button class="entry-summary" type="button" data-action="noop" data-message="La edición de enlaces estará disponible cuando se active esta sección.">
              <span><span class="entry-title">(Sin especificar)</span></span>
              <span class="entry-chevron" aria-hidden="true">⌄</span>
            </button>
          </article>
          <button class="add-wide-btn" type="button" data-action="noop" data-message="La edición de enlaces estará disponible cuando se active esta sección.">+ Añade un enlace</button>
        </div>
      </section>
    `;
  }

  function renderStaticExtraPanels() {
    const addSectionsOpen = expandedSections.has("add-sections");
    return `
      <section class="form-card cover-section-card" data-section-panel="cover" aria-label="Carta de presentación">
        <div class="cover-card">
          <div>
            <div class="cover-title-row">
              <span>Carta de presentación</span>
              <span class="ai-badge">Impulsado por IA</span>
            </div>
            <p>Genera una carta de presentación en un clic con nuestra herramienta de IA. ¡Esto podría aumentar tus posibilidades de ser contratado!</p>
          </div>
          <button type="button" data-action="generate-cover">✦ Generar</button>
        </div>
      </section>

      <section class="form-card add-section-panel" data-section-panel="add-sections">
        <button class="section-head section-toggle" type="button" data-action="toggle-section" data-panel="add-sections" aria-expanded="${addSectionsOpen}">
          <div>
            <h2>Añadir sección</h2>
          </div>
          <span class="chevron">⌄</span>
        </button>
        <div class="add-section-grid section-content" ${addSectionsOpen ? "" : "hidden"}>
          ${renderSectionOption("Sección personalizada")}
          ${renderSectionOption("Encabezado y Pie de página", true)}
          ${renderSectionOption("Formación Profesional")}
          ${renderSectionOption("Extracurricular Activities")}
          ${renderSectionOption("Experiencia Adicional")}
          ${renderSectionOption("Conferences", true)}
          ${renderSectionOption("Volunteering", true)}
          ${renderSectionOption("Hobbies")}
          ${renderSectionOption("Idiomas")}
          ${renderSectionOption("Referencias")}
          ${renderSectionOption("Propuesta de valor", true)}
          ${renderSectionOption("Premios", true)}
          ${renderSectionOption("Afiliaciones", true)}
          ${renderSectionOption("Licencias y Certificaciones", true)}
        </div>
      </section>
    `;
  }

  function sectionOptionType(label) {
    const normalized = label.toLowerCase();
    if (normalized.includes("personalizada")) return "custom";
    if (normalized.includes("encabezado")) return "document";
    if (normalized.includes("formación")) return "certificate";
    if (normalized.includes("extracurricular")) return "plant";
    if (normalized.includes("experiencia")) return "briefcase";
    if (normalized.includes("conferences") || normalized.includes("referencias")) return "megaphone";
    if (normalized.includes("volunteering")) return "volunteer";
    if (normalized.includes("hobbies")) return "rook";
    if (normalized.includes("idiomas")) return "language";
    if (normalized.includes("valor")) return "value";
    if (normalized.includes("premios")) return "diamond";
    if (normalized.includes("afiliaciones")) return "building";
    if (normalized.includes("licencias")) return "license";
    return "document";
  }

  function renderSectionOption(label, locked = false) {
    const type = sectionOptionType(label);
    return `
      <div
        class="section-option"
        role="button"
        tabindex="0"
        aria-disabled="${locked ? "true" : "false"}"
        data-section-option="${esc(label)}"
        data-locked="${locked ? "true" : "false"}"
      >
        <span class="section-option-icon section-option-icon--${esc(type)}" aria-hidden="true"></span>
        <span>${esc(label)}${locked ? ' <span class="lock-icon" aria-label="bloqueado"></span>' : ""}</span>
      </div>
    `;
  }

  function updateFromControl(control) {
    const field = control.dataset.field;
    if (field) {
      if (field === "firstName" || field === "lastName") {
        const person = splitPersonName(state.data.name);
        if (field === "firstName") person.firstName = control.value;
        if (field === "lastName") person.lastName = control.value;
        state.data.name = joinPersonName(person.firstName, person.lastName);
        return;
      }
      state.data[field] = compactSpaces(control.value);
      return;
    }

    const section = control.dataset.section;
    const index = Number(control.dataset.index);
    const itemField = control.dataset.itemField;
    if (!section || Number.isNaN(index) || !itemField) return;

    const item = state.data[section][index];
    if (!item) return;

    if (itemField === "bullets") {
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
    } else if (itemField === "meta") {
      item.meta = compactSpaces(control.value) || null;
    } else {
      item[itemField] = compactSpaces(control.value);
    }
  }

  function updatePreview() {
    preview.innerHTML = renderPages(state.data);
    updateSectionNav();
    updateScoreCard();
    updatePreviewPageControls();
    persist();
  }

  function updatePreviewPageControls() {
    const pageCount = preview.querySelectorAll(".cv-page").length || 1;
    if (pageCountLabel) pageCountLabel.textContent = `${pageCount} ${pageCount === 1 ? "página" : "páginas"}`;
    if (previewCurrentPage) previewCurrentPage.textContent = "1";
    if (previewTotalPages) previewTotalPages.textContent = String(pageCount);
  }

  function updateSectionNav() {
    SECTION_KEYS.forEach((section) => {
      const label = document.getElementById(`nav-count-${section}`);
      if (!label) return;
      const count = state.data[section]?.length || 0;
      label.textContent = `${count} ${count === 1 ? "entrada" : "entradas"}`;
    });
  }

  function updateScoreCard() {
    const score = 66;
    const suggestions = [
      { done: false, badge: "✦", label: "Escribe tu perfil profesional", highlight: true },
      { done: false, badge: "✦", label: "Crear una carta de presentación rápida", highlight: true },
      { done: false, badge: "+15", label: "Añadir perfil profesional" },
      { done: false, badge: "+4", label: "Añadir competencias" },
      { done: false, badge: "+3", label: "Añadir idiomas" },
      { done: Boolean(state.data.country), badge: "+2", label: "Añadir un nombre de país" },
      { done: Boolean(state.data.city), badge: "+2", label: "Agregar un nombre de ciudad" },
      { done: false, badge: "+2", label: "Añadir prácticas" },
    ];

    cvScore.textContent = String(score);
    scoreFloat.textContent = `${score}%`;
    if (mobileScoreFloat) mobileScoreFloat.textContent = "%";
    cvScoreBar.style.width = `${score}%`;
    scoreList.innerHTML = suggestions.map((suggestion) => `
      <li class="${suggestion.done ? "is-done" : ""}${suggestion.highlight ? " is-ai" : ""}">
        ${renderScoreBadge(suggestion)}
        ${esc(suggestion.label)}
      </li>
    `).join("");
  }

  function renderScoreBadge(suggestion) {
    if (suggestion.highlight && !suggestion.done) {
      return `<span class="score-ai-icon">${AI_SCORE_ICON}</span>`;
    }
    return `<span>${esc(suggestion.done ? "✓" : suggestion.badge)}</span>`;
  }

  function handleSectionOption(option) {
    const label = option.dataset.sectionOption || "Sección";
    if (option.dataset.locked === "true") {
      showToast(`${label}: sección bloqueada en esta plantilla.`);
      return;
    }
    showToast(`${label}: sección preparada para añadirse en una versión ampliada.`);
  }

  function resetActiveCloudCv() {
    cloud.activeCvId = null;
    renderSavedList();
  }

  function addItem(section) {
    const nextIndex = state.data[section].length;
    const defaults = {
      experience: {
        date: "Ene 2026 - Presente",
        title: "Nuevo puesto, Empresa",
        bullets: ["Describe aquí el primer logro o responsabilidad."],
      },
      education: {
        date: "Ene 2026 - Jun 2026",
        title: "Nueva formación, Entidad",
        bullets: [],
      },
      awards: {
        date: "Ene 2026",
        title: "Nuevo reconocimiento o hito",
        bullets: ["Describe aquí el reconocimiento, premio o hito."],
      },
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

  function resumeText() {
    const data = cleanDataForDownload(state.data);
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

  function downloadFileBaseName() {
    return (cvLabel(state.data) || "CV ESPAÑOL")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .slice(0, 80);
  }

  function collectCssText() {
    const chunks = [];
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        Array.from(sheet.cssRules || []).forEach((rule) => chunks.push(rule.cssText));
      } catch (error) {
        // File-based browsers may block stylesheet introspection; keep a linked fallback.
      }
    });
    return chunks.join("\n");
  }

  function exportHtml() {
    const cssText = collectCssText();
    const stylesheet = cssText
      ? `<style>${cssText}</style>`
      : '<link rel="stylesheet" href="./assets/cv-builder.css" />';
    return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(state.data.name)} | CV</title>
    ${stylesheet}
  </head>
  <body>
    <main class="cv-preview-pages">
      ${preview.innerHTML}
    </main>
  </body>
</html>
`;
  }

  form.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) return;
    if (event.target.type === "file") return;
    updateFromControl(event.target);
    updatePreview();
  });

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
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
        alert("No se pudo cargar la foto.");
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

    if (action === "add-item" && section) {
      addItem(section);
      expandedSections.add(section);
    } else if (action === "remove-item" && section && !Number.isNaN(index)) {
      state.data[section].splice(index, 1);
      expandedItems.clear();
    } else if (action === "move-item" && section && !Number.isNaN(index)) {
      moveItem(section, index, button.dataset.direction);
      expandedItems.clear();
    } else if (action === "toggle-all-items" && section) {
      toggleAllItems(section);
    } else if (action === "clear-photo") {
      state.photoSrc = "";
    } else if (action === "toggle-section") {
      const panel = button.dataset.panel;
      if (!panel) return;
      if (expandedSections.has(panel)) expandedSections.delete(panel);
      else expandedSections.add(panel);
    } else if (action === "toggle-item" && section && !Number.isNaN(index)) {
      const key = `${section}:${index}`;
      if (expandedItems.has(key)) expandedItems.delete(key);
      else expandedItems.add(key);
    } else if (action === "toggle-personal-extra") {
      if (expandedSections.has("personal-extra")) expandedSections.delete("personal-extra");
      else expandedSections.add("personal-extra");
    } else if (action === "writer-help") {
      showToast("Sugerencia IA: resume impacto, tecnologías y métricas en 2-3 frases.");
      return;
    } else if (action === "generate-cover") {
      showToast("Carta generada como borrador: adapta empresa, puesto y logros clave antes de enviarla.");
      return;
    } else if (action === "noop") {
      showToast(button.dataset.message || "Esta acción está preparada para una versión ampliada.");
      return;
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
    if (event.key !== "Escape" || (!pointerDrag && !sectionDrag)) return;
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

  function requestPrint() {
    showToast("Abriendo la impresión para descargar el CV como PDF.");
    window.setTimeout(() => window.print(), 80);
  }

  function setDownloadMenu(open) {
    if (!downloadButton || !downloadMenu) return;
    downloadMenu.hidden = !open;
    downloadButton.classList.toggle("is-open", open);
    downloadButton.setAttribute("aria-expanded", String(open));
  }

  function toggleDownloadMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    setDownloadMenu(Boolean(downloadMenu?.hidden));
  }

  function downloadDocx() {
    const body = resumeText().split("\n").map((line) => `<p>${esc(line) || "&nbsp;"}</p>`).join("");
    downloadFile(`${downloadFileBaseName()}.doc`, `<!doctype html><html><meta charset="utf-8"><body>${body}</body></html>`, "application/msword;charset=utf-8");
    showToast("Descargando el CV en DOCX.");
  }

  function downloadTxt() {
    downloadFile(`${downloadFileBaseName()}.txt`, resumeText(), "text/plain;charset=utf-8");
    showToast("Descargando el CV en TXT.");
  }

  function handleDownloadMenuClick(event) {
    const button = event.target.closest("[data-download-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    setDownloadMenu(false);
    if (button.dataset.downloadAction === "pdf") requestPrint();
    if (button.dataset.downloadAction === "docx") downloadDocx();
    if (button.dataset.downloadAction === "txt") downloadTxt();
  }

  downloadButton?.addEventListener("click", toggleDownloadMenu);
  downloadMenu?.addEventListener("click", handleDownloadMenuClick);
  mobileDownloadButton?.addEventListener("click", requestPrint);
  document.addEventListener("click", (event) => {
    if (downloadMenu?.hidden) return;
    if (event.target.closest("#download-menu, #print-cv")) return;
    setDownloadMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setDownloadMenu(false);
  });
  document.getElementById("download-json").addEventListener("click", () => {
    downloadFile("cv-data.json", `${JSON.stringify(cleanDataForDownload(state.data), null, 2)}\n`, "application/json");
  });
  document.getElementById("download-html").addEventListener("click", () => {
    downloadFile("cv.html", exportHtml(), "text/html");
  });
  document.getElementById("import-json").addEventListener("click", () => {
    document.getElementById("json-file").click();
  });
  document.getElementById("json-file").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        state.data = normalizeData(JSON.parse(String(reader.result || "{}")));
        resetActiveCloudCv();
        renderForm();
        updatePreview();
      } catch (error) {
        alert("El JSON no es valido.");
      }
    });
    reader.readAsText(file);
  });
  document.getElementById("reset-example").addEventListener("click", () => {
    if (!confirm("Esto vacia el borrador actual. Continuar?")) return;
    state = {
      data: normalizeData(initialData),
      photoSrc: photoFallback,
    };
    resetActiveCloudCv();
    renderForm();
    updatePreview();
  });

  loginGoogle.addEventListener("click", async () => {
    if (!cloud.enabled) return;
    try {
      await cloud.modules.auth.signInWithPopup(cloud.auth, cloud.provider);
    } catch (error) {
      console.error("No se pudo iniciar sesión", error);
      setCloudStatus("No se pudo iniciar sesión. Revisa dominios autorizados en Firebase.", "Error");
    }
  });

  logoutGoogle.addEventListener("click", async () => {
    if (!cloud.enabled) return;
    await cloud.modules.auth.signOut(cloud.auth);
  });

  saveCloud.addEventListener("click", saveToCloud);

  document.querySelectorAll("[data-score-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const scoreCard = document.querySelector(".score-card");
      scoreCard?.classList.toggle("is-compact-score");
      showToast(scoreCard?.classList.contains("is-compact-score")
        ? "Sugerencias de integridad ocultas."
        : "Sugerencias de integridad visibles.");
    });
  });

  document.getElementById("assistant-fab")?.addEventListener("click", () => {
    expandedSections.add("cover");
    syncStaticSection("cover");
    document.querySelector('[data-section-panel="cover"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Abriendo la carta de presentación para usar el asistente.");
  });

  function setBuilderTab(tabName, options = {}) {
    document.body.dataset.builderTab = tabName;
    document.querySelectorAll("[data-tab-action]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tabAction === tabName);
    });
    document.querySelectorAll("[data-builder-tab-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.builderTabPanel !== tabName;
    });
    updateScoreCard();
    if (options.silent) return;
  }

  document.querySelectorAll("[data-tab-action]").forEach((button) => {
    button.addEventListener("click", () => setBuilderTab(button.dataset.tabAction || "editor"));
  });

  accountMenuButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    setDownloadMenu(false);
    accountPopover.hidden = !accountPopover.hidden;
  });

  accountPopover?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-account-action]")?.dataset.accountAction;
    if (action === "settings") {
      showToast("Ajustes de cuenta abiertos en la copia local.");
      accountPopover.hidden = true;
      return;
    }
    if (action === "faq") {
      showToast("FAQ: puedes importar/exportar JSON, imprimir el CV y activar Firebase si configuras credenciales.");
      accountPopover.hidden = true;
      return;
    }
    if (action === "logout") {
      accountPopover.hidden = true;
      if (cloud.enabled && cloud.user) {
        cloud.modules.auth.signOut(cloud.auth);
      } else {
        setCloudStatus("No hay sesión activa que cerrar.", cloud.enabled ? "Firebase" : "Modo local");
        showToast("No hay sesión activa que cerrar.");
      }
      return;
    }
    if (event.target.closest("[data-scroll-target]")) accountPopover.hidden = true;
  });

  savedList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cloud-action]");
    if (!button) return;
    const id = button.dataset.cvId;
    if (!id) return;
    if (button.dataset.cloudAction === "load") loadCloudCv(id);
    if (button.dataset.cloudAction === "delete") deleteCloudCv(id);
  });

  document.addEventListener("click", (event) => {
    if (accountPopover && !accountPopover.hidden && !event.target.closest(".top-actions")) {
      accountPopover.hidden = true;
    }

    const sectionOption = event.target.closest("[data-section-option]");
    if (sectionOption) {
      handleSectionOption(sectionOption);
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (actionButton && !actionButton.closest("#cv-form") && actionButton.dataset.action === "dashboard") {
      event.preventDefault();
      window.location.href = "./resumes.html";
      return;
    }
    if (actionButton && !actionButton.closest("#cv-form") && actionButton.dataset.action === "noop") {
      event.preventDefault();
      showToast(actionButton.dataset.message || "Esta acción está preparada para una versión ampliada.");
      return;
    }
    if (actionButton && !actionButton.closest("#cv-form") && actionButton.dataset.action === "writer-help") {
      event.preventDefault();
      showToast("Sugerencia IA: resume impacto, tecnologías y métricas en 2-3 frases.");
      return;
    }
    if (actionButton && !actionButton.closest("#cv-form") && actionButton.dataset.action === "design-choice") {
      event.preventDefault();
      document.querySelectorAll(".template-card, .design-choice").forEach((button) => {
        button.classList.toggle("is-selected", button === actionButton);
      });
      showToast(actionButton.dataset.design === "compact"
        ? "Plantilla compacta previsualizada localmente."
        : "Plantilla profesional seleccionada.");
      return;
    }
    if (actionButton && !actionButton.closest("#cv-form") && actionButton.dataset.action === "accent-choice") {
      event.preventDefault();
      const accent = actionButton.dataset.accent || "#1a91f0";
      document.documentElement.style.setProperty("--accent", accent);
      document.querySelectorAll(".design-swatches button").forEach((button) => {
        button.classList.toggle("is-selected", button === actionButton);
      });
      showToast("Color de acento aplicado a la copia local.");
      return;
    }
    if (actionButton && !actionButton.closest("#cv-form") && actionButton.dataset.action === "toggle-section") {
      const panel = actionButton.dataset.panel;
      if (!panel) return;
      if (expandedSections.has(panel)) expandedSections.delete(panel);
      else expandedSections.add(panel);
      syncStaticSection(panel);
      return;
    }

    const button = event.target.closest("[data-scroll-target]");
    if (!button) return;
    const target = document.getElementById(button.dataset.scrollTarget);
    if (!target) return;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.addEventListener("keydown", (event) => {
    const sectionOption = event.target.closest("[data-section-option]");
    if (!sectionOption || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    handleSectionOption(sectionOption);
  });

  const initialTab = window.location.hash === "#design"
    ? "design"
    : window.location.hash === "#ai-review"
      ? "ai-review"
      : "editor";
  setBuilderTab(initialTab, { silent: true });
  renderForm();
  updatePreview();
  initCloud();
  if (window.location.hash === "#print") {
    window.setTimeout(() => window.print(), 650);
  }
})();
