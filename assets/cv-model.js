export const ENTRY_SECTIONS = [
  ["experience", "Experiencia profesional"],
  ["education", "Formación"],
  ["awards", "Premios y certificaciones"],
];
export const SECTION_ORDER = ["summary", "experience", "education", "skills", "languages", "awards", "websites"];
export const SECTION_TITLES = {
  summary: "Perfil profesional", experience: "Experiencia profesional", education: "Formación",
  skills: "Competencias", languages: "Idiomas", awards: "Premios y certificaciones", websites: "Enlaces",
};
export const text = value => typeof value === "string" ? value : "";
export const compact = value => text(value).replace(/\s+/g, " ").trim();
export const lines = value => (Array.isArray(value) ? value : text(value).split(/\r?\n/)).map(compact).filter(Boolean);
export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char]));

export function safeHttpUrl(value) {
  try {
    const url = new URL(text(value));
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

// Keep links separate from text so imports cannot introduce HTML into the CV.
export function linkedTextParts(value, links = [], target = "text") {
  const content = text(value), matches = [];
  for (const link of links) {
    const url = safeHttpUrl(link.url), label = compact(link.label);
    const start = content.indexOf(label);
    if (link.target !== target || !url || !label || start < 0) continue;
    if (matches.some(other => start < other.end && start + label.length > other.start)) continue;
    matches.push({start, end:start + label.length, url});
  }
  let cursor = 0;
  const parts = [];
  for (const match of matches.sort((a,b) => a.start - b.start)) {
    if (match.start > cursor) parts.push({text:content.slice(cursor,match.start)});
    parts.push({text:content.slice(match.start,match.end),url:match.url});
    cursor = match.end;
  }
  if (cursor < content.length) parts.push({text:content.slice(cursor)});
  return parts;
}

export function normalizeData(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const data = {};
  for (const key of ["name", "firstName", "lastName", "title", "email", "phone", "linkedin", "postalCode", "city", "country"]) data[key] = compact(source[key]);
  data.summary = text(source.summary).trim();
  for (const key of ["skills", "languages", "websites"]) data[key] = lines(source[key]);
  for (const [key] of ENTRY_SECTIONS) {
    data[key] = (Array.isArray(source[key]) ? source[key] : []).filter(item => item && typeof item === "object").map(item => ({
      date: compact(item.date), title: text(item.title).trim(), meta: text(item.meta).trim(),
      spaceAfter: Math.max(0,Math.min(36,Number(item.spaceAfter)||0)),
      text: text(item.text).trim(),
      links: (Array.isArray(item.links) ? item.links : []).filter(link => link && typeof link === "object").map(link => ({
        target: /^(text|bullet:\d+)$/.test(link.target) ? link.target : "text",
        label: compact(link.label), url: safeHttpUrl(link.url),
      })).filter(link => link.label && link.url),
      bullets: lines(item.bullets), page_break_before: item.page_break_before === true,
    }));
  }
  return data;
}

export function normalizeOrder(order) {
  const mapped = Array.isArray(order) ? order.map(key => ({profile:"summary", areas:"skills"}[key] || key)) : [];
  return [...new Set([...mapped.filter(key => SECTION_ORDER.includes(key)), ...SECTION_ORDER])];
}

export function normalizeState(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const template = source.design?.template === "compact" ? "compact" : "classic";
  const previousDefault = source.design?.template === "professional" && source.design?.accent === "#1a91f0";
  return {
    data: normalizeData(source.data),
    photoSrc: /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(text(source.photoSrc)) ? source.photoSrc : "",
    formSectionOrder: normalizeOrder(source.formSectionOrder),
    design: {
      template,
      accent: !previousDefault && /^#[a-f\d]{6}$/i.test(source.design?.accent || "") ? source.design.accent : "#212121",
      pageNumbers: typeof source.design?.pageNumbers === "boolean" ? source.design.pageNumbers : template === "classic",
      pageNumberPrefix: typeof source.design?.pageNumberPrefix === "string" ? compact(source.design.pageNumberPrefix).slice(0,30) : "Página",
    },
  };
}

export function sectionsForCv(state) {
  const {data, formSectionOrder, design} = normalizeState(state);
  const titles = design.template === "classic" ? {experience:"Experiencia laboral", awards:"Reconocimientos, premios e hitos"} : {};
  return formSectionOrder.map(key => ({
    key, title: titles[key] || SECTION_TITLES[key],
    entries: ENTRY_SECTIONS.some(([entryKey]) => entryKey === key) ? data[key]
      : key === "summary" ? (data.summary ? [{text: data.summary, bullets: [], title: "", date: ""}] : [])
      : data[key].map(value => ({text: value, bullets: [], title: "", date: ""})),
  })).filter(section => section.entries.length);
}

export function contactParts(data) {
  return [data.email, data.phone, [data.postalCode, data.city, data.country].filter(Boolean).join(" "), data.linkedin].filter(Boolean);
}

export function resumeText(input) {
  const state = normalizeState(input);
  return [state.data.name, state.data.title, contactParts(state.data).join(" · "), "",
    ...sectionsForCv(state).flatMap(section => [section.title.toUpperCase(), ...section.entries.flatMap(item => [
      [item.date, item.title, item.meta].filter(Boolean).join(" · "), item.text || "",
      ...(item.bullets || []).map(bullet => `• ${bullet}`), "",
    ]), ""]),
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function progress(data) {
  const checks = [
    [Boolean(data.name), "Nombre y apellidos"], [Boolean(data.title), "Puesto laboral"],
    [Boolean(data.email || data.phone), "Datos de contacto"], [Boolean(data.summary), "Perfil profesional"],
    [Boolean(data.experience?.some(item => item.title)), "Experiencia profesional"],
    [Boolean(data.education?.some(item => item.title)), "Formación"],
    [Boolean(data.skills?.length), "Competencias"], [Boolean(data.languages?.length), "Idiomas"],
  ];
  return {checks, percent: Math.round(checks.filter(([done]) => done).length * 100 / checks.length)};
}

export const fileName = record => (compact(record.title) || compact(record.state?.data?.name) || "Mi CV").replace(/[\\/:*?"<>|\x00-\x1f]+/g, "-").slice(0, 100);
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
