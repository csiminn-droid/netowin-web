'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Cabecalho, useConfirmar } from '@/components/ui';
import { arquivosReconhecidos, importarTudo } from '@/lib/importarExecutar';

export default function Importar() {
  const confirmar = useConfirmar();
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [progresso, setProgresso] = useState<{ msg: string; pct: number } | null>(null);
  const [resumo, setResumo] = useState<Record<string, number> | null>(null);
  const [erro, setErro] = useState('');
  const nomes = arquivos.map((f) => f.name);
  const rec = arquivosReconhecidos(nomes);

  const escolher = (lista: FileList | null) => {
    setResumo(null); setErro('');
    setArquivos(Array.from(lista || []).filter((f) => /\.db$/i.test(f.name)));
  };

  const importar = async () => {
    if (!(await confirmar('Importar os dados do sistema antigo?', { detalhe: 'Todos os dados que estiverem no sistema novo serão APAGADOS e substituídos pelos arquivos escolhidos.', perigo: true, ok: 'Apagar e importar' }))) return;
    setErro(''); setResumo(null);
    try {
      const entrada = await Promise.all(arquivos.map(async (f) => ({ name: f.name, data: await f.arrayBuffer() })));
      const r = await importarTudo(supabase(), entrada, (msg, pct) => setProgresso({ msg, pct }));
      setResumo(r);
    } catch (e: any) { setErro(e.message || String(e)); }
    setProgresso(null);
  };

  return (
    <div className="max-w-3xl">
      <Cabecalho titulo="Importar do sistema antigo" descricao="Traz clientes, produtos, pedidos, comissões, acertos e cobranças do programa em Delphi." />
      <div className="cartao p-5 space-y-4 text-[15px]">
        <ol className="list-decimal pl-5 space-y-2">
          <li>No computador onde o sistema antigo roda, feche o programa.</li>
          <li>Abra a pasta <strong>C:\netowin\dados</strong> (onde ficam os arquivos <code>.DB</code>).</li>
          <li>Clique no botão abaixo, entre nessa pasta, selecione <strong>todos os arquivos</strong> (Ctrl+A) e confirme. Só os arquivos .DB são usados.</li>
          <li>Clique em <strong>Importar</strong>. Leva menos de um minuto.</li>
        </ol>
        <label className="botao-secundario cursor-pointer">
          Escolher arquivos da pasta dados
          <input type="file" multiple accept=".db,.DB" className="sr-only" onChange={(e) => escolher(e.target.files)} />
        </label>
        {arquivos.length > 0 && (
          <div className="text-sm">
            <p><strong>{rec.encontrados.length}</strong> tabelas reconhecidas de {rec.encontrados.length + rec.faltando.length}.</p>
            {rec.faltando.length > 0 && <p className="text-aviso mt-1">Não encontrados (serão importados vazios): {rec.faltando.join(', ')}</p>}
          </div>
        )}
        <button className="botao-primario" disabled={!rec.encontrados.length || !!progresso} onClick={importar}>Importar</button>
        {progresso && (
          <div>
            <div className="h-3 rounded-full bg-papel overflow-hidden"><div className="h-full bg-marca transition-all" style={{ width: progresso.pct + '%' }} /></div>
            <p className="text-sm text-tinta-suave mt-2">{progresso.msg}</p>
          </div>
        )}
        {erro && <p className="text-alerta">{erro}</p>}
        {resumo && (
          <div className="rounded-lg bg-marca-clara p-4">
            <p className="font-semibold text-marca mb-2">Importação concluída</p>
            <ul className="grid grid-cols-2 gap-x-6 text-sm">{Object.entries(resumo).map(([t, n]) => <li key={t} className="flex justify-between"><span>{t}</span><span className="tabular-nums">{n}</span></li>)}</ul>
          </div>
        )}
        <p className="text-sm text-tinta-suave">Você pode repetir a importação quantas vezes quiser enquanto usa os dois sistemas em paralelo. Depois que passar a lançar só no sistema novo, não importe mais, senão o que foi feito aqui será apagado.</p>
      </div>
    </div>
  );
}
