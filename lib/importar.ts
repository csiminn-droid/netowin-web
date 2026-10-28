// Conversão das tabelas do sistema antigo (Paradox) para o banco novo.
import type { ParadoxRow } from './paradox';

type Valor = string | number | boolean | null;
export type Linha = Record<string, Valor>;

type Fonte = {
  arquivo: string;               // nome do arquivo .DB (sem diferenciar maiúsculas)
  renomear?: Record<string, string>;
  ignorar?: string[];
  fixo?: Record<string, Valor>;  // valores fixos (ex.: marcar como em aberto)
};

export type Destino = { tabela: string; colunas: string[]; fontes: Fonte[]; ordem: number };

const c = (s: string) => s.split(/\s+/).filter(Boolean);

export const DESTINOS: Destino[] = [
  { ordem: 1, tabela: 'clientes', colunas: c('codigo nome cidade bairro rua uf cep telefone cpf contato insc whatsapp celular email emailfinan ruacobra ruaentrega obs1 obs2 obs3 obs4 obs5 obs6'),
    fontes: [{ arquivo: 'clientes.db', renomear: { fax: 'whatsapp' } }] },
  { ordem: 2, tabela: 'fornecedores', colunas: c('codigo nome fantasia contato insc cgc rua bairro cidade uf cep telefone fax celular email obs obs2 obs3 obs4 obs5 obs6'),
    fontes: [{ arquivo: 'fornecedores.db' }] },
  { ordem: 3, tabela: 'fornecedorescontas', colunas: c('id representada nome banco agencia conta cpfcnpj'),
    fontes: [{ arquivo: 'fornecedorescontas.db', renomear: { codint: 'id' } }] },
  { ordem: 4, tabela: 'contas', colunas: c('id descricao banconome bancocpfcnpj bancobanco bancoagencia bancoconta bancotexto'),
    fontes: [{ arquivo: 'contas.db', renomear: { codint: 'id' } }] },
  { ordem: 5, tabela: 'tipoproduto', colunas: c('codigo tipo'), fontes: [{ arquivo: 'tipoproduto.db' }] },
  { ordem: 6, tabela: 'produtos', colunas: c('codigo produto fornecedor fornecedornome valor1 valor2 valor3 valor4 valor5 unid ipi prazo1 prazo2 prazo3 prazo4 prazo5 embal codfor tipo'),
    fontes: [{ arquivo: 'produtos.db' }] },
  { ordem: 7, tabela: 'transportadoras', colunas: c('codigo nome rua bairro cidade uf cep telefone telefonebh contato obs obs2 cnpj'),
    fontes: [{ arquivo: 'transportadoras.db' }] },
  { ordem: 8, tabela: 'vendedor', colunas: c('codigo nome cidade bairro rua uf cep telefone cpf fax cel ci'),
    fontes: [{ arquivo: 'vendedor.db' }] },
  { ordem: 9, tabela: 'pedidos', colunas: c('pedido data pedidocliente datapedidocliente comissao vrcomissao codcli cliente codfor fornecedor subtotal total desc1 desc1v desc2 desc2v desc3 desc3v desc4 desc4v desc5 desc5v prazo codtransp transportadora vendedor obs1 obs2 obs3 entrega tipocobr tipovenda s'),
    fontes: [{ arquivo: 'pedidos.db' }] },
  { ordem: 10, tabela: 'produtospedido', colunas: c('id pedido produto nomeproduto unid forn quant valor subtotal ipi caixa comissao codfor codcli data marca naoenviado quantenviado subtotalenviado'),
    fontes: [{ arquivo: 'produtospedido.db', renomear: { codint: 'id' } }] },
  { ordem: 11, tabela: 'acerto', colunas: c('acerto codfor fornecedor vendas comissao debitocredito receber data obs1 obs2 obs3 banconome bancocpfcnpj bancobanco bancoagencia bancoconta bancotexto fornecedorrua fornecedorbairro fornecedorcidade fornecedoruf fornecedorcep fornecedortelefone fornecedoremail fornecedorcgc fornecedorinsc'),
    fontes: [{ arquivo: 'acerto.db' }] },
  { ordem: 12, tabela: 'controlevendas', colunas: c('data comissao vrcomissao codcli cliente codfor fornecedor total pedido ref cidade marca entrega comissaoentrega dataentrega datapag codacerto'),
    fontes: [{ arquivo: 'controlevendas.db', fixo: { codacerto: null } }, { arquivo: 'acertocontrolevendas.db' }] },
  { ordem: 13, tabela: 'debitocredito', colunas: c('codfor fornecedor historico total data ref codacerto'),
    fontes: [{ arquivo: 'debitocredito.db', fixo: { codacerto: null } }, { arquivo: 'acertodebitocredito.db' }] },
  { ordem: 14, tabela: 'acertovendedor', colunas: c('acerto codigo nomevendedor nome banco agencia conta obs data valor'),
    fontes: [{ arquivo: 'acertovendedor.db' }] },
  { ordem: 15, tabela: 'preposto', colunas: c('codven vendedor data ref pedido total vrcomissao comissao codcli cliente codfor fornecedor cidade marca entrega dataentrega comissaoentrega datapag acerto'),
    fontes: [{ arquivo: 'preposto.db', fixo: { acerto: null } }, { arquivo: 'prepostomorto.db' }] },
  { ordem: 16, tabela: 'vales', colunas: c('codven vendedor historico valor data acerto'),
    fontes: [{ arquivo: 'vales.db', fixo: { acerto: null } }, { arquivo: 'valesmorto.db' }] },
  { ordem: 17, tabela: 'cobranca', colunas: c('cobranca ref pedido codcli cliente codfor fornecedor valor vencimento boletocarteira marca obs data total vjuros obs1 obs2 obs3 depnome depbanco depagencia depconta deptexto depositari'),
    fontes: [{ arquivo: 'cobranca.db', fixo: { cobranca: null } }, { arquivo: 'cobrado.db' }] },
  { ordem: 18, tabela: 'cheques', colunas: c('id cobranca banco numero datavenc valor obs'),
    fontes: [{ arquivo: 'cheques.db', renomear: { codint: 'id' } }] },
  { ordem: 19, tabela: 'cartacobranca', colunas: c('id cliente fornecedor pedido despesa titulodespesa vencimentodata1 vencimentovalor1 vencimentoboletocarteira1 vencimentodata2 vencimentovalor2 vencimentoboletocarteira2 vencimentodata3 vencimentovalor3 vencimentoboletocarteira3 vencimentodata4 vencimentovalor4 vencimentoboletocarteira4 vencimentodata5 vencimentovalor5 vencimentoboletocarteira5 obs1 obs2 obs3 obs4 obs5 obs6 email'),
    fontes: [{ arquivo: 'cartacobranca.db', renomear: { codint: 'id' } }] },
];

export const ARQUIVO_SISTEMA = 'sistema.db';

const COLUNAS_DATA = new Set(['data', 'dataentrega', 'datapag', 'vencimento', 'datavenc', 'vencimentodata1', 'vencimentodata2', 'vencimentodata3', 'vencimentodata4', 'vencimentodata5']);
const COLUNAS_ZERO_VIRA_NULO = new Set(['codacerto']);
const OBRIGATORIAS: Record<string, string> = { nome: '(sem nome)', produto: '(sem descrição)' };

/** Corrige datas digitadas errado no sistema antigo (ano 2000, datas vazias 30/12/1899 etc.) */
export function corrigirData(v: Valor): string | null {
  if (v == null || v === '') return null;
  let s = String(v).trim();
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    let y = Number(br[3]); if (br[3].length === 2) y += y > 50 ? 1900 : 2000;
    s = `${String(y).padStart(4, '0')}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  let y = Number(m[1]); const mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  if (s.startsWith('1899-12-30')) return null;
  if (y >= 2080 && y <= 2099) y -= 100;        // 2098 -> 1998
  else if (y >= 2200 && y <= 2230) y -= 200;   // 2203 -> 2003
  else if (y >= 200 && y <= 230) y += 1800;    // 0203 -> 2003
  else if (y >= 1900 && y <= 1930) y += 100;   // 1904 -> 2004
  if (y < 1990 || y > 2100) return null;
  return `${y}-${m[2]}-${m[3]}`;
}

export function converterLinhas(destino: Destino, fonte: Fonte, linhas: ParadoxRow[]): Linha[] {
  const cols = new Set(destino.colunas);
  return linhas.map((r) => {
    const out: Linha = {};
    for (const [k0, v0] of Object.entries(r)) {
      let k = k0.toLowerCase();
      if (fonte.renomear?.[k]) k = fonte.renomear[k];
      if (!cols.has(k)) continue;
      let v: Valor = v0;
      if (typeof v === 'string') { v = v.replace(/\u0000/g, '').trim(); if (v === '' || v === '/  /' || v === '  /  /') v = null; }
      if (COLUNAS_DATA.has(k)) v = corrigirData(v);
      if (COLUNAS_ZERO_VIRA_NULO.has(k) && v === 0) v = null;
      if (typeof v === 'number' && !Number.isFinite(v)) v = null;
      out[k] = v;
    }
    if (fonte.fixo) Object.assign(out, fonte.fixo);
    for (const col of destino.colunas) if (!(col in out)) out[col] = null;
    for (const [col, padrao] of Object.entries(OBRIGATORIAS)) if (col in out && out[col] == null && (destino.tabela !== 'produtospedido')) out[col] = padrao;
    return out;
  });
}

export function converterSistema(linha: ParadoxRow | undefined): Linha | null {
  if (!linha) return null;
  const g = (k: string) => {
    const e = Object.entries(linha).find(([kk]) => kk.toLowerCase() === k);
    const v = e?.[1];
    return typeof v === 'string' ? v.trim() || null : null;
  };
  const linhas = ['linha1', 'linha2', 'linha3', 'linha4', 'linha5'].map(g).filter(Boolean).join(' ');
  const email = linhas.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
  const linhaZap = ['linha1', 'linha2', 'linha3', 'linha4', 'linha5'].map(g).find((l) => l && /whats/i.test(l)) || '';
  const zap = linhaZap.match(/\(\d{2}\)\s*\d{4,5}-?\d{4}/g)?.pop() ?? null;
  return { id: 1, empresa: g('empresa'), titulo1: g('titulo1'), titulo2: g('titulo2'),
    linha1: g('linha1'), linha2: g('linha2'), linha3: g('linha3'), linha4: g('linha4'), linha5: g('linha5'), email, whatsapp: zap };
}
