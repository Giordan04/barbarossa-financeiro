# Barber Gestão Financeira

Gestão financeira para barbearias e salões (nasceu no Social Club Barbarossa, primeiro cliente) (PWA, instalável no celular). Arquivo único, sem build e sem backend: os dados ficam no `localStorage` do aparelho (use o backup/exportar dentro do app).

## Atenção: dados de clientes
Este repositório é **público**. Nunca coloque aqui arquivos com dados reais de clientes (CPF, telefone, e-mail). O `reativacao.html` do artefato original contém uma lista real de clientes e por isso está no `.gitignore`: a aba *Reativação* fica sem conteúdo no site público até esses dados irem para o banco (Supabase), protegidos por login.

## Testes
`node tests/test_money.js index.html` (leitura de valores em R$ e validação da logo).

## Estrutura
- `index.html` – o app inteiro (HTML + CSS + JS)
- `manifest.webmanifest`, `sw.js`, `icons/` – instalação como app e uso offline
- Bibliotecas de importação (xlsx, pdf.js) e fontes vêm de CDN (cdnjs / Google Fonts)

## Login e nuvem (Supabase)
Sem configuração o app roda só no aparelho. Para ligar o login e a nuvem:
1. Crie um projeto em supabase.com (plano gratuito serve).
2. SQL Editor → cole todo o `supabase/schema.sql` → Run.
3. Authentication → Providers → Email: ligado. (Para testar mais rápido, desligue "Confirm email"; em produção deixe ligado.)
4. Authentication → URL Configuration: coloque o endereço onde o app foi publicado em *Site URL* e *Redirect URLs*.
5. Project Settings → API: copie **Project URL** e a chave **anon public** para `config.js`. Nunca use a `service_role`.

Como funciona (Etapa 1): cada empresa tem uma linha em `app_state` com todos os dados do app; só os membros da empresa enxergam (RLS). Gravações usam controle de versão — se dois aparelhos editarem ao mesmo tempo, o app pergunta qual versão manter. Ao entrar pela primeira vez, os dados que já estavam no aparelho sobem para a empresa nova; antes de qualquer troca de dados é guardada uma cópia local (`barbarossa_fin_v1_copia_*`).

## Rodar localmente
```
python3 -m http.server 8000   # abra http://localhost:8000
```

## Publicar
Basta servir esta pasta como site estático (HTTPS é necessário para instalar como app):
- **GitHub Pages**: Settings → Pages → branch → `/ (root)`
- **Netlify / Vercel / Cloudflare Pages**: aponte para o repositório, sem comando de build, diretório de publicação `/`

## Observações
- Dentro do Claude a sincronização nativa continua valendo; fora dele, com `config.js` preenchido, usa o Supabase.
- Papel `contador` não grava na nuvem (só leitura de dados), mas ainda não bloqueia a edição na tela — pendente.
- Convite de outros usuários para a mesma empresa: próxima etapa.
- Dados são por aparelho/navegador: faça backup antes de trocar de celular.
