import {DESIGN_CATALOG, DESIGN_GROUPS, canSelectDesign} from './cv-design-catalog.js?v=20261003-legal';

const searchText = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
const lockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>';

export function mountDesignGallery(root, {search, group, status, onSelect}) {
  const cards = new Map(), sections = new Map();
  let selectedId;
  for (const {id, name} of DESIGN_GROUPS) {
    const section = document.createElement('section');
    section.className = 'cv-template-group';
    section.dataset.templateGroup = id;
    const heading = document.createElement('h2');
    heading.textContent = name;
    const count = document.createElement('span');
    count.className = 'cv-template-group-count';
    heading.append(count);
    const grid = document.createElement('div');
    grid.className = 'cv-template-options';
    section.append(heading, grid);
    root.append(section);
    sections.set(id, {section, count, grid});
  }
  for (const template of DESIGN_CATALOG) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cv-template-choice';
    button.dataset.templateId = template.id;
    button.disabled = !canSelectDesign(template.id);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', template.name + (button.disabled ? ' · Bloqueada' : ''));
    if (button.disabled) button.title = 'Esta plantilla está bloqueada.';
    const name = document.createElement('strong');
    name.className = 'cv-template-name';
    name.textContent = template.name;
    const frame = document.createElement('span');
    frame.className = 'cv-template-image';
    const image = document.createElement('img');
    const previewUrl = new URL(template.preview, import.meta.url);
    previewUrl.searchParams.set('v', '20261003-legal');
    image.src = previewUrl.href;
    image.alt = `Vista previa de ${template.name}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.width = 480;
    image.height = 679;
    frame.append(image);
    const badge = document.createElement('span');
    badge.className = 'cv-template-badge';
    button.append(name, frame, badge);
    sections.get(template.group).grid.append(button);
    cards.set(template.id, {button, badge, template});
  }
  function sync(templateId) {
    selectedId = templateId;
    for (const {button, badge, template} of cards.values()) {
      const selected = template.id === templateId;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      badge.innerHTML = button.disabled ? `${lockIcon}<span>${selected ? 'Actual · Bloqueada' : 'Bloqueada'}</span>` : `${checkIcon}<span>${selected ? 'Actual' : 'Disponible'}</span>`;
    }
  }
  function filter() {
    const query = searchText(search.value);
    let visible = 0, available = 0;
    for (const {button, template} of cards.values()) {
      button.hidden = (group.value !== 'all' && template.group !== group.value) || !searchText(template.name).includes(query);
      if (!button.hidden) {visible++; if (!button.disabled) available++;}
    }
    for (const [id, {section, count}] of sections) {
      const total = [...cards.values()].filter(c => c.template.group === id && !c.button.hidden).length;
      section.hidden = !total;
      count.textContent = String(total);
    }
    status.textContent = visible ? `${visible} ${visible === 1 ? 'plantilla' : 'plantillas'} · ${available} ${available === 1 ? 'disponible' : 'disponibles'}` : 'No hay plantillas con ese nombre.';
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-template-id]');
    if (!button || !root.contains(button) || button.disabled || !canSelectDesign(button.dataset.templateId) || button.dataset.templateId === selectedId) return;
    onSelect(button.dataset.templateId);
  });
  search.addEventListener('input', filter);
  group.addEventListener('change', filter);
  filter();
  return {sync};
}
