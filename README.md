# Barber Gestão Financeira

Gestão financeira para barbearias e salões (nasceu no Social Club Barbarossa, primeiro cliente) (PWA, instalável no celular). Arquivo único, sem build e sem backend: os dados ficam no `localStorage` do aparelho (use o backup/exportar dentro do app).

## Onde os dados ficam no aparelho
O estado fica no IndexedDB (centenas de MB), com cópia no localStorage quando couber (limite ~5 MB do navegador). Antes, o app só usava o localStorage e, com muitos dados, aparecia "este navegador não permite salvar". Abas abertas ao mesmo tempo no mesmo aparelho se atualizam entre si (BroadcastChannel); aparelhos diferentes dependem do login e da nuvem.

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

### Entrar com o Google
O botão já está na tela de login (`loginSocial` em `config.js`). Para funcionar, ative em Supabase → Authentication → Providers → Google:
- Google Cloud Console → APIs e serviços → Credenciais → ID do cliente OAuth (tipo *Aplicativo da Web*, gratuito). Em *URIs de redirecionamento autorizados* coloque o endereço de callback que o Supabase mostra na tela do provedor.
- Copie *Client ID* e *Client secret* para o Supabase.
- Em Authentication → URL Configuration, coloque o endereço do site em *Site URL* e *Redirect URLs*.
Quem entra pela primeira vez pelo Google informa o nome da barbearia e a empresa é criada. (Apple fica de fora por enquanto: exige o Apple Developer Program, US$ 99/ano.)

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
