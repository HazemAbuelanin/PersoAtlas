/* Line icons (24×24, stroke = currentColor) used for emblems, trophies and the logo. */
const P = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  book: '<path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13.5"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  brush: '<path d="M14 4 20 10l-8 8-3-3z"/><path d="M9 15c-3 0-5 2-5 5 3 0 5-2 5-5z"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  atom: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.8"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-60 12 12)"/>',
  leaf: '<path d="M5 19c0-9 5-14 15-15-1 10-6 15-15 15z"/><path d="M5 19 14 10"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  heart: '<path d="M12 20s-7.5-4.5-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.5-7.5 10-7.5 10z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6"/>',
  flame: '<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-4 3.5-5.5 4-10 3 2 6.5 5.5 6.5 9.5 0 1-.3 2-.8 2.8.6-.5 1.3-1.6 1.3-3 1.5 1.3 2 2.9 2 4.2 0 1.8-2.2 2.5-6.5 2.5z"/>',
  crown: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  feather: '<path d="M20 4c-8 0-14 6-14 14v2M6 18h7c4 0 7-3 7-7"/><path d="M6 14h9"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  hex: '<path d="M12 2.5 20.5 7.3v9.4L12 21.5 3.5 16.7V7.3z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};
export const EMBLEMS = ["compass", "book", "flask", "code", "brush", "music", "globe", "chart", "atom", "leaf", "shield", "heart"];
export const icon = (name, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.hex}</svg>`;
export const LOGO = `<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--blue)"/><stop offset="1" stop-color="var(--cyan)"/></linearGradient></defs><path d="M32 3 57 17v30L32 61 7 47V17z" fill="none" stroke="url(#lg)" stroke-width="4"/><path d="M32 15 46 23v18L32 49 18 41V23z" fill="url(#lg)" opacity=".25"/><path d="m40 24-4 12-12 4 4-12z" fill="url(#lg)"/></svg>`;
