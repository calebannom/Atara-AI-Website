// Single source of truth for crisis-line numbers shown across the app
// (landing page, counselor-facing banners) and given to the AI persona
// prompt. Atara is built for Ghana, so these are Ghana's lines rather than
// the US-centric 988 this file used to reference — change here, not at
// each call site.
export const CRISIS_LINES = [
  { name: 'Mental Health Authority Helpline', number: '0244 846 701' },
  { name: 'Youth & Adolescent Support Line', number: '0303 932 545' },
];

// "Mental Health Authority Helpline (0244 846 701) or the Youth &
// Adolescent Support Line (0303 932 545)" — for dropping into prose.
export function crisisLinesProse() {
  return CRISIS_LINES.map((l) => `${l.name} (${l.number})`).join(' or ');
}
