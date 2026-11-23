/**
 * Disuasión básica (spec 7.4): bloquea el clic derecho y los atajos de las herramientas
 * de desarrollador. Se puede saltar; frena a la mayoría.
 */
export function installProtection(doc: Document = document): () => void {
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    if (k === 'f12' || (mod && e.shiftKey && ['i', 'j', 'c'].includes(k)) || (mod && !e.shiftKey && k === 'u')) e.preventDefault();
  };
  const onMenu = (e: Event) => e.preventDefault();
  doc.addEventListener('keydown', onKey, true);
  doc.addEventListener('contextmenu', onMenu, true);
  return () => { doc.removeEventListener('keydown', onKey, true); doc.removeEventListener('contextmenu', onMenu, true); };
}
