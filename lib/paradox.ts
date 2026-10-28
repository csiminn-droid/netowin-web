// Leitor de tabelas Paradox (.DB) usadas pelo BDE/Delphi. Funciona no navegador e no Node.
const TYPES: Record<number, string> = {1:'alpha',2:'date',3:'short',4:'long',5:'currency',6:'number',9:'logical',0x0c:'memo',0x0d:'blob',0x0e:'fmtmemo',0x0f:'ole',0x10:'graphic',0x14:'time',0x15:'timestamp',0x16:'autoinc',0x17:'bcd',0x18:'bytes'};

function decodeText(bytes: Uint8Array): string {
  // Windows-1252 (padrão do BDE em português)
  try { return new TextDecoder('windows-1252').decode(bytes); } catch { return String.fromCharCode(...Array.from(bytes)); }
}

function readInt(b: Uint8Array, o: number, n: number): number | null {
  let allZero = true; for (let i = 0; i < n; i++) if (b[o + i]) { allZero = false; break; }
  if (allZero) return null;
  const t = new Uint8Array(n); for (let i = 0; i < n; i++) t[i] = b[o + i];
  t[0] ^= 0x80;
  const dv = new DataView(t.buffer);
  return n === 2 ? dv.getInt16(0) : dv.getInt32(0);
}

function readDouble(b: Uint8Array, o: number): number | null {
  let allZero = true; for (let i = 0; i < 8; i++) if (b[o + i]) { allZero = false; break; }
  if (allZero) return null;
  const t = new Uint8Array(8); for (let i = 0; i < 8; i++) t[i] = b[o + i];
  if (t[0] & 0x80) t[0] ^= 0x80; else for (let i = 0; i < 8; i++) t[i] = ~t[i] & 0xff;
  return new DataView(t.buffer).getFloat64(0);
}

function daysToISO(days: number): string {
  // Paradox: dias contados a partir de 01/01/0001 (dia 1). 01/01/2000 = dia 730120
  const r = new Date(Date.UTC(2000, 0, 1) + (days - 730120) * 86400000);
  const y = r.getUTCFullYear();
  const ys = y < 0 ? '0000' : String(y).padStart(4, '0');
  return ys + '-' + String(r.getUTCMonth() + 1).padStart(2, '0') + '-' + String(r.getUTCDate()).padStart(2, '0');
}

export type ParadoxField = { type: string; size: number; name: string };
export type ParadoxRow = Record<string, string | number | boolean | null>;
export type ParadoxTable = { fields: ParadoxField[]; rows: ParadoxRow[]; numRecords: number; version: number };

export function parseParadox(buffer: ArrayBuffer | Uint8Array): ParadoxTable {
  const b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const recordSize = dv.getUint16(0, true);
  const headerSize = dv.getUint16(2, true);
  const fileType = b[4];
  const blockSize = b[5] * 1024;
  const numRecords = dv.getUint32(6, true);
  const firstBlock = dv.getUint16(0x0e, true);
  const numFields = dv.getUint16(0x21, true);
  const version = b[0x39];
  if (fileType !== 0 && fileType !== 2) throw new Error('Arquivo não é uma tabela Paradox de dados');
  let p = version >= 5 ? 0x78 : 0x58;
  const fields: ParadoxField[] = [];
  for (let i = 0; i < numFields; i++) { fields.push({ type: TYPES[b[p]] || ('t' + b[p]), size: b[p + 1], name: '' }); p += 2; }
  p += 4; // ponteiro do nome da tabela
  p += 4 * numFields; // ponteiros dos nomes dos campos
  // nome da tabela: 261 bytes (v>=7) ou 79 bytes
  p += version >= 0x0c ? 261 : 79;
  for (let i = 0; i < numFields; i++) {
    let e = p; while (b[e] !== 0) e++;
    fields[i].name = decodeText(b.subarray(p, e)); p = e + 1;
  }
  const rows: ParadoxRow[] = [];
  let block = firstBlock, guard = 0;
  while (block && guard++ < 100000) {
    const start = headerSize + (block - 1) * blockSize;
    if (start + 6 > b.length) break;
    const next = dv.getUint16(start, true);
    const addData = dv.getInt16(start + 4, true);
    const n = addData >= 0 ? Math.floor(addData / recordSize) + 1 : 0;
    for (let r = 0; r < n; r++) {
      let o = start + 6 + r * recordSize;
      const row: ParadoxRow = {};
      for (const f of fields) {
        let v: string | number | boolean | null = null;
        switch (f.type) {
          case 'alpha': { let e = o; const end = o + f.size; while (e < end && b[e] !== 0) e++; const s = decodeText(b.subarray(o, e)).trimEnd(); v = s === '' ? null : s; break; }
          case 'date': { const d = readInt(b, o, 4); v = d == null || d <= 0 ? null : daysToISO(d); break; }
          case 'short': v = readInt(b, o, 2); break;
          case 'long': case 'autoinc': v = readInt(b, o, 4); break;
          case 'currency': case 'number': v = readDouble(b, o); break;
          case 'logical': v = b[o] === 0 ? null : (b[o] & 0x7f) !== 0; break;
          case 'time': { v = readInt(b, o, 4); break; }
          case 'timestamp': { const t = readDouble(b, o); v = t == null ? null : new Date(Date.UTC(1,0,1) + t - 86400000).toISOString(); break; }
          case 'memo': case 'fmtmemo': { const inline = f.size - 10; let e = o; while (e < o + inline && b[e] !== 0) e++; const s = decodeText(b.subarray(o, e)).trimEnd(); v = s === '' ? null : s; break; }
          default: v = null;
        }
        row[f.name] = v; o += f.size;
      }
      rows.push(row);
    }
    block = next;
  }
  return { fields, rows, numRecords, version };
}
