import {renderPreview} from "./cv-preview.js";

export function fitThumbnail(preview) {
  const page = preview.firstElementChild;
  if (!page) return;
  // Fit the original A4 page, including narrow cards below the editor's minimum zoom.
  const width = parseFloat(getComputedStyle(page).width);
  if (width && preview.clientWidth) preview.style.setProperty("--thumbnail-scale", String(preview.clientWidth / width));
}

export async function renderThumbnail(preview, state) {
  await document.fonts.ready;
  if (!preview.isConnected) return;
  // Share pagination, fonts and vector typesetting with the editor and PDF export.
  preview.style.setProperty("--thumbnail-scale", "1");
  renderPreview(preview, state);
  preview.replaceChildren(preview.firstElementChild);
  fitThumbnail(preview);
  preview.dataset.ready = "true";
}
