'use client';
import { supabase } from './supabase/client';
import { buscarTodos } from './supabase/todos';
import { pdfAcerto, pdfAcertoPreposto, pdfCarta, pdfFichaCliente, pdfPedido, pdfRemessa } from './pdf';
import type { Contexto, Linha } from './tipos';
import { moeda, numero } from './formato';

const sb = () => supabase();

async function um(tabela: string, coluna: string, valor: any): Promise<Linha | null> {
  if (valor == null) return null;
  const { data } = await sb().from(tabela).select('*').eq(coluna, valor).maybeSingle();
  return data;
}

async function todos(tabela: string, coluna: string, valor: any, ordem?: string): Promise<Linha[]> {
  return buscarTodos(() => { let q = sb().from(tabela).select('*').eq(coluna, valor); if (ordem) q = q.order(ordem); return q.order('id'); });
}

export async function imprimirPedido(num: number, ctx: Pick<Contexto, 'compartilhar' | 'avisar'>, naoEnviados = false) {
  const p = await um('pedidos', 'pedido', num);
  if (!p) { ctx.avisar('Pedido não encontrado', 'erro'); return; }
  const itens = await todos('produtospedido', 'pedido', num, 'id');
  itens.sort((a, b) => (a.ordem ?? a.id) - (b.ordem ?? b.id));
  const cli = await um('clientes', 'codigo', p.codcli);
  const tr = await um('transportadoras', 'codigo', p.codtransp);
  if (naoEnviados && !itens.some((i) => i.naoenviado)) { ctx.avisar('Este pedido não tem produtos marcados como não enviados', 'erro'); return; }
  const blob = await pdfPedido(p, itens, cli, tr, { naoEnviados });
  ctx.compartilhar({
    blob, arquivo: `${naoEnviados ? 'NaoEnviados' : 'Pedido'}${num}.pdf`, titulo: `${naoEnviados ? 'Produtos não enviados do pedido' : 'Pedido'} ${num}`,
    whatsapp: cli?.whatsapp || cli?.celular, email: cli?.email,
    assunto: `Pedido ${num} - ${p.fornecedor ?? ''}`,
    texto: `Olá! Segue o pedido ${num} (${p.fornecedor ?? ''}) no valor de ${moeda(p.total, true)}.`,
  });
}

export async function imprimirCarta(id: number, ctx: Pick<Contexto, 'compartilhar' | 'avisar'>) {
  const c = await um('cartacobranca', 'id', id);
  if (!c) { ctx.avisar('Carta não encontrada', 'erro'); return; }
  const [cli, forn, ped] = await Promise.all([um('clientes', 'codigo', c.cliente), um('fornecedores', 'codigo', c.fornecedor), um('pedidos', 'pedido', c.pedido)]);
  const blob = await pdfCarta(c, cli, forn, ped);
  ctx.compartilhar({ blob, arquivo: `CartaCobranca${id}.pdf`, titulo: `Carta de cobrança ${id}`, whatsapp: cli?.whatsapp || cli?.celular,
    email: c.email || cli?.emailfinan || cli?.email, assunto: `Remessa de mercadoria - ${forn?.nome ?? ''} - Pedido ${c.pedido ?? ''}`,
    texto: `Olá! Segue a carta de cobrança referente ao pedido ${c.pedido ?? ''} (${forn?.nome ?? ''}).` });
}

export async function lancarTitulosDaCarta(c: Linha, ctx: Contexto) {
  const ped = await um('pedidos', 'pedido', c.pedido);
  const cli = await um('clientes', 'codigo', c.cliente);
  const forn = await um('fornecedores', 'codigo', c.fornecedor);
  const novos: Linha[] = [];
  const letras = 'ABCDE';
  for (let i = 1; i <= 5; i++) {
    const v = numero(c['vencimentovalor' + i]);
    if (!v) continue;
    novos.push({ ref: `${c.pedido ?? ''}${ped?.pedidocliente ? '/' + ped.pedidocliente : ''}/${letras[i - 1]}`, pedido: c.pedido, codcli: c.cliente, cliente: cli?.nome,
      codfor: c.fornecedor, fornecedor: forn?.nome, valor: v, vencimento: c['vencimentodata' + i] || null,
      boletocarteira: { 1: 'Boleto', 2: 'Carteira', 3: 'Depósito', 4: 'PIX', 5: 'Cheque' }[Number(c['vencimentoboletocarteira' + i])] || null });
  }
  if (!novos.length) { ctx.avisar('A carta não tem vencimentos com valor', 'erro'); return; }
  if (!(await ctx.confirmar(`Lançar ${novos.length} título(s) em "Títulos a receber"?`, { detalhe: 'Use isso quando você mesmo for receber esses valores do cliente e repassar à representada.' }))) return;
  const { error } = await sb().from('cobranca').insert(novos);
  if (error) ctx.avisar('Erro: ' + error.message, 'erro'); else ctx.avisar('Títulos lançados');
}

export async function imprimirAcerto(n: number, ctx: Pick<Contexto, 'compartilhar' | 'avisar'>) {
  const a = await um('acerto', 'acerto', n);
  if (!a) { ctx.avisar('Acerto não encontrado', 'erro'); return; }
  const [vendas, dcs, forn] = await Promise.all([todos('controlevendas', 'codacerto', n, 'data'), todos('debitocredito', 'codacerto', n, 'data'), um('fornecedores', 'codigo', a.codfor)]);
  const blob = await pdfAcerto(a, vendas, dcs);
  ctx.compartilhar({ blob, arquivo: `Acerto${n}.pdf`, titulo: `Acerto ${n} - ${a.fornecedor ?? ''}`, email: forn?.email, whatsapp: forn?.celular,
    assunto: `Acerto de comissões nº ${n}`, texto: `Segue o relatório de acerto de comissões nº ${n}, valor a receber ${moeda(a.receber, true)}.` });
}

export async function imprimirAcertoPreposto(n: number, ctx: Pick<Contexto, 'compartilhar' | 'avisar'>) {
  const a = await um('acertovendedor', 'acerto', n);
  if (!a) { ctx.avisar('Acerto não encontrado', 'erro'); return; }
  const [com, vales, v] = await Promise.all([todos('preposto', 'acerto', n, 'data'), todos('vales', 'acerto', n, 'data'), um('vendedor', 'codigo', a.codigo)]);
  const blob = await pdfAcertoPreposto(a, com, vales);
  ctx.compartilhar({ blob, arquivo: `AcertoPreposto${n}.pdf`, titulo: `Acerto de preposto ${n}`, whatsapp: v?.cel, texto: `Acerto de comissão nº ${n}: ${moeda(a.valor, true)}.` });
}

export async function imprimirRemessa(n: number, ctx: Pick<Contexto, 'compartilhar' | 'avisar'>) {
  const titulos = await todos('cobranca', 'cobranca', n, 'id');
  if (!titulos.length) { ctx.avisar('Remessa não encontrada', 'erro'); return; }
  const docs = await todos('cheques', 'cobranca', n, 'id');
  const forn = await um('fornecedores', 'codigo', titulos[0].codfor);
  const blob = await pdfRemessa(n, titulos, docs, forn);
  ctx.compartilhar({ blob, arquivo: `Remessa${n}.pdf`, titulo: `Remessa ${n} - ${forn?.nome ?? titulos[0].fornecedor ?? ''}`, email: forn?.email, whatsapp: forn?.celular,
    assunto: `Remessa de cheques/depósitos nº ${n}`, texto: `Segue a remessa nº ${n} de cheques/depósitos.` });
}

export async function fichaCliente(c: Linha, ctx: Pick<Contexto, 'compartilhar'>) {
  const blob = await pdfFichaCliente(c);
  ctx.compartilhar({ blob, arquivo: `FichaCliente${c.codigo}.pdf`, titulo: `Ficha do cliente ${c.nome}`, texto: `Ficha cadastral: ${c.nome}` });
}
