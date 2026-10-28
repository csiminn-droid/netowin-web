'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Formulario from '@/components/Formulario';
import { Cabecalho, Carregando, useToast } from '@/components/ui';
import { limparCacheSistema } from '@/lib/pdf';
import { buscarTodos } from '@/lib/supabase/todos';
import { baixar } from '@/components/Compartilhar';
import { hojeISO } from '@/lib/formato';

const CHAVES: Record<string, string> = { clientes: 'codigo', fornecedores: 'codigo', tipoproduto: 'codigo', produtos: 'codigo', transportadoras: 'codigo', vendedor: 'codigo', pedidos: 'pedido', acerto: 'acerto', acertovendedor: 'acerto' };
const TABELAS = ['sistema', 'clientes', 'fornecedores', 'fornecedorescontas', 'contas', 'tipoproduto', 'produtos', 'transportadoras', 'vendedor', 'pedidos', 'produtospedido', 'acerto', 'controlevendas', 'debitocredito', 'acertovendedor', 'preposto', 'vales', 'cobranca', 'cheques', 'cartacobranca'];
import type { Campo, Linha } from '@/lib/tipos';

const CAMPOS: Campo[] = [
  { nome: 'empresa', rotulo: 'Nome da empresa', largura: 4, grupo: 'Cabeçalho dos impressos' },
  { nome: 'titulo1', rotulo: 'Título (linha 1, em destaque)', largura: 2, grupo: 'Cabeçalho dos impressos' },
  { nome: 'titulo2', rotulo: 'Título (linha 2)', largura: 2, grupo: 'Cabeçalho dos impressos' },
  { nome: 'linha1', rotulo: 'Linha 1', largura: 4, grupo: 'Cabeçalho dos impressos' },
  { nome: 'linha2', rotulo: 'Linha 2', largura: 4, grupo: 'Cabeçalho dos impressos' },
  { nome: 'linha3', rotulo: 'Linha 3', largura: 4, grupo: 'Cabeçalho dos impressos' },
  { nome: 'linha4', rotulo: 'Linha 4', largura: 4, grupo: 'Cabeçalho dos impressos' },
  { nome: 'linha5', rotulo: 'Linha 5', largura: 4, grupo: 'Cabeçalho dos impressos' },
  { nome: 'cidade', rotulo: 'Cidade (usada nas cartas)', largura: 2, grupo: 'Cartas de cobrança' },
  { nome: 'email', rotulo: 'E-mail para receber comprovantes', largura: 2, grupo: 'Cartas de cobrança' },
  { nome: 'whatsapp', rotulo: 'WhatsApp para comprovantes', largura: 2, grupo: 'Cartas de cobrança' },
  { nome: 'rodape_pedido', rotulo: 'Texto no fim do pedido (uma frase por linha)', tipo: 'area', largura: 4, grupo: 'Pedido' },
];

export default function Configuracoes() {
  const avisar = useToast();
  const [v, setV] = useState<Linha | null>(null);
  const [emailOk, setEmailOk] = useState<boolean | null>(null);
  const [copia, setCopia] = useState('');
  const fazerCopia = async () => {
    const out: Record<string, any[]> = {};
    try {
      for (const t of TABELAS) { setCopia(`Copiando ${t}...`); out[t] = await buscarTodos(() => supabase().from(t).select('*').order(CHAVES[t] || 'id'), 500000); }
      baixar(new Blob([JSON.stringify({ gerado_em: new Date().toISOString(), tabelas: out })], { type: 'application/json' }), `copia-seguranca-${hojeISO()}.json`);
      setCopia('Cópia baixada. Guarde o arquivo num lugar seguro (pendrive, Google Drive).');
    } catch (e: any) { setCopia('Erro: ' + e.message); }
  };
  useEffect(() => {
    supabase().from('sistema').select('*').eq('id', 1).maybeSingle().then(({ data }) => setV(data || { id: 1 }));
    fetch('/api/email').then((r) => r.json()).then((j) => setEmailOk(!!j.configurado)).catch(() => setEmailOk(false));
  }, []);
  const salvar = async () => {
    if (!v) return;
    const reg: Linha = { id: 1 };
    for (const c of CAMPOS) reg[c.nome] = typeof v[c.nome] === 'string' ? (v[c.nome].trim() || null) : v[c.nome] ?? null;
    const { error } = await supabase().from('sistema').upsert(reg);
    if (error) avisar(error.message, 'erro'); else { limparCacheSistema(); avisar('Configurações salvas'); }
  };
  if (!v) return <Carregando />;
  return (
    <div className="max-w-3xl">
      <Cabecalho titulo="Configurações" descricao="Dados que aparecem no cabeçalho do pedido, das cartas e dos relatórios." />
      <div className="cartao p-5">
        <Formulario campos={CAMPOS} valores={v} onMudar={(n, val) => setV({ ...v, [n]: val })} />
        <div className="flex justify-end mt-5"><button className="botao-primario" onClick={salvar}>Salvar</button></div>
      </div>
      <div className="cartao p-5 mt-4 text-[15px]">
        <h2 className="font-semibold mb-1">Envio de e-mail</h2>
        {emailOk === null ? 'Verificando...' : emailOk
          ? <p className="text-marca">Configurado. Os PDFs são enviados por e-mail direto do sistema.</p>
          : <p className="text-tinta-suave">Não configurado. Ao enviar por e-mail, o sistema baixa o PDF e abre o seu programa de e-mail para você anexar. Para enviar direto, cadastre os dados SMTP na Vercel (veja o guia).</p>}
      </div>
      <div className="cartao p-5 mt-4 text-[15px]">
        <h2 className="font-semibold mb-1">Cópia de segurança</h2>
        <p className="text-tinta-suave mb-3">Baixa todos os dados do sistema num arquivo. Faça uma vez por mês, pelo menos.</p>
        <button className="botao-secundario" onClick={fazerCopia}>Baixar cópia de segurança</button>
        {copia && <p className="text-sm mt-2">{copia}</p>}
      </div>
    </div>
  );
}
