'use client';
import type { Campo, Entidade, Filtro, Linha } from './tipos';
import type { BuscaConfig } from '@/components/Busca';
import { arred, hojeISO, linkWhatsApp, numero } from './formato';
import { supabase } from './supabase/client';
import { fichaCliente, imprimirAcerto, imprimirAcertoPreposto, imprimirCarta, imprimirPedido, imprimirRemessa, lancarTitulosDaCarta } from './acoes';

export const B_CLIENTE: BuscaConfig = { tabela: 'clientes', chave: 'codigo', exibir: 'nome', detalhe: 'cidade' };
export const B_REP: BuscaConfig = { tabela: 'fornecedores', chave: 'codigo', exibir: 'nome' };
export const B_VEND: BuscaConfig = { tabela: 'vendedor', chave: 'codigo', exibir: 'nome' };
export const B_TRANSP: BuscaConfig = { tabela: 'transportadoras', chave: 'codigo', exibir: 'nome', detalhe: 'cidade' };

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').map((u) => ({ valor: u, rotulo: u }));
export const FORMAS = ['Boleto', 'Carteira', 'Depósito', 'PIX', 'Cheque'].map((f) => ({ valor: f, rotulo: f }));
export const CARTEIRA_OPCOES = [{ valor: '1', rotulo: 'Boleto' }, { valor: '2', rotulo: 'Carteira' }, { valor: '3', rotulo: 'Depósito' }, { valor: '4', rotulo: 'PIX' }, { valor: '5', rotulo: 'Cheque' }];

const obs = (prefixo: string, n: number, primeiro = 1, grupo = 'Observações'): Campo[] =>
  Array.from({ length: n }, (_, i) => ({ nome: `${prefixo}${i === 0 && prefixo === 'obs' && primeiro === 0 ? '' : i + primeiro}`, rotulo: `Observação ${i + 1}`, largura: 2 as const, grupo }));

const endereco = (grupo = 'Endereço'): Campo[] => [
  { nome: 'rua', rotulo: 'Endereço (rua, número)', largura: 4, grupo },
  { nome: 'bairro', rotulo: 'Bairro', largura: 2, grupo },
  { nome: 'cidade', rotulo: 'Cidade', largura: 1, grupo },
  { nome: 'uf', rotulo: 'UF', tipo: 'opcoes', opcoes: UFS, largura: 1, grupo },
  { nome: 'cep', rotulo: 'CEP', largura: 1, grupo },
];

const situacao = (coluna: string, aberto: string, fechado: string, padrao: 'aberto' | 'fechado' | 'todos' = 'aberto'): Filtro =>
  ({ tipo: 'situacao', nome: 'situacao', rotulo: 'Situação', coluna, padrao, opcoes: [{ valor: 'aberto', rotulo: aberto }, { valor: 'fechado', rotulo: fechado }, { valor: 'todos', rotulo: 'Todos' }] });

const filtroRep: Filtro = { tipo: 'busca', nome: 'rep', rotulo: 'Representada', coluna: 'codfor', busca: B_REP };

// ---------------------------------------------------------------------------
export const clientes: Entidade = {
  slug: 'clientes', tabela: 'clientes', chave: 'codigo', titulo: 'Clientes', singular: 'Cliente',
  campos: [
    { nome: 'nome', rotulo: 'Razão social / nome', largura: 4, obrigatorio: true, grupo: 'Identificação' },
    { nome: 'cpf', rotulo: 'CNPJ / CPF', largura: 2, grupo: 'Identificação' },
    { nome: 'insc', rotulo: 'Inscrição estadual / RG', largura: 2, grupo: 'Identificação' },
    { nome: 'contato', rotulo: 'Contato', largura: 2, grupo: 'Identificação' },
    { nome: 'ativo', rotulo: 'Cliente ativo', tipo: 'logico', largura: 2, grupo: 'Identificação' },
    ...endereco(),
    { nome: 'ruacobra', rotulo: 'Endereço de cobrança', largura: 2, grupo: 'Endereço' },
    { nome: 'ruaentrega', rotulo: 'Local de entrega', largura: 2, grupo: 'Endereço' },
    { nome: 'telefone', rotulo: 'Telefone', largura: 1, grupo: 'Contato' },
    { nome: 'whatsapp', rotulo: 'WhatsApp', largura: 1, grupo: 'Contato' },
    { nome: 'celular', rotulo: 'Celular', largura: 2, grupo: 'Contato' },
    { nome: 'email', rotulo: 'E-mail', largura: 2, grupo: 'Contato' },
    { nome: 'emailfinan', rotulo: 'E-mail do financeiro', largura: 2, grupo: 'Contato' },
    ...obs('obs', 6),
  ],
  colunas: [
    { nome: 'codigo', rotulo: 'Cód.' }, { nome: 'nome', rotulo: 'Nome' }, { nome: 'cidade', rotulo: 'Cidade' },
    { nome: 'telefone', rotulo: 'Telefone' }, { nome: 'whatsapp', rotulo: 'WhatsApp' }, { nome: 'contato', rotulo: 'Contato' },
  ],
  buscaTexto: ['nome', 'cidade', 'cpf', 'contato', 'bairro'], buscaNumero: ['codigo'],
  ordem: [{ coluna: 'nome', asc: true }],
  filtros: [{ tipo: 'opcoes', nome: 'ativo', rotulo: 'Mostrar', coluna: 'ativo', padrao: 'true', opcoes: [{ valor: 'true', rotulo: 'Ativos' }, { valor: 'false', rotulo: 'Inativos' }] }],
  padrao: () => ({ ativo: true, uf: 'MG', ruacobra: 'O MESMO', ruaentrega: 'O MESMO' }),
  acoes: [
    { rotulo: 'Novo pedido', executar: (l, c) => c.ir(`/pedidos/novo?cliente=${l.codigo}`) },
    { rotulo: 'Ficha (PDF)', executar: (l, c) => fichaCliente(l, c) },
    { rotulo: 'O que já comprou', executar: (l, c) => c.ir(`/relatorios/compras-cliente?cliente=${l.codigo}`) },
    { rotulo: 'WhatsApp', mostrar: (l) => !!(l.whatsapp || l.celular), executar: (l) => { window.open(linkWhatsApp(l.whatsapp || l.celular), '_blank'); } },
  ],
};

export const representadas: Entidade = {
  slug: 'representadas', tabela: 'fornecedores', chave: 'codigo', titulo: 'Representadas', singular: 'Representada',
  descricao: 'Fábricas e fornecedores que você representa.',
  campos: [
    { nome: 'nome', rotulo: 'Razão social', largura: 4, obrigatorio: true, grupo: 'Identificação' },
    { nome: 'fantasia', rotulo: 'Nome fantasia', largura: 2, grupo: 'Identificação' },
    { nome: 'cgc', rotulo: 'CNPJ', largura: 1, grupo: 'Identificação' },
    { nome: 'insc', rotulo: 'Inscrição estadual', largura: 1, grupo: 'Identificação' },
    { nome: 'comissao', rotulo: 'Comissão padrão', tipo: 'percentual', largura: 1, grupo: 'Identificação', ajuda: 'Sugerida ao fazer um pedido' },
    { nome: 'ativo', rotulo: 'Ativa', tipo: 'logico', largura: 1, grupo: 'Identificação' },
    ...endereco(),
    { nome: 'contato', rotulo: 'Contato', largura: 2, grupo: 'Contato' },
    { nome: 'telefone', rotulo: 'Telefone', largura: 1, grupo: 'Contato' },
    { nome: 'celular', rotulo: 'Celular / WhatsApp', largura: 1, grupo: 'Contato' },
    { nome: 'fax', rotulo: 'Fax / outro telefone', largura: 2, grupo: 'Contato' },
    { nome: 'email', rotulo: 'E-mail', largura: 2, grupo: 'Contato' },
    { nome: 'obs', rotulo: 'Observação 1', largura: 2, grupo: 'Observações' },
    { nome: 'obs2', rotulo: 'Observação 2', largura: 2, grupo: 'Observações' },
    { nome: 'obs3', rotulo: 'Observação 3', largura: 2, grupo: 'Observações' },
    { nome: 'obs4', rotulo: 'Observação 4', largura: 2, grupo: 'Observações' },
    { nome: 'obs5', rotulo: 'Observação 5', largura: 2, grupo: 'Observações' },
    { nome: 'obs6', rotulo: 'Observação 6', largura: 2, grupo: 'Observações' },
  ],
  colunas: [{ nome: 'codigo', rotulo: 'Cód.' }, { nome: 'nome', rotulo: 'Nome' }, { nome: 'cidade', rotulo: 'Cidade' }, { nome: 'telefone', rotulo: 'Telefone' }, { nome: 'comissao', rotulo: 'Comissão', tipo: 'percentual' }],
  buscaTexto: ['nome', 'fantasia', 'cidade', 'cgc'], buscaNumero: ['codigo'],
  ordem: [{ coluna: 'nome', asc: true }],
  padrao: () => ({ ativo: true }),
  acoes: [
    { rotulo: 'Tabela de preços', executar: (l, c) => c.ir(`/relatorios/tabela-precos?rep=${l.codigo}`) },
    { rotulo: 'Produtos', executar: (l, c) => c.ir(`/c/produtos?rep=${l.codigo}`) },
    { rotulo: 'Contas bancárias', executar: (l, c) => c.ir(`/c/contas-representadas?rep=${l.codigo}`) },
  ],
};

export const produtos: Entidade = {
  slug: 'produtos', tabela: 'produtos', chave: 'codigo', titulo: 'Produtos', singular: 'Produto',
  campos: [
    { nome: 'produto', rotulo: 'Descrição', largura: 4, obrigatorio: true },
    { nome: 'fornecedor', rotulo: 'Representada', tipo: 'busca', largura: 2, obrigatorio: true, busca: { ...B_REP, textoCampo: 'fornecedornome' } },
    { nome: 'codfor', rotulo: 'Código na fábrica', largura: 1 },
    { nome: 'tipo', rotulo: 'Tipo', largura: 1 },
    { nome: 'unid', rotulo: 'Unidade', largura: 1 },
    { nome: 'embal', rotulo: 'Qtd. na embalagem', largura: 1 },
    { nome: 'ipi', rotulo: 'IPI / ST', tipo: 'percentual', largura: 1 },
    { nome: 'ativo', rotulo: 'Ativo', tipo: 'logico', largura: 1 },
    { nome: 'valor1', rotulo: 'Preço 1', tipo: 'moeda', largura: 1, grupo: 'Preços' },
    { nome: 'valor2', rotulo: 'Preço 2', tipo: 'moeda', largura: 1, grupo: 'Preços' },
    { nome: 'valor3', rotulo: 'Preço 3', tipo: 'moeda', largura: 1, grupo: 'Preços' },
    { nome: 'valor4', rotulo: 'Preço 4', tipo: 'moeda', largura: 1, grupo: 'Preços' },
    { nome: 'valor5', rotulo: 'Preço 5', tipo: 'moeda', largura: 1, grupo: 'Preços' },
    { nome: 'prazo1', rotulo: 'Prazo do preço 1', largura: 1, grupo: 'Preços' },
    { nome: 'prazo2', rotulo: 'Prazo do preço 2', largura: 1, grupo: 'Preços' },
    { nome: 'prazo3', rotulo: 'Prazo do preço 3', largura: 1, grupo: 'Preços' },
  ],
  colunas: [
    { nome: 'codigo', rotulo: 'Cód.' }, { nome: 'produto', rotulo: 'Descrição' }, { nome: 'fornecedornome', rotulo: 'Representada' },
    { nome: 'codfor', rotulo: 'Cód. fábrica' }, { nome: 'unid', rotulo: 'Unid.' },
    { nome: 'valor1', rotulo: 'Preço 1', tipo: 'moeda' }, { nome: 'valor2', rotulo: 'Preço 2', tipo: 'moeda' }, { nome: 'valor3', rotulo: 'Preço 3', tipo: 'moeda' },
    { nome: 'ipi', rotulo: 'IPI', tipo: 'percentual' },
  ],
  buscaTexto: ['produto', 'codfor', 'tipo'], buscaNumero: ['codigo'],
  ordem: [{ coluna: 'produto', asc: true }],
  filtros: [{ tipo: 'busca', nome: 'rep', rotulo: 'Representada', coluna: 'fornecedor', busca: B_REP },
    { tipo: 'opcoes', nome: 'ativo', rotulo: 'Mostrar', coluna: 'ativo', padrao: 'true', opcoes: [{ valor: 'true', rotulo: 'Ativos' }, { valor: 'false', rotulo: 'Inativos' }] }],
  padrao: () => ({ ativo: true, unid: 'UN' }),
};

export const transportadoras: Entidade = {
  slug: 'transportadoras', tabela: 'transportadoras', chave: 'codigo', titulo: 'Transportadoras', singular: 'Transportadora',
  campos: [
    { nome: 'nome', rotulo: 'Nome', largura: 4, obrigatorio: true },
    { nome: 'cnpj', rotulo: 'CNPJ', largura: 2 }, { nome: 'contato', rotulo: 'Contato', largura: 2 },
    ...endereco(),
    { nome: 'telefone', rotulo: 'Telefone', largura: 2, grupo: 'Contato' }, { nome: 'telefonebh', rotulo: 'Telefone em BH', largura: 2, grupo: 'Contato' },
    { nome: 'obs', rotulo: 'Observação 1', largura: 2, grupo: 'Contato' }, { nome: 'obs2', rotulo: 'Observação 2', largura: 2, grupo: 'Contato' },
  ],
  colunas: [{ nome: 'codigo', rotulo: 'Cód.' }, { nome: 'nome', rotulo: 'Nome' }, { nome: 'cidade', rotulo: 'Cidade' }, { nome: 'telefone', rotulo: 'Telefone' }, { nome: 'telefonebh', rotulo: 'Tel. BH' }],
  buscaTexto: ['nome', 'cidade', 'cnpj'], buscaNumero: ['codigo'],
  ordem: [{ coluna: 'nome', asc: true }],
};

export const vendedores: Entidade = {
  slug: 'vendedores', tabela: 'vendedor', chave: 'codigo', titulo: 'Vendedores e prepostos', singular: 'Vendedor',
  campos: [
    { nome: 'nome', rotulo: 'Nome', largura: 4, obrigatorio: true },
    { nome: 'cpf', rotulo: 'CPF', largura: 1 }, { nome: 'ci', rotulo: 'Identidade', largura: 1 },
    { nome: 'comissao', rotulo: 'Comissão do preposto', tipo: 'percentual', largura: 2, ajuda: 'Percentual lançado automaticamente nos pedidos deste vendedor' },
    ...endereco(),
    { nome: 'telefone', rotulo: 'Telefone', largura: 1, grupo: 'Contato' }, { nome: 'cel', rotulo: 'Celular', largura: 1, grupo: 'Contato' }, { nome: 'fax', rotulo: 'Outro telefone', largura: 2, grupo: 'Contato' },
    { nome: 'banco', rotulo: 'Banco', largura: 2, grupo: 'Dados bancários' }, { nome: 'agencia', rotulo: 'Agência', largura: 1, grupo: 'Dados bancários' }, { nome: 'conta', rotulo: 'Conta / PIX', largura: 1, grupo: 'Dados bancários' },
  ],
  colunas: [{ nome: 'codigo', rotulo: 'Cód.' }, { nome: 'nome', rotulo: 'Nome' }, { nome: 'cel', rotulo: 'Celular' }, { nome: 'comissao', rotulo: 'Comissão', tipo: 'percentual' }],
  buscaTexto: ['nome'], buscaNumero: ['codigo'], ordem: [{ coluna: 'nome', asc: true }],
};

export const tipos: Entidade = {
  slug: 'tipos', tabela: 'tipoproduto', chave: 'codigo', titulo: 'Tipos de produto', singular: 'Tipo de produto',
  campos: [{ nome: 'tipo', rotulo: 'Tipo', largura: 4, obrigatorio: true }],
  colunas: [{ nome: 'codigo', rotulo: 'Cód.' }, { nome: 'tipo', rotulo: 'Tipo' }],
  buscaTexto: ['tipo'], ordem: [{ coluna: 'tipo', asc: true }],
};

export const contas: Entidade = {
  slug: 'contas', tabela: 'contas', chave: 'id', titulo: 'Minhas contas bancárias', singular: 'Conta',
  descricao: 'Contas usadas para receber comissões. Aparecem para escolha no acerto com a representada.',
  campos: [
    { nome: 'descricao', rotulo: 'Descrição (ex.: Bradesco)', largura: 4, obrigatorio: true },
    { nome: 'banconome', rotulo: 'Titular', largura: 2 }, { nome: 'bancocpfcnpj', rotulo: 'CPF / CNPJ', largura: 2 },
    { nome: 'bancobanco', rotulo: 'Banco', largura: 2 }, { nome: 'bancoagencia', rotulo: 'Agência', largura: 1 }, { nome: 'bancoconta', rotulo: 'Conta', largura: 1 },
    { nome: 'bancotexto', rotulo: 'Texto extra (ex.: chave PIX)', largura: 4 },
  ],
  colunas: [{ nome: 'descricao', rotulo: 'Descrição' }, { nome: 'banconome', rotulo: 'Titular' }, { nome: 'bancobanco', rotulo: 'Banco' }, { nome: 'bancoagencia', rotulo: 'Agência' }, { nome: 'bancoconta', rotulo: 'Conta' }],
  buscaTexto: ['descricao', 'banconome', 'bancobanco'], ordem: [{ coluna: 'descricao', asc: true }],
};

export const contasRepresentadas: Entidade = {
  slug: 'contas-representadas', tabela: 'fornecedorescontas', consulta: 'v_fornecedorescontas', chave: 'id', titulo: 'Contas das representadas', singular: 'Conta da representada',
  descricao: 'Onde depositar os valores recebidos dos clientes de cada representada.',
  campos: [
    { nome: 'representada', rotulo: 'Representada', tipo: 'busca', largura: 4, obrigatorio: true, busca: { ...B_REP, textoCampo: 'nomerepresentada', salvarTexto: false } },
    { nome: 'nome', rotulo: 'Titular / favorecido', largura: 2 }, { nome: 'cpfcnpj', rotulo: 'CPF / CNPJ', largura: 2 },
    { nome: 'banco', rotulo: 'Banco', largura: 2 }, { nome: 'agencia', rotulo: 'Agência', largura: 1 }, { nome: 'conta', rotulo: 'Conta / PIX', largura: 1 },
  ],
  colunas: [{ nome: 'nomerepresentada', rotulo: 'Representada' }, { nome: 'nome', rotulo: 'Titular' }, { nome: 'banco', rotulo: 'Banco' }, { nome: 'agencia', rotulo: 'Agência' }, { nome: 'conta', rotulo: 'Conta' }],
  buscaTexto: ['nome', 'banco', 'nomerepresentada'], ordem: [{ coluna: 'representada', asc: true }],
  filtros: [{ tipo: 'busca', nome: 'rep', rotulo: 'Representada', coluna: 'representada', busca: B_REP }],
};

// ---------------------------------------------------------------------------
export const pedidos: Entidade = {
  slug: 'pedidos', tabela: 'pedidos', chave: 'pedido', titulo: 'Pedidos', singular: 'Pedido',
  campos: [], linkEditar: (l) => `/pedidos/${l.pedido}`, linkNovo: '/pedidos/novo',
  colunas: [
    { nome: 'pedido', rotulo: 'Nº' }, { nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'cliente', rotulo: 'Cliente' },
    { nome: 'fornecedor', rotulo: 'Representada' }, { nome: 'total', rotulo: 'Total', tipo: 'moeda' }, { nome: 'vrcomissao', rotulo: 'Comissão', tipo: 'moeda' },
    { nome: 's', rotulo: 'Situação' },
  ],
  buscaTexto: ['cliente', 'fornecedor', 'pedidocliente'], buscaNumero: ['pedido', 'codcli'],
  ordem: [{ coluna: 'pedido', asc: false }],
  filtros: [
    filtroRep,
    { tipo: 'busca', nome: 'cli', rotulo: 'Cliente', coluna: 'codcli', busca: B_CLIENTE },
    { tipo: 'periodo', nome: 'periodo', rotulo: 'Período', coluna: 'data' },
    { tipo: 'opcoes', nome: 's', rotulo: 'Situação', coluna: 's', padrao: 'A', opcoes: [{ valor: 'A', rotulo: 'Ativos' }, { valor: 'C', rotulo: 'Cancelados' }] },
  ],
  totais: ['total', 'vrcomissao'],
};

// ---------------------------------------------------------------------------
const calcComissao = (l: Linha, mudou: string, totalCampo = 'total', vrCampo = 'vrcomissao'): Linha => {
  const out: Linha = {};
  if ([totalCampo, 'comissao'].includes(mudou)) out[vrCampo] = String(arred(numero(l[totalCampo]) * numero(l.comissao) / 100, 4)).replace('.', ',');
  if (['entrega', 'comissao'].includes(mudou)) out.comissaoentrega = l.entrega == null || l.entrega === '' ? null : String(arred(numero(l.entrega) * numero(l.comissao) / 100, 4)).replace('.', ',');
  return out;
};

export const controleVendas: Entidade = {
  slug: 'controle-vendas', tabela: 'controlevendas', chave: 'id', titulo: 'Controle de vendas', singular: 'Lançamento de venda',
  descricao: 'Comissões a receber das representadas. Informe aqui a nota fiscal e o valor faturado (entrega) de cada pedido.',
  campos: [
    { nome: 'data', rotulo: 'Data', tipo: 'data', largura: 1 },
    { nome: 'pedido', rotulo: 'Pedido', tipo: 'numero', largura: 1 },
    { nome: 'ref', rotulo: 'Referência / NF', largura: 2, ajuda: 'Ex.: 12671/NF.14278' },
    { nome: 'codcli', rotulo: 'Cliente', tipo: 'busca', largura: 2, busca: { ...B_CLIENTE, textoCampo: 'cliente', preencher: { cidade: 'cidade' } } },
    { nome: 'cidade', rotulo: 'Cidade', largura: 2 },
    { nome: 'codfor', rotulo: 'Representada', tipo: 'busca', largura: 2, obrigatorio: true, busca: { ...B_REP, textoCampo: 'fornecedor' } },
    { nome: 'total', rotulo: 'Valor do pedido', tipo: 'moeda', largura: 1 },
    { nome: 'comissao', rotulo: 'Comissão', tipo: 'percentual', largura: 1 },
    { nome: 'vrcomissao', rotulo: 'Valor da comissão', tipo: 'moeda', largura: 2, ajuda: 'Calculado automaticamente, pode ser ajustado' },
    { nome: 'entrega', rotulo: 'Valor faturado (entrega)', tipo: 'moeda', largura: 1, grupo: 'Faturamento' },
    { nome: 'dataentrega', rotulo: 'Data do faturamento', tipo: 'data', largura: 1, grupo: 'Faturamento' },
    { nome: 'comissaoentrega', rotulo: 'Comissão sobre o faturado', tipo: 'moeda', largura: 2, grupo: 'Faturamento' },
    { nome: 'datapag', rotulo: 'Data do pagamento', tipo: 'data', largura: 2, grupo: 'Acerto' },
    { nome: 'codacerto', rotulo: 'Acerto nº', tipo: 'numero', largura: 2, somenteLeitura: true, grupo: 'Acerto' },
  ],
  colunas: [
    { nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'ref', rotulo: 'Pedido / NF' }, { nome: 'cliente', rotulo: 'Cliente' },
    { nome: 'fornecedor', rotulo: 'Representada' }, { nome: 'total', rotulo: 'Valor', tipo: 'moeda' }, { nome: 'comissao', rotulo: '%', tipo: 'percentual' },
    { nome: 'vrcomissao', rotulo: 'Comissão', tipo: 'moeda' }, { nome: 'entrega', rotulo: 'Faturado', tipo: 'moeda' },
    { nome: 'codacerto', rotulo: 'Situação', tipo: 'situacao', situacao: { vazio: 'Em aberto', preenchido: 'Acerto' } },
  ],
  buscaTexto: ['cliente', 'ref', 'fornecedor', 'cidade'], buscaNumero: ['pedido'],
  ordem: [{ coluna: 'data', asc: false }, { coluna: 'id', asc: false }],
  filtros: [situacao('codacerto', 'Em aberto', 'Já acertados'), filtroRep, { tipo: 'periodo', nome: 'periodo', rotulo: 'Período', coluna: 'data' }],
  totais: ['total', 'vrcomissao'],
  padrao: () => ({ data: hojeISO() }),
  calcular: (l, m) => calcComissao(l, m),
  antesDeSalvar: (l) => (l.codacerto ? 'Este lançamento já foi acertado. Desfaça o acerto para alterar.' : l),
  acoes: [{ rotulo: 'Abrir pedido', mostrar: (l) => !!l.pedido, executar: (l, c) => c.ir(`/pedidos/${l.pedido}`) }],
};

export const debitoCredito: Entidade = {
  slug: 'debito-credito', tabela: 'debitocredito', chave: 'id', titulo: 'Débitos e créditos', singular: 'Débito / crédito',
  descricao: 'Valores a descontar (negativos) ou somar (positivos) no próximo acerto com a representada.',
  campos: [
    { nome: 'codfor', rotulo: 'Representada', tipo: 'busca', largura: 4, obrigatorio: true, busca: { ...B_REP, textoCampo: 'fornecedor' } },
    { nome: 'data', rotulo: 'Data', tipo: 'data', largura: 1 },
    { nome: 'total', rotulo: 'Valor', tipo: 'moeda', largura: 1, obrigatorio: true, ajuda: 'Use sinal de menos para débito' },
    { nome: 'ref', rotulo: 'Referência', largura: 2 },
    { nome: 'historico', rotulo: 'Histórico', largura: 4 },
    { nome: 'codacerto', rotulo: 'Acerto nº', tipo: 'numero', largura: 2, somenteLeitura: true },
  ],
  colunas: [{ nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'fornecedor', rotulo: 'Representada' }, { nome: 'historico', rotulo: 'Histórico' },
    { nome: 'total', rotulo: 'Valor', tipo: 'moeda' }, { nome: 'codacerto', rotulo: 'Situação', tipo: 'situacao', situacao: { vazio: 'Em aberto', preenchido: 'Acerto' } }],
  buscaTexto: ['historico', 'fornecedor', 'ref'], ordem: [{ coluna: 'data', asc: false }],
  filtros: [situacao('codacerto', 'Em aberto', 'Já acertados'), filtroRep, { tipo: 'periodo', nome: 'periodo', rotulo: 'Período', coluna: 'data' }],
  totais: ['total'], padrao: () => ({ data: hojeISO() }),
  antesDeSalvar: (l) => (l.codacerto ? 'Este lançamento já foi acertado. Desfaça o acerto para alterar.' : l),
};

export const acertos: Entidade = {
  slug: 'acertos', tabela: 'acerto', chave: 'acerto', titulo: 'Acertos com representadas', singular: 'Acerto',
  descricao: 'Histórico dos acertos de comissão. Para fazer um novo, clique em "+ Novo".',
  linkNovo: '/acertos/novo', semExcluir: true,
  campos: [
    { nome: 'fornecedor', rotulo: 'Representada', largura: 4, somenteLeitura: true },
    { nome: 'data', rotulo: 'Data', tipo: 'data', largura: 1, somenteLeitura: true },
    { nome: 'vendas', rotulo: 'Vendas', tipo: 'moeda', largura: 1, somenteLeitura: true },
    { nome: 'comissao', rotulo: 'Comissão', tipo: 'moeda', largura: 1, somenteLeitura: true },
    { nome: 'receber', rotulo: 'A receber', tipo: 'moeda', largura: 1, somenteLeitura: true },
    { nome: 'obs1', rotulo: 'Observação 1', largura: 4 }, { nome: 'obs2', rotulo: 'Observação 2', largura: 4 }, { nome: 'obs3', rotulo: 'Observação 3', largura: 4 },
  ],
  colunas: [{ nome: 'acerto', rotulo: 'Nº' }, { nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'fornecedor', rotulo: 'Representada' },
    { nome: 'vendas', rotulo: 'Vendas', tipo: 'moeda' }, { nome: 'comissao', rotulo: 'Comissão', tipo: 'moeda' }, { nome: 'debitocredito', rotulo: 'Déb./Créd.', tipo: 'moeda' },
    { nome: 'receber', rotulo: 'A receber', tipo: 'moeda' }, { nome: 'obs1', rotulo: 'Obs.' }],
  buscaTexto: ['fornecedor', 'obs1'], buscaNumero: ['acerto'], ordem: [{ coluna: 'acerto', asc: false }],
  filtros: [filtroRep, { tipo: 'periodo', nome: 'periodo', rotulo: 'Período', coluna: 'data' }],
  totais: ['vendas', 'receber'],
  acoes: [
    { rotulo: 'Imprimir / enviar', executar: (l, c) => imprimirAcerto(l.acerto, c) },
    { rotulo: 'Desfazer acerto', executar: async (l, c) => {
      if (!(await c.confirmar(`Desfazer o acerto ${l.acerto}?`, { detalhe: 'Os lançamentos voltam a ficar em aberto no controle de vendas.', perigo: true, ok: 'Desfazer' }))) return;
      const { error } = await supabase().rpc('desfazer_acerto', { n: l.acerto });
      if (error) c.avisar(error.message, 'erro'); else { c.avisar('Acerto desfeito'); c.recarregar(); }
    } },
  ],
};

// ---------------------------------------------------------------------------
export const prepostoComissoes: Entidade = {
  slug: 'prepostos', tabela: 'preposto', chave: 'id', titulo: 'Comissões de prepostos', singular: 'Comissão de preposto',
  descricao: 'Comissões a pagar aos vendedores. São lançadas automaticamente pelos pedidos quando o vendedor tem comissão cadastrada.',
  campos: [
    { nome: 'codven', rotulo: 'Vendedor', tipo: 'busca', largura: 2, obrigatorio: true, busca: { ...B_VEND, textoCampo: 'vendedor' } },
    { nome: 'data', rotulo: 'Data', tipo: 'data', largura: 1 },
    { nome: 'pedido', rotulo: 'Pedido', tipo: 'numero', largura: 1 },
    { nome: 'codcli', rotulo: 'Cliente', tipo: 'busca', largura: 2, busca: { ...B_CLIENTE, textoCampo: 'cliente', preencher: { cidade: 'cidade' } } },
    { nome: 'codfor', rotulo: 'Representada', tipo: 'busca', largura: 2, busca: { ...B_REP, textoCampo: 'fornecedor' } },
    { nome: 'ref', rotulo: 'Referência', largura: 2 }, { nome: 'cidade', rotulo: 'Cidade', largura: 2 },
    { nome: 'total', rotulo: 'Valor do pedido', tipo: 'moeda', largura: 1 },
    { nome: 'comissao', rotulo: 'Comissão', tipo: 'percentual', largura: 1 },
    { nome: 'vrcomissao', rotulo: 'Valor da comissão', tipo: 'moeda', largura: 2 },
    { nome: 'entrega', rotulo: 'Valor faturado', tipo: 'moeda', largura: 1, grupo: 'Faturamento' },
    { nome: 'dataentrega', rotulo: 'Data do faturamento', tipo: 'data', largura: 1, grupo: 'Faturamento' },
    { nome: 'comissaoentrega', rotulo: 'Comissão a pagar', tipo: 'moeda', largura: 2, grupo: 'Faturamento', ajuda: 'É este valor que entra no acerto' },
    { nome: 'acerto', rotulo: 'Acerto nº', tipo: 'numero', largura: 2, somenteLeitura: true, grupo: 'Acerto' },
    { nome: 'datapag', rotulo: 'Data do pagamento', tipo: 'data', largura: 2, grupo: 'Acerto' },
  ],
  colunas: [{ nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'vendedor', rotulo: 'Vendedor' }, { nome: 'ref', rotulo: 'Pedido' }, { nome: 'cliente', rotulo: 'Cliente' },
    { nome: 'fornecedor', rotulo: 'Representada' }, { nome: 'total', rotulo: 'Valor', tipo: 'moeda' }, { nome: 'comissao', rotulo: '%', tipo: 'percentual' },
    { nome: 'comissaoentrega', rotulo: 'Comissão', tipo: 'moeda' }, { nome: 'acerto', rotulo: 'Situação', tipo: 'situacao', situacao: { vazio: 'Em aberto', preenchido: 'Acerto' } }],
  buscaTexto: ['cliente', 'vendedor', 'fornecedor', 'ref'], buscaNumero: ['pedido'],
  ordem: [{ coluna: 'data', asc: false }],
  filtros: [situacao('acerto', 'Em aberto', 'Já acertados'), { tipo: 'busca', nome: 'vend', rotulo: 'Vendedor', coluna: 'codven', busca: B_VEND }, { tipo: 'periodo', nome: 'periodo', rotulo: 'Período', coluna: 'data' }],
  totais: ['total', 'comissaoentrega'], padrao: () => ({ data: hojeISO() }),
  calcular: (l, m) => {
    const o = calcComissao(l, m);
    if (m === 'total' && (l.entrega == null || l.entrega === '')) { o.entrega = l.total; o.comissaoentrega = o.vrcomissao; }
    return o;
  },
  antesDeSalvar: (l) => (l.acerto != null ? 'Esta comissão já foi acertada. Desfaça o acerto para alterar.' : l),
};

export const vales: Entidade = {
  slug: 'vales', tabela: 'vales', chave: 'id', titulo: 'Vales de prepostos', singular: 'Vale',
  descricao: 'Adiantamentos (valores negativos) ou créditos (positivos) a considerar no próximo acerto do vendedor.',
  campos: [
    { nome: 'codven', rotulo: 'Vendedor', tipo: 'busca', largura: 4, obrigatorio: true, busca: { ...B_VEND, textoCampo: 'vendedor' } },
    { nome: 'data', rotulo: 'Data', tipo: 'data', largura: 2 },
    { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', largura: 2, obrigatorio: true, ajuda: 'Adiantamento: use sinal de menos (ex.: -100)' },
    { nome: 'historico', rotulo: 'Histórico', largura: 4 },
    { nome: 'acerto', rotulo: 'Acerto nº', tipo: 'numero', largura: 2, somenteLeitura: true },
  ],
  colunas: [{ nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'vendedor', rotulo: 'Vendedor' }, { nome: 'historico', rotulo: 'Histórico' }, { nome: 'valor', rotulo: 'Valor', tipo: 'moeda' },
    { nome: 'acerto', rotulo: 'Situação', tipo: 'situacao', situacao: { vazio: 'Em aberto', preenchido: 'Acerto' } }],
  buscaTexto: ['vendedor', 'historico'], ordem: [{ coluna: 'data', asc: false }],
  filtros: [situacao('acerto', 'Em aberto', 'Já acertados'), { tipo: 'busca', nome: 'vend', rotulo: 'Vendedor', coluna: 'codven', busca: B_VEND }],
  totais: ['valor'], padrao: () => ({ data: hojeISO() }),
  antesDeSalvar: (l) => (l.acerto != null ? 'Este vale já foi acertado.' : l),
};

export const acertosPrepostos: Entidade = {
  slug: 'acertos-prepostos', tabela: 'acertovendedor', chave: 'acerto', titulo: 'Acertos de prepostos', singular: 'Acerto de preposto',
  linkNovo: '/prepostos/acerto', semExcluir: true,
  campos: [
    { nome: 'nomevendedor', rotulo: 'Vendedor', largura: 2, somenteLeitura: true },
    { nome: 'data', rotulo: 'Data', tipo: 'data', largura: 1, somenteLeitura: true },
    { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', largura: 1, somenteLeitura: true },
    { nome: 'nome', rotulo: 'Favorecido', largura: 2 }, { nome: 'banco', rotulo: 'Banco', largura: 2 },
    { nome: 'agencia', rotulo: 'Agência', largura: 2 }, { nome: 'conta', rotulo: 'Conta', largura: 2 }, { nome: 'obs', rotulo: 'Observação', largura: 4 },
  ],
  colunas: [{ nome: 'acerto', rotulo: 'Nº' }, { nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'nomevendedor', rotulo: 'Vendedor' }, { nome: 'valor', rotulo: 'Valor', tipo: 'moeda' }, { nome: 'obs', rotulo: 'Obs.' }],
  buscaTexto: ['nomevendedor', 'obs'], buscaNumero: ['acerto'], ordem: [{ coluna: 'acerto', asc: false }],
  totais: ['valor'],
  acoes: [
    { rotulo: 'Imprimir / enviar', executar: (l, c) => imprimirAcertoPreposto(l.acerto, c) },
    { rotulo: 'Desfazer acerto', executar: async (l, c) => {
      if (!(await c.confirmar(`Desfazer o acerto de preposto ${l.acerto}?`, { perigo: true, ok: 'Desfazer' }))) return;
      const { error } = await supabase().rpc('desfazer_acerto_preposto', { n: l.acerto });
      if (error) c.avisar(error.message, 'erro'); else { c.avisar('Acerto desfeito'); c.recarregar(); }
    } },
  ],
};

// ---------------------------------------------------------------------------
export const titulos: Entidade = {
  slug: 'titulos', tabela: 'cobranca', chave: 'id', titulo: 'Títulos a receber', singular: 'Título',
  descricao: 'Valores que você recebe dos clientes e repassa às representadas. Para repassar, use "Registrar remessa".',
  campos: [
    { nome: 'codcli', rotulo: 'Cliente', tipo: 'busca', largura: 2, obrigatorio: true, busca: { ...B_CLIENTE, textoCampo: 'cliente' } },
    { nome: 'codfor', rotulo: 'Representada', tipo: 'busca', largura: 2, obrigatorio: true, busca: { ...B_REP, textoCampo: 'fornecedor' } },
    { nome: 'pedido', rotulo: 'Pedido', tipo: 'numero', largura: 1 },
    { nome: 'ref', rotulo: 'Referência / NF / parcela', largura: 3 },
    { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', largura: 1, obrigatorio: true },
    { nome: 'vencimento', rotulo: 'Vencimento', tipo: 'data', largura: 1 },
    { nome: 'boletocarteira', rotulo: 'Forma', tipo: 'opcoes', opcoes: FORMAS, largura: 2 },
    { nome: 'obs', rotulo: 'Observação', largura: 4 },
    { nome: 'cobranca', rotulo: 'Remessa nº', tipo: 'numero', largura: 1, somenteLeitura: true, grupo: 'Recebimento' },
    { nome: 'data', rotulo: 'Recebido em', tipo: 'data', largura: 1, somenteLeitura: true, grupo: 'Recebimento' },
    { nome: 'vjuros', rotulo: 'Juros', tipo: 'moeda', largura: 1, somenteLeitura: true, grupo: 'Recebimento' },
    { nome: 'total', rotulo: 'Total', tipo: 'moeda', largura: 1, somenteLeitura: true, grupo: 'Recebimento' },
    { nome: 'depnome', rotulo: 'Depositado para', largura: 2, somenteLeitura: true, grupo: 'Recebimento' },
    { nome: 'depbanco', rotulo: 'Banco', largura: 1, somenteLeitura: true, grupo: 'Recebimento' },
    { nome: 'depconta', rotulo: 'Conta', largura: 1, somenteLeitura: true, grupo: 'Recebimento' },
  ],
  colunas: [{ nome: 'vencimento', rotulo: 'Vencimento', tipo: 'data' }, { nome: 'cliente', rotulo: 'Cliente' }, { nome: 'fornecedor', rotulo: 'Representada' },
    { nome: 'ref', rotulo: 'Referência' }, { nome: 'valor', rotulo: 'Valor', tipo: 'moeda' }, { nome: 'boletocarteira', rotulo: 'Forma' },
    { nome: 'cobranca', rotulo: 'Situação', tipo: 'situacao', situacao: { vazio: 'Em aberto', preenchido: 'Remessa' } }],
  buscaTexto: ['cliente', 'fornecedor', 'ref'], buscaNumero: ['pedido', 'cobranca'],
  ordem: [{ coluna: 'vencimento', asc: true }],
  filtros: [situacao('cobranca', 'Em aberto', 'Já repassados'), filtroRep, { tipo: 'busca', nome: 'cli', rotulo: 'Cliente', coluna: 'codcli', busca: B_CLIENTE }, { tipo: 'periodo', nome: 'venc', rotulo: 'Vencimento', coluna: 'vencimento' }],
  totais: ['valor'],
  antesDeSalvar: (l) => (l.cobranca != null ? 'Este título já foi repassado numa remessa. Desfaça a remessa para alterar.' : l),
};

export const remessas: Entidade = {
  slug: 'remessas', tabela: 'cobranca', consulta: 'v_remessas', chave: 'numero', titulo: 'Remessas de cobrança', singular: 'Remessa',
  descricao: 'Cheques e depósitos repassados às representadas.', somenteLeitura: true, linkNovo: '/cobranca/remessa',
  campos: [
    { nome: 'numero', rotulo: 'Número', largura: 1 }, { nome: 'data', rotulo: 'Data', tipo: 'data', largura: 1 },
    { nome: 'fornecedor', rotulo: 'Representada', largura: 2 }, { nome: 'titulos', rotulo: 'Títulos', tipo: 'numero', largura: 1 },
    { nome: 'total', rotulo: 'Total', tipo: 'moeda', largura: 1 }, { nome: 'depnome', rotulo: 'Depositado para', largura: 2 },
  ],
  colunas: [{ nome: 'numero', rotulo: 'Nº' }, { nome: 'data', rotulo: 'Data', tipo: 'data' }, { nome: 'fornecedor', rotulo: 'Representada' },
    { nome: 'titulos', rotulo: 'Títulos', tipo: 'numero' }, { nome: 'total', rotulo: 'Total', tipo: 'moeda' }, { nome: 'depnome', rotulo: 'Depositado para' }],
  buscaTexto: ['fornecedor', 'depnome'], buscaNumero: ['numero'], ordem: [{ coluna: 'numero', asc: false }],
  filtros: [filtroRep, { tipo: 'periodo', nome: 'periodo', rotulo: 'Período', coluna: 'data' }],
  acoes: [
    { rotulo: 'Imprimir / enviar', executar: (l, c) => imprimirRemessa(l.numero, c) },
    { rotulo: 'Desfazer remessa', executar: async (l, c) => {
      if (!(await c.confirmar(`Desfazer a remessa ${l.numero}?`, { detalhe: 'Os títulos voltam a ficar em aberto e os cheques/depósitos desta remessa são apagados.', perigo: true, ok: 'Desfazer' }))) return;
      const { error } = await supabase().rpc('desfazer_remessa', { n: l.numero });
      if (error) c.avisar(error.message, 'erro'); else { c.avisar('Remessa desfeita'); c.recarregar(); }
    } },
  ],
};

const vencimentos: Campo[] = [1, 2, 3, 4, 5].flatMap((i) => [
  { nome: `vencimentodata${i}`, rotulo: `Vencimento ${i}`, tipo: 'data' as const, largura: 1 as const, grupo: 'Vencimentos' },
  { nome: `vencimentovalor${i}`, rotulo: 'Valor', tipo: 'moeda' as const, largura: 2 as const, grupo: 'Vencimentos' },
  { nome: `vencimentoboletocarteira${i}`, rotulo: 'Forma', tipo: 'opcoes' as const, opcoes: CARTEIRA_OPCOES, largura: 1 as const, grupo: 'Vencimentos' },
]);

export const cartas: Entidade = {
  slug: 'cartas', tabela: 'cartacobranca', consulta: 'v_cartacobranca', chave: 'id', titulo: 'Cartas de cobrança', singular: 'Carta de cobrança',
  descricao: 'Carta enviada ao cliente com os vencimentos e os dados para pagamento. Dica: crie a carta direto pela tela do pedido.',
  campos: [
    { nome: 'cliente', rotulo: 'Cliente', tipo: 'busca', largura: 2, obrigatorio: true, busca: { ...B_CLIENTE, textoCampo: 'nomecliente', salvarTexto: false, preencher: { email: 'emailfinan' } } },
    { nome: 'fornecedor', rotulo: 'Representada', tipo: 'busca', largura: 2, obrigatorio: true, busca: { ...B_REP, textoCampo: 'nomefornecedor', salvarTexto: false } },
    { nome: 'pedido', rotulo: 'Pedido', tipo: 'numero', largura: 1 },
    { nome: 'criado_em', rotulo: 'Data da carta', tipo: 'data', largura: 1 },
    { nome: 'email', rotulo: 'E-mail do cliente', largura: 2 },
    { nome: 'titulodespesa', rotulo: 'Título da despesa', largura: 2 },
    { nome: 'despesa', rotulo: 'Valor da despesa / IPI', largura: 2 },
    ...vencimentos,
    ...obs('obs', 6),
  ],
  colunas: [{ nome: 'id', rotulo: 'Nº' }, { nome: 'criado_em', rotulo: 'Data', tipo: 'data' }, { nome: 'pedido', rotulo: 'Pedido' }, { nome: 'nomecliente', rotulo: 'Cliente' },
    { nome: 'nomefornecedor', rotulo: 'Representada' }, { nome: 'vencimentodata1', rotulo: '1º venc.', tipo: 'data' }, { nome: 'vencimentovalor1', rotulo: 'Valor', tipo: 'moeda' }],
  buscaTexto: ['nomecliente', 'nomefornecedor', 'email'], buscaNumero: ['id', 'pedido'],
  ordem: [{ coluna: 'id', asc: false }],
  filtros: [{ tipo: 'busca', nome: 'rep', rotulo: 'Representada', coluna: 'fornecedor', busca: B_REP }, { tipo: 'busca', nome: 'cli', rotulo: 'Cliente', coluna: 'cliente', busca: B_CLIENTE }],
  padrao: () => ({ criado_em: hojeISO(), titulodespesa: 'Desp./IPI', despesa: '0' }),
  acoes: [
    { rotulo: 'Imprimir / enviar', executar: (l, c) => imprimirCarta(l.id, c) },
    { rotulo: 'Lançar em títulos a receber', executar: (l, c) => lancarTitulosDaCarta(l, c) },
    { rotulo: 'Abrir pedido', mostrar: (l) => !!l.pedido, executar: (l, c) => c.ir(`/pedidos/${l.pedido}`) },
  ],
};

export const ENTIDADES: Record<string, Entidade> = Object.fromEntries(
  [clientes, representadas, produtos, transportadoras, vendedores, tipos, contas, contasRepresentadas, pedidos,
    controleVendas, debitoCredito, acertos, prepostoComissoes, vales, acertosPrepostos, titulos, remessas, cartas].map((e) => [e.slug, e]),
);

export { imprimirPedido };
