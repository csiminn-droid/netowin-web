'use client';
import type { jsPDF as JsPDF } from 'jspdf';
import { supabase } from './supabase/client';
import { data as fData, moeda, decimal, numero } from './formato';
import type { Linha } from './tipos';

export type Sistema = {
  empresa?: string | null; titulo1?: string | null; titulo2?: string | null;
  linha1?: string | null; linha2?: string | null; linha3?: string | null; linha4?: string | null; linha5?: string | null;
  cidade?: string | null; email?: string | null; whatsapp?: string | null; rodape_pedido?: string | null;
};

let sistemaCache: Sistema | null = null;
export async function carregarSistema(forcar = false): Promise<Sistema> {
  if (sistemaCache && !forcar) return sistemaCache;
  const { data } = await supabase().from('sistema').select('*').eq('id', 1).maybeSingle();
  sistemaCache = (data || {}) as Sistema;
  return sistemaCache;
}
export function limparCacheSistema() { sistemaCache = null; }

async function novoDoc(orientacao: 'p' | 'l' = 'p') {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: orientacao, unit: 'mm', format: 'a4' });
  return { doc, autoTable };
}

const M = 12; // margem

function agora() {
  const d = new Date();
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
}

/** Desenha o cabeçalho padrão (nome, endereço, telefones). Retorna a altura usada. */
function cabecalho(doc: JsPDF, s: Sistema, opcoes?: { pagina?: number; compacto?: boolean; titulo?: string }) {
  const W = doc.internal.pageSize.getWidth();
  let y = M + 2;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
  doc.text(agora(), M, y);
  if (opcoes?.pagina) doc.text('Pág.: ' + opcoes.pagina, W - M, y, { align: 'right' });
  doc.setTextColor(0);
  if (opcoes?.compacto) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(opcoes.titulo || s.titulo1 || s.empresa || '', W / 2, y + 4, { align: 'center' });
    return y + 9;
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  if (s.titulo1) { doc.text(s.titulo1, W / 2, y + 3, { align: 'center' }); y += 6; }
  doc.setFontSize(10);
  if (s.titulo2) { doc.text(s.titulo2, W / 2, y + 1, { align: 'center' }); y += 5; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  for (const l of [s.linha1, s.linha2, s.linha3, s.linha4, s.linha5]) {
    if (l && l.trim()) { doc.text(l.trim(), W / 2, y + 1, { align: 'center' }); y += 4; }
  }
  doc.setDrawColor(150); doc.line(M, y + 1, W - M, y + 1);
  return y + 5;
}

function rodapePaginas(doc: JsPDF) {
  const n = doc.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Página ${i} de ${n}`, W - M, H - 6, { align: 'right' });
    doc.setTextColor(0);
  }
}

// ---------------------------------------------------------------------------
// Relatório em tabela (usado por listas e relatórios)
// ---------------------------------------------------------------------------
export type ColunaPdf = { titulo: string; campo: string; tipo?: 'texto' | 'moeda' | 'data' | 'numero' | 'percentual'; largura?: number; formatar?: (l: Linha) => string };

function celula(c: ColunaPdf, l: Linha): string {
  if (c.formatar) return c.formatar(l);
  const v = l[c.campo];
  if (v == null || v === '') return '';
  switch (c.tipo) {
    case 'moeda': return moeda(v);
    case 'data': return fData(v);
    case 'numero': return decimal(v, 3);
    case 'percentual': return decimal(v, 4) + '%';
    default: return String(v);
  }
}

export async function pdfTabela(opcoes: {
  titulo: string; subtitulo?: string; colunas: ColunaPdf[]; linhas: Linha[];
  totais?: Record<string, number | string>; paisagem?: boolean; cabecalhoCompleto?: boolean; observacao?: string;
}): Promise<Blob> {
  const s = await carregarSistema();
  const { doc, autoTable } = await novoDoc(opcoes.paisagem ? 'l' : 'p');
  const W = doc.internal.pageSize.getWidth();
  const desenharTopo = (pagina: number) => {
    let y = opcoes.cabecalhoCompleto ? cabecalho(doc, s, { pagina }) : cabecalho(doc, s, { pagina, compacto: true, titulo: (s.empresa || s.titulo1 || '') });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(opcoes.titulo, W / 2, y + 1, { align: 'center' }); y += 5;
    if (opcoes.subtitulo) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(opcoes.subtitulo, W / 2, y, { align: 'center' }); y += 4; }
    return y + 2;
  };
  const topo = desenharTopo(1);
  const numericas = new Set(['moeda', 'numero', 'percentual']);
  const corpo = opcoes.linhas.map((l) => opcoes.colunas.map((c) => celula(c, l)));
  const pe = opcoes.totais ? [opcoes.colunas.map((c, i) => {
    const t = opcoes.totais![c.campo];
    if (t == null) return i === 0 ? 'Totais' : '';
    return typeof t === 'number' ? (c.tipo === 'moeda' ? moeda(t) : decimal(t, 3)) : String(t);
  })] : undefined;
  let primeira = true;
  autoTable(doc, {
    startY: topo,
    margin: { top: topo, left: M, right: M, bottom: 12 },
    head: [opcoes.colunas.map((c) => c.titulo)],
    body: corpo,
    foot: pe,
    showFoot: 'lastPage',
    styles: { fontSize: 8, cellPadding: 1.4, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [235, 240, 238], textColor: 20, fontStyle: 'bold' },
    footStyles: { fillColor: [245, 245, 245], textColor: 20, fontStyle: 'bold' },
    columnStyles: Object.fromEntries(opcoes.colunas.map((c, i) => [i, { halign: numericas.has(c.tipo || '') ? 'right' : 'left', cellWidth: c.largura ?? 'auto' }])) as any,
    didDrawPage: (d) => { if (!primeira) desenharTopo(d.pageNumber); primeira = false; },
  });
  if (opcoes.observacao) {
    const y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(9); doc.text(doc.splitTextToSize(opcoes.observacao, W - 2 * M), M, y);
  }
  rodapePaginas(doc);
  return doc.output('blob');
}

// ---------------------------------------------------------------------------
// Pedido
// ---------------------------------------------------------------------------
export async function pdfPedido(p: Linha, itens: Linha[], cli: Linha | null, transp: Linha | null, opcoes?: { naoEnviados?: boolean }): Promise<Blob> {
  const s = await carregarSistema();
  const { doc, autoTable } = await novoDoc('p');
  const W = doc.internal.pageSize.getWidth();
  let y = cabecalho(doc, s, { pagina: 1 });
  const lin = (rot: string, val: string, x: number, yy: number, larg?: number) => {
    doc.setFont('helvetica', 'bold'); doc.text(rot, x, yy);
    const w = doc.getTextWidth(rot) + 1.5;
    doc.setFont('helvetica', 'normal');
    const t = larg ? doc.splitTextToSize(val || '', larg - w)[0] || '' : (val || '');
    doc.text(t, x + w, yy);
  };
  doc.setFontSize(9);
  const dir = W - M - 58;
  if (opcoes?.naoEnviados) { doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('PRODUTOS NÃO ENVIADOS', W / 2, y, { align: 'center' }); y += 6; doc.setFontSize(9); }
  lin('Cliente: ', `${p.codcli ?? ''} ${p.cliente ?? ''}`, M, y, dir - M - 2);
  lin('Pedido Nº: ', String(p.pedido ?? ''), dir, y); y += 4.6;
  lin('Endereço: ', cli?.rua || '', M, y, dir - M - 2);
  lin('Data: ', fData(p.data), dir, y); y += 4.6;
  lin('Bairro: ', cli?.bairro || '', M, y, 60); lin('Cidade: ', cli?.cidade || '', M + 62, y, dir - M - 64);
  lin('Pedido Cliente: ', p.pedidocliente || '', dir, y); y += 4.6;
  lin('UF: ', cli?.uf || '', M, y); lin('CEP: ', cli?.cep || '', M + 16, y);
  lin('Email: ', [cli?.email, cli?.emailfinan ? 'Financ.: ' + cli.emailfinan : ''].filter(Boolean).join(' / '), M + 50, y, dir - M - 52);
  lin('Data Cliente: ', p.datapedidocliente || '', dir, y); y += 4.6;
  lin('CNPJ/CPF: ', cli?.cpf || '', M, y, 70); lin('I.E./R.G.: ', cli?.insc || '', M + 72, y, dir - M - 74);
  lin('Vendedor: ', String(p.vendedor ?? ''), dir, y); y += 4.6;
  lin('Tel.: ', cli?.telefone || '', M, y, 60); lin('Whatsapp: ', cli?.whatsapp || cli?.celular || '', M + 62, y); y += 4.6;
  lin('Endereço para cobrança: ', cli?.ruacobra || '', M, y, W - 2 * M); y += 4.6;
  lin('Local de Entrega: ', cli?.ruaentrega || '', M, y, W - 2 * M); y += 4.6;
  lin('Tipo de Cobrança: ', p.tipocobr || '', M, y, 80); lin('Tipo de Venda: ', p.tipovenda || '', M + 82, y, 50); lin('Prazo: ', p.prazo || '', dir, y, 58); y += 4.6;
  lin('Faturar: ', p.entrega || '', M, y, 80); lin('Contato: ', cli?.contato || '', M + 82, y, 90); y += 4.6;
  lin('Transport.: ', `${p.codtransp ?? ''} - ${p.transportadora ?? ''}`, M, y, 95);
  if (transp) lin('', [transp.cnpj ? 'CNPJ: ' + transp.cnpj : '', transp.telefone ? 'Tel.: ' + transp.telefone : ''].filter(Boolean).join('  '), M + 97, y, W - 2 * M - 97);
  y += 4.6;
  lin('Fornecedor: ', p.fornecedor || '', M, y, W - 2 * M); y += 3;

  const lista = opcoes?.naoEnviados ? itens.filter((i) => i.naoenviado) : itens;
  let totCx = 0;
  const corpo = lista.map((i, n) => {
    totCx += numero(i.caixa);
    return [String(n + 1), String(i.produto ?? ''), decimal(i.quant, 3), i.unid || '', i.caixa ? decimal(i.caixa, 2) : '', i.forn || '',
      i.nomeproduto || '', moeda(i.valor), moeda(i.subtotal), i.ipi ? decimal(i.ipi, 2) : '0'];
  });
  autoTable(doc, {
    startY: y + 2,
    margin: { left: M, right: M, top: 16, bottom: 14 },
    head: [['Item', 'Cód.', 'Quant.', 'Un.', 'Cx.', 'Cod.For.', 'Descrição dos Produtos', 'Preço R$', 'Sub Total', 'IPI/ST%']],
    body: corpo,
    styles: { fontSize: 8, cellPadding: 1.3, lineColor: [215, 215, 215], lineWidth: 0.1 },
    headStyles: { fillColor: [235, 240, 238], textColor: 20 },
    columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 12 }, 2: { halign: 'right', cellWidth: 14 }, 3: { cellWidth: 14 }, 4: { halign: 'right', cellWidth: 9 },
      5: { cellWidth: 16 }, 7: { halign: 'right', cellWidth: 17 }, 8: { halign: 'right', cellWidth: 19 }, 9: { halign: 'right', cellWidth: 14 } },
    didDrawPage: (d) => { if (d.pageNumber > 1) { doc.setFontSize(8); doc.text(`Pedido ${p.pedido} - ${p.cliente ?? ''} (continuação)`, M, 10); } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;
  const H = doc.internal.pageSize.getHeight();
  if (y > H - 60) { doc.addPage(); y = 20; }
  doc.setFontSize(9);
  lin('Total Itens: ', String(lista.length), M, y); lin('Total Cx: ', totCx ? decimal(totCx, 2) : '', M + 40, y);
  const xv = W - M;
  doc.setFont('helvetica', 'normal');
  let yy = y;
  if (!opcoes?.naoEnviados) {
    const descs = [1, 2, 3, 4, 5].filter((k) => numero(p['desc' + k]) > 0);
    if (descs.length) {
      doc.text('Subtotal: ' + moeda(p.subtotal), xv, yy, { align: 'right' }); yy += 4.6;
      for (const k of descs) { doc.text(`Desconto ${decimal(p['desc' + k], 2)}%: - ${moeda(p['desc' + k + 'v'])}`, xv, yy, { align: 'right' }); yy += 4.6; }
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Total: ' + moeda(p.total, true), xv, yy, { align: 'right' }); yy += 6;
  } else {
    const t = lista.reduce((a, i) => a + numero(i.subtotal), 0);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Total não enviado: ' + moeda(t, true), xv, yy, { align: 'right' }); yy += 6;
  }
  y = Math.max(y + 6, yy);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text('Obs.:', M, y);
  doc.setFont('helvetica', 'normal');
  const obs = [p.obs1, p.obs2, p.obs3].filter(Boolean).join('\n');
  if (obs) { const t = doc.splitTextToSize(obs, W - 2 * M - 12); doc.text(t, M + 10, y); y += t.length * 4; }
  y += 8;
  doc.setFontSize(8.5);
  const rod = (s.rodape_pedido || '').split('\n').filter(Boolean);
  for (const r of rod) { if (y > H - 10) { doc.addPage(); y = 20; } doc.text(r, M, y); y += 4; }
  rodapePaginas(doc);
  return doc.output('blob');
}

// ---------------------------------------------------------------------------
// Carta de cobrança (remessa de mercadoria)
// ---------------------------------------------------------------------------
export const CARTEIRAS: Record<string, string> = { '1': 'Boleto', '2': 'Carteira', '3': 'Depósito', '4': 'PIX', '5': 'Cheque' };

export async function pdfCarta(c: Linha, cli: Linha | null, forn: Linha | null, ped: Linha | null): Promise<Blob> {
  const s = await carregarSistema();
  const { doc, autoTable } = await novoDoc('p');
  const W = doc.internal.pageSize.getWidth();
  let y = cabecalho(doc, s, { pagina: 1 }) + 2;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`${s.cidade || 'Belo Horizonte'}, ${fData(c.criado_em) || new Date().toLocaleDateString('pt-BR')}`, M, y); y += 8;
  doc.text('À:', M, y); y += 5;
  doc.setFont('helvetica', 'bold'); doc.text(`${c.cliente ?? ''} ${cli?.nome ?? ''}`, M, y); y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Tel.: ${cli?.telefone ?? ''}   Whatsapp: ${cli?.whatsapp ?? cli?.celular ?? ''}`, M, y); y += 5;
  doc.text(`Carta Cobrança Nro.: ${c.id ?? ''}`, M, y); y += 5;
  doc.text(`Email: ${c.email ?? cli?.emailfinan ?? cli?.email ?? ''}`, M, y); y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(`REF.: Remessa de Mercadoria - ${forn?.nome ?? ''}`, M, y); y += 4;
  const valor = numero(ped?.subtotal ?? ped?.total);
  const desconto = numero(ped?.subtotal) - numero(ped?.total);
  const despesa = numero(c.despesa);
  const total = numero(ped?.total) + despesa;
  const ref = [ped?.pedido ?? c.pedido, ped?.pedidocliente].filter(Boolean).join('/');
  autoTable(doc, {
    startY: y + 2, margin: { left: M, right: M },
    head: [['Referente', 'Valor', 'Desconto', c.titulodespesa || 'Desp./IPI', 'Total']],
    body: [[ref || String(c.pedido ?? ''), moeda(valor, true), moeda(desconto), moeda(despesa), moeda(total)]],
    styles: { fontSize: 9.5 }, headStyles: { fillColor: [235, 240, 238], textColor: 20 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;
  const venc: string[][] = [];
  let soma = 0;
  for (let i = 1; i <= 5; i++) {
    const v = numero(c['vencimentovalor' + i]);
    if (!v && !c['vencimentodata' + i]) continue;
    soma += v;
    venc.push([`Vencimento ${i}`, fData(c['vencimentodata' + i]), moeda(v), CARTEIRAS[String(c['vencimentoboletocarteira' + i] ?? '')] || '']);
  }
  autoTable(doc, {
    startY: y, margin: { left: M + 10, right: M + 10 },
    head: [['', 'Data', 'Valor', 'Forma']], body: venc, foot: [['', 'Total', moeda(soma), '']],
    styles: { fontSize: 9.5 }, headStyles: { fillColor: [245, 245, 245], textColor: 20 }, footStyles: { fillColor: [245, 245, 245], textColor: 20 },
    columnStyles: { 2: { halign: 'right' } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold'); doc.text('Observações', M, y); y += 5;
  doc.setFont('helvetica', 'normal');
  for (const o of [c.obs1, c.obs2, c.obs3, c.obs4, c.obs5, c.obs6]) if (o) { doc.text(doc.splitTextToSize(o, W - 2 * M - 8), M + 6, y); y += 5; }
  rodapePaginas(doc);
  return doc.output('blob');
}

// ---------------------------------------------------------------------------
// Remessa de cheques/depósitos para a representada
// ---------------------------------------------------------------------------
export async function pdfRemessa(numero_: number, titulos: Linha[], docs: Linha[], forn: Linha | null): Promise<Blob> {
  const s = await carregarSistema();
  const { doc, autoTable } = await novoDoc('p');
  const W = doc.internal.pageSize.getWidth();
  let y = cabecalho(doc, s, { pagina: 1 }) + 2;
  const t0 = titulos[0] || {};
  doc.setFontSize(10);
  doc.text(`${s.cidade || 'Belo Horizonte'}, ${fData(t0.data) || new Date().toLocaleDateString('pt-BR')}`, M, y); y += 8;
  doc.text('À:', M, y); doc.text(`N.: ${numero_}`, W - M, y, { align: 'right' }); y += 5;
  doc.setFont('helvetica', 'bold'); doc.text(`${forn?.nome ?? t0.fornecedor ?? ''}`, M, y); y += 7;
  doc.text('REF.: Remessa Cheque(s)/Depósito(s)', M, y); doc.setFont('helvetica', 'normal'); y += 2;
  const sub = titulos.reduce((a, t) => a + numero(t.valor), 0);
  const juros = titulos.reduce((a, t) => a + numero(t.vjuros), 0);
  autoTable(doc, {
    startY: y + 2, margin: { left: M, right: M },
    head: [['Cliente', 'Referente', 'Valor', 'Vencimento']],
    body: titulos.map((t) => [t.cliente || '', t.ref || '', moeda(t.valor), fData(t.vencimento)]),
    foot: [['', 'SubTotal', moeda(sub), ''], ['', 'Juros', moeda(juros), ''], ['', 'Total', moeda(sub + juros), '']],
    styles: { fontSize: 9 }, headStyles: { fillColor: [235, 240, 238], textColor: 20 }, footStyles: { fillColor: [248, 248, 248], textColor: 20 },
    columnStyles: { 2: { halign: 'right' } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;
  doc.text('Segue os seguintes documentos para o acerto dos débitos acima citados.', M, y); y += 2;
  const totDocs = docs.reduce((a, d) => a + numero(d.valor), 0);
  autoTable(doc, {
    startY: y + 2, margin: { left: M, right: M },
    head: [['Banco', 'Cheque Nº / Doc.', 'Valor', 'Data', 'Obs']],
    body: docs.map((d) => [d.banco || '', d.numero || '', moeda(d.valor), fData(d.datavenc), d.obs || '']),
    foot: [['', 'TOTAL GERAL', moeda(totDocs), '', '']],
    styles: { fontSize: 9 }, headStyles: { fillColor: [235, 240, 238], textColor: 20 }, footStyles: { fillColor: [248, 248, 248], textColor: 20 },
    columnStyles: { 2: { halign: 'right' } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;
  const dep = [t0.depnome, t0.depbanco, t0.depagencia && 'Ag. ' + t0.depagencia, t0.depconta && 'C/C ' + t0.depconta, t0.deptexto].filter(Boolean).join(' - ');
  if (dep) { doc.text('Depositado em: ' + dep, M, y); y += 5; }
  const obs = [t0.obs1, t0.obs2, t0.obs3].filter(Boolean).join(' ');
  if (obs) { doc.text(doc.splitTextToSize('Observações: ' + obs, W - 2 * M), M, y); }
  rodapePaginas(doc);
  return doc.output('blob');
}

// ---------------------------------------------------------------------------
// Acerto com a representada
// ---------------------------------------------------------------------------
export async function pdfAcerto(a: Linha, vendas: Linha[], dcs: Linha[]): Promise<Blob> {
  const s = await carregarSistema();
  const { doc, autoTable } = await novoDoc('p');
  const W = doc.internal.pageSize.getWidth();
  let y = cabecalho(doc, s, { pagina: 1 }) + 1;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(`Relatório de Acerto Nº ${a.acerto}  -  ${fData(a.data)}`, W / 2, y, { align: 'center' }); y += 6;
  doc.setFontSize(9.5); doc.text(`${a.codfor ?? ''} - ${a.fornecedor ?? ''}`, M, y); y += 4.5;
  doc.setFont('helvetica', 'normal');
  const end = [a.fornecedorrua, a.fornecedorbairro, a.fornecedorcidade, a.fornecedoruf, a.fornecedorcep].filter(Boolean).join(' - ');
  if (end) { doc.text(end, M, y); y += 4.5; }
  const doc2 = [a.fornecedorcgc && 'CNPJ: ' + a.fornecedorcgc, a.fornecedorinsc && 'I.E.: ' + a.fornecedorinsc, a.fornecedortelefone && 'Tel.: ' + a.fornecedortelefone].filter(Boolean).join('   ');
  if (doc2) { doc.text(doc2, M, y); y += 4.5; }
  autoTable(doc, {
    startY: y + 2, margin: { left: M, right: M, top: 16 },
    head: [['Data', 'Pedido / NF', 'Cliente', 'Cidade', 'Valor', '%', 'Comissão']],
    body: vendas.map((v) => [fData(v.data), v.ref || String(v.pedido ?? ''), v.cliente || '', v.cidade || '', moeda(v.total), decimal(v.comissao, 4), moeda(v.vrcomissao)]),
    foot: [['', '', '', 'Total', moeda(a.vendas), '', moeda(a.comissao)]],
    styles: { fontSize: 8 }, headStyles: { fillColor: [235, 240, 238], textColor: 20 }, footStyles: { fillColor: [248, 248, 248], textColor: 20 },
    columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;
  if (dcs.length) {
    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [['Data', 'Débitos e créditos', 'Valor']],
      body: dcs.map((d) => [fData(d.data), d.historico || '', moeda(d.total)]),
      foot: [['', 'Total débito/crédito', moeda(a.debitocredito)]],
      styles: { fontSize: 8 }, headStyles: { fillColor: [235, 240, 238], textColor: 20 }, footStyles: { fillColor: [248, 248, 248], textColor: 20 },
      columnStyles: { 2: { halign: 'right' } },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Valor a receber: ' + moeda(a.receber, true), W - M, y + 4, { align: 'right' }); y += 12;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const banco = [a.banconome, a.bancocpfcnpj, a.bancobanco, a.bancoagencia && 'Ag. ' + a.bancoagencia, a.bancoconta && 'Conta ' + a.bancoconta, a.bancotexto].filter(Boolean);
  if (banco.length) { doc.setFont('helvetica', 'bold'); doc.text('Dados para depósito:', M, y); doc.setFont('helvetica', 'normal'); doc.text(banco.join(' - '), M + 34, y, { maxWidth: W - 2 * M - 34 }); y += 8; }
  for (const o of [a.obs1, a.obs2, a.obs3]) if (o) { doc.text(o, M, y); y += 4.5; }
  rodapePaginas(doc);
  return doc.output('blob');
}

export async function pdfAcertoPreposto(a: Linha, comissoes: Linha[], vales: Linha[]): Promise<Blob> {
  const s = await carregarSistema();
  const { doc, autoTable } = await novoDoc('p');
  const W = doc.internal.pageSize.getWidth();
  let y = cabecalho(doc, s, { pagina: 1 }) + 1;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(`Acerto de Preposto Nº ${a.acerto}  -  ${fData(a.data)}`, W / 2, y, { align: 'center' }); y += 6;
  doc.setFontSize(9.5); doc.text(`${a.codigo ?? ''} - ${a.nomevendedor ?? ''}`, M, y); y += 3;
  const tc = comissoes.reduce((s2, c) => s2 + numero(c.comissaoentrega ?? c.vrcomissao), 0);
  autoTable(doc, {
    startY: y + 2, margin: { left: M, right: M, top: 16 },
    head: [['Data', 'Pedido', 'Cliente', 'Representada', 'Valor', '%', 'Comissão']],
    body: comissoes.map((c) => [fData(c.data), c.ref || String(c.pedido ?? ''), c.cliente || '', c.fornecedor || '', moeda(c.entrega ?? c.total), decimal(c.comissao, 4), moeda(c.comissaoentrega ?? c.vrcomissao)]),
    foot: [['', '', '', '', '', 'Total', moeda(tc)]],
    styles: { fontSize: 8 }, headStyles: { fillColor: [235, 240, 238], textColor: 20 }, footStyles: { fillColor: [248, 248, 248], textColor: 20 },
    columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;
  if (vales.length) {
    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [['Data', 'Vales / adiantamentos', 'Valor']],
      body: vales.map((v) => [fData(v.data), v.historico || '', moeda(v.valor)]),
      foot: [['', 'Total', moeda(vales.reduce((s2, v) => s2 + numero(v.valor), 0))]],
      styles: { fontSize: 8 }, headStyles: { fillColor: [235, 240, 238], textColor: 20 }, footStyles: { fillColor: [248, 248, 248], textColor: 20 },
      columnStyles: { 2: { halign: 'right' } },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Valor a pagar: ' + moeda(a.valor, true), W - M, y + 4, { align: 'right' }); y += 12;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const banco = [a.nome, a.banco, a.agencia && 'Ag. ' + a.agencia, a.conta && 'Conta ' + a.conta].filter(Boolean);
  if (banco.length) { doc.text('Dados bancários: ' + banco.join(' - '), M, y); y += 5; }
  if (a.obs) doc.text(a.obs, M, y);
  rodapePaginas(doc);
  return doc.output('blob');
}

// ---------------------------------------------------------------------------
// Ficha do cliente e tabela de preços
// ---------------------------------------------------------------------------
export async function pdfFichaCliente(c: Linha): Promise<Blob> {
  const s = await carregarSistema();
  const { doc, autoTable } = await novoDoc('p');
  const W = doc.internal.pageSize.getWidth();
  const y = cabecalho(doc, s, { pagina: 1 });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Ficha Cadastral do Cliente', W / 2, y + 1, { align: 'center' });
  const linhas: [string, any][] = [
    ['Código', c.codigo], ['Razão social', c.nome], ['CNPJ/CPF', c.cpf], ['Inscrição estadual', c.insc],
    ['Endereço', c.rua], ['Bairro', c.bairro], ['Cidade / UF', [c.cidade, c.uf].filter(Boolean).join(' / ')], ['CEP', c.cep],
    ['Telefone', c.telefone], ['WhatsApp', c.whatsapp], ['Celular', c.celular], ['Contato', c.contato],
    ['E-mail', c.email], ['E-mail financeiro', c.emailfinan], ['Endereço de cobrança', c.ruacobra], ['Local de entrega', c.ruaentrega],
    ['Observações', [c.obs1, c.obs2, c.obs3, c.obs4, c.obs5, c.obs6].filter(Boolean).join('\n')],
  ];
  autoTable(doc, {
    startY: y + 5, margin: { left: M, right: M }, body: linhas.map(([k, v]) => [k, v == null ? '' : String(v)]),
    styles: { fontSize: 10, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48, fillColor: [245, 247, 246] } },
    theme: 'grid',
  });
  return doc.output('blob');
}

export async function pdfTabelaPrecos(forn: Linha, produtos: Linha[], precos: number[], observacao?: string): Promise<Blob> {
  const s = await carregarSistema();
  const { doc, autoTable } = await novoDoc('p');
  const W = doc.internal.pageSize.getWidth();
  const topo = (pg: number) => {
    let y = cabecalho(doc, s, { pagina: pg });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text(`Representada: ${forn.codigo}  ${forn.nome}`, M, y + 1); y += 4;
    return y;
  };
  const y0 = topo(1);
  let primeira = true;
  autoTable(doc, {
    startY: y0 + 2, margin: { left: M, right: M, top: y0 + 2, bottom: 12 },
    head: [['Código', 'Descrição dos Produtos', 'Unid', ...precos.map((p) => precos.length > 1 ? `Preço ${p}` : 'Preço'), 'IPI/ST%', 'Qt.Embal.', 'Cód. Fab.']],
    body: produtos.map((p) => [String(p.codigo), p.produto || '', p.unid || '', ...precos.map((k) => p['valor' + k] != null ? moeda(p['valor' + k]) : ''), p.ipi ? decimal(p.ipi, 2) : '0', p.embal || '', p.codfor || '']),
    styles: { fontSize: 8, cellPadding: 1.2 }, headStyles: { fillColor: [235, 240, 238], textColor: 20 },
    columnStyles: Object.fromEntries([...precos.map((_, i) => [3 + i, { halign: 'right' }]), [3 + precos.length, { halign: 'right' }]]) as any,
    didDrawPage: (d) => { if (!primeira) topo(d.pageNumber); primeira = false; },
  });
  if (observacao) { const y = (doc as any).lastAutoTable.finalY + 6; doc.setFontSize(9); doc.text(doc.splitTextToSize('Observações: ' + observacao, W - 2 * M), M, y); }
  rodapePaginas(doc);
  return doc.output('blob');
}
