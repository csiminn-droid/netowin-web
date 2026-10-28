# Sistema de Representações (versão web)

Versão online do sistema em Delphi da Neto Representações. Funciona no computador e no celular, com login, e guarda os dados na nuvem.

**O que tem no sistema**

- **Pedidos:** inclusão, alteração, itens, descontos em cascata, comissão, produtos não enviados, duplicar pedido, PDF do pedido e envio por WhatsApp ou e-mail.
- **Cadastros:** clientes, representadas, produtos com 5 preços, transportadoras, vendedores e prepostos, tipos de produto, contas bancárias próprias e das representadas.
- **Comissões:** controle de vendas (NF e valor faturado), débitos e créditos, acerto com a representada com PDF do acerto, e opção de desfazer o acerto.
- **Prepostos:** comissões lançadas automaticamente pelo pedido, vales e acerto do preposto.
- **Cobrança:** títulos a receber, registro de remessa de cheques e depósitos (com PDF), cartas de cobrança geradas a partir do pedido.
- **Relatórios:** vendas por período, clientes sem comprar há X dias (com botão de WhatsApp), o que o cliente já comprou, clientes por representada e ano, tabela de preços, pendências. Todas as listas podem ser impressas em PDF.
- **Importação:** traz todo o histórico do sistema antigo, lendo direto os arquivos `.DB` da pasta `C:\netowin\dados`.
- **Cópia de segurança:** em Configurações, baixa todos os dados num arquivo.

**Tecnologia:** Next.js (site) + Supabase (banco PostgreSQL e login). Os dois têm plano gratuito.

---

## Como publicar (uma vez só, uns 30 minutos)

Você vai criar 3 contas gratuitas: **Supabase** (banco de dados), **GitHub** (guarda o código) e **Vercel** (coloca o site no ar).

### 1. Banco de dados no Supabase

1. Entre em https://supabase.com, crie uma conta e clique em **New project**.
   - Nome: `netowin`
   - Senha do banco: crie uma senha forte e guarde
   - Região: **South America (São Paulo)**
2. Espere o projeto ficar pronto (uns 2 minutos).
3. No menu da esquerda, abra **SQL Editor**, clique em **New query**, cole **todo** o conteúdo do arquivo `supabase/schema.sql` e clique em **Run**. Tem que aparecer "Success".
4. Numa nova query, rode este comando trocando pelo e-mail do seu pai (é o e-mail que ele vai usar para entrar):
   ```sql
   insert into usuarios (email, nome) values ('email.do.seu.pai@gmail.com', 'Neto');
   ```
   Só os e-mails cadastrados nessa tabela enxergam os dados, mesmo que alguém consiga criar uma conta.
5. Crie o login dele: **Authentication > Users > Add user > Create new user**. Coloque o mesmo e-mail e uma senha, e marque **Auto Confirm User**.
6. Bloqueie novos cadastros: **Authentication > Sign In / Providers** e desligue **Allow new users to sign up**.
7. Pegue as chaves: **Project Settings > API** (ou **Data API**). Copie:
   - **Project URL** (algo como `https://abcd.supabase.co`)
   - **anon public** key (um texto longo que começa com `eyJ`)

### 2. Código no GitHub

1. Entre em https://github.com e crie uma conta.
2. Clique em **New repository**, nome `netowin-web`, marque **Private** e crie.
3. Na página do repositório, clique em **uploading an existing file**.
4. Descompacte o arquivo `netowin-web.zip` no seu computador, abra a pasta e **arraste todo o conteúdo de dentro dela** (as pastas `app`, `components`, `lib`, `public`, `supabase` e os arquivos soltos) para a página. Clique em **Commit changes**.

### 3. Site na Vercel

1. Entre em https://vercel.com com a conta do GitHub.
2. **Add New > Project**, escolha `netowin-web` e clique em **Import**.
3. Abra **Environment Variables** e cadastre:
   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | o Project URL do passo 1.7 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a anon public key do passo 1.7 |
4. Clique em **Deploy**. Em 2 minutos o site estará no ar num endereço como `netowin-web.vercel.app`.
5. Volte no Supabase em **Authentication > URL Configuration** e coloque esse endereço em **Site URL** (serve para o "esqueci minha senha" funcionar).

### 4. Primeiro acesso

1. Abra o endereço do site e entre com o e-mail e a senha do passo 1.5.
2. Vá em **Sistema > Importar do sistema antigo**, clique em **Escolher arquivos**, entre na pasta `C:\netowin\dados` do computador do seu pai, selecione **todos** os arquivos (Ctrl+A) e clique em **Importar**. Leva menos de um minuto.
3. Em **Configurações**, confira o cabeçalho dos impressos, o e-mail e o WhatsApp que aparecem nas cartas de cobrança.
4. Em **Cadastros > Vendedores**, preencha a **comissão do preposto** de quem recebe comissão. Assim ela é lançada sozinha nos pedidos.
5. No celular, abra o site e use "Adicionar à tela de início" para ele virar um ícone.

---

## Período de transição

Durante umas semanas, o ideal é seu pai lançar nos dois sistemas e comparar os totais de comissão e os acertos. Enquanto isso, a importação pode ser repetida para trazer os dados mais recentes do sistema antigo.

**Atenção:** a importação **apaga** o que estiver no sistema novo antes de trazer os dados antigos. Depois que ele passar a lançar só no sistema novo, não use mais a importação.

## Envio de e-mail com o PDF anexado (opcional)

Sem configurar nada, o botão de e-mail baixa o PDF e abre o programa de e-mail para anexar. Para o sistema enviar direto, com o PDF já anexado, use um Gmail:

1. Na conta Google, ative a verificação em duas etapas e crie uma **senha de app** (https://myaccount.google.com/apppasswords).
2. Na Vercel, em **Settings > Environment Variables**, cadastre:
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `465`
   - `SMTP_USER` = o e-mail do Gmail
   - `SMTP_PASS` = a senha de app (16 letras)
   - `SMTP_FROM` = `Neto Representações <email@gmail.com>`
3. Em **Deployments**, clique nos três pontinhos do último deploy e em **Redeploy**.

## Cuidados com o plano gratuito

- O Supabase gratuito **pausa o projeto depois de 7 dias sem nenhum acesso**. Com uso diário isso não acontece. Se pausar, é só entrar no painel do Supabase e clicar em **Restore**.
- O plano gratuito não tem backup automático. Use **Configurações > Baixar cópia de segurança** uma vez por mês e guarde o arquivo no Google Drive. Se quiser backup automático diário, o plano Pro do Supabase custa US$ 25 por mês.

## Para quem for dar manutenção

```bash
npm install
cp .env.example .env.local   # preencha as chaves do Supabase
npm run dev                  # http://localhost:3000
```

- `supabase/schema.sql`: tabelas, segurança (RLS) e as regras de negócio em funções SQL (`salvar_pedido`, `fazer_acerto`, `fazer_acerto_preposto`, `registrar_remessa` e as funções de desfazer).
- `lib/paradox.ts` e `lib/importar.ts`: leitura dos arquivos Paradox do sistema antigo e correção de datas (ano 2000, datas vazias de 1899).
- `lib/entidades.tsx`: configuração das telas de cadastro e listas.
- `lib/pdf.ts`: todos os impressos.

**Regras de cálculo levantadas dos dados antigos**

- O desconto do pedido é em cascata: cada desconto incide sobre o valor que sobrou do anterior.
- Comissão = total do pedido × % de comissão.
- Acerto com a representada: soma das comissões dos lançamentos marcados + débitos/créditos = valor a receber.
- Acerto do preposto: soma da comissão sobre o faturado + vales (negativos) = valor a pagar.
- Tabelas antigas de "morto" (`acertocontrolevendas`, `prepostomorto`, `valesmorto`, `acertodebitocredito`, `cobrado`) viraram registros com o número do acerto ou da remessa preenchido na mesma tabela.
