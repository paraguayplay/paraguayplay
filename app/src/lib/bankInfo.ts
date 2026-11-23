export type BankRow = { key: string; value: string } | { text: string };

/** Convierte el texto libre de datos bancarios en filas "Clave: valor" y líneas sueltas. */
export function parseBankInfo(text: string | null | undefined): BankRow[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(':');
      return i > 0 && i < l.length - 1 ? { key: l.slice(0, i).trim(), value: l.slice(i + 1).trim() } : { text: l };
    });
}
