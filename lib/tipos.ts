import type { BuscaConfig } from '@/components/Busca';

export type Linha = Record<string, any>;

export type Campo = {
  nome: string;
  rotulo: string;
  tipo?: 'texto' | 'numero' | 'moeda' | 'percentual' | 'data' | 'area' | 'opcoes' | 'busca' | 'logico';
  opcoes?: { valor: string; rotulo: string }[];
  busca?: BuscaConfig & { textoCampo: string; preencher?: Record<string, string>; salvarTexto?: boolean };
  largura?: 1 | 2 | 3 | 4;
  obrigatorio?: boolean;
  somenteLeitura?: boolean;
  ajuda?: string;
  grupo?: string;
};

export type Coluna = {
  nome: string;
  rotulo: string;
  tipo?: 'texto' | 'moeda' | 'data' | 'numero' | 'percentual' | 'situacao' | 'logico';
  situacao?: { vazio: string; preenchido: string };   // ex.: Em aberto / Acerto nº
  classe?: string;
};

export type Filtro =
  | { tipo: 'situacao'; nome: string; rotulo: string; coluna: string; opcoes: { valor: 'aberto' | 'fechado' | 'todos'; rotulo: string }[]; padrao: 'aberto' | 'fechado' | 'todos' }
  | { tipo: 'busca'; nome: string; rotulo: string; coluna: string; busca: BuscaConfig }
  | { tipo: 'periodo'; nome: string; rotulo: string; coluna: string }
  | { tipo: 'opcoes'; nome: string; rotulo: string; coluna: string; opcoes: { valor: string; rotulo: string }[]; padrao?: string };

export type CompartilharPedido = { blob: Blob; arquivo: string; titulo: string; whatsapp?: string | null; email?: string | null; texto?: string; assunto?: string };
export type Contexto = {
  recarregar: () => void;
  avisar: (t: string, tipo?: 'ok' | 'erro') => void;
  compartilhar: (p: CompartilharPedido) => void;
  ir: (url: string) => void;
  confirmar: (texto: string, o?: { detalhe?: string; ok?: string; perigo?: boolean }) => Promise<boolean>;
};
export type Acao = {
  rotulo: string;
  executar: (linha: Linha, ctx: Contexto) => void | Promise<void>;
  mostrar?: (linha: Linha) => boolean;
};

export type Entidade = {
  slug: string;
  tabela: string;
  consulta?: string;   // view usada só para listar (com nomes juntados)
  chave: string;
  titulo: string;
  singular: string;
  descricao?: string;
  campos: Campo[];
  colunas: Coluna[];
  buscaTexto: string[];
  buscaNumero?: string[];
  ordem: { coluna: string; asc: boolean }[];
  filtros?: Filtro[];
  padrao?: () => Linha;
  calcular?: (l: Linha, mudou: string) => Linha;
  antesDeSalvar?: (l: Linha) => Linha | string;   // string = mensagem de erro
  somenteLeitura?: boolean;
  semNovo?: boolean;
  semExcluir?: boolean;
  linkEditar?: (l: Linha) => string;
  linkNovo?: string;
  acoes?: Acao[];
  acoesLista?: { rotulo: string; executar: (linhas: Linha[], filtros: Record<string, any>, ctx: Contexto) => void | Promise<void> }[];
  totais?: string[];
  chaveAutomatica?: boolean;  // código gerado pelo banco
};
