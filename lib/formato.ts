export type Num = number | string | null | undefined;

export function numero(v: Num): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/\s/g, '');
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function numeroOuNulo(v: Num): number | null {
  if (v == null || String(v).trim() === '') return null;
  return numero(v);
}

export function moeda(v: Num, simbolo = false): string {
  const n = numero(v);
  const s = n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return simbolo ? 'R$ ' + s : s;
}

export function decimal(v: Num, casas = 2): string {
  if (v == null || v === '') return '';
  return numero(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

export function data(v: string | null | undefined): string {
  if (!v) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
}

export function hojeISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function somarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function soDigitos(s: string | null | undefined): string {
  return (s || '').replace(/\D/g, '');
}

/** Monta link do WhatsApp; aceita telefone com ou sem DDD/55 */
export function linkWhatsApp(telefone: string | null | undefined, texto?: string): string {
  let d = soDigitos(telefone);
  if (d.length >= 10 && d.length <= 11) d = '55' + d;
  const t = texto ? '?text=' + encodeURIComponent(texto) : '';
  return d ? `https://wa.me/${d}${t}` : `https://wa.me/${t}`;
}

export function arred(n: number, casas = 2): number {
  const f = 10 ** casas;
  return Math.round((n + Number.EPSILON) * f) / f;
}
