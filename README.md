# Barbarossa · Financeiro

App financeiro do Social Club Barbarossa (PWA, instalável no celular). Arquivo único, sem build e sem backend: os dados ficam no `localStorage` do aparelho (use o backup/exportar dentro do app).

## Estrutura
- `index.html` – o app inteiro (HTML + CSS + JS)
- `manifest.webmanifest`, `sw.js`, `icons/` – instalação como app e uso offline
- Bibliotecas de importação (xlsx, pdf.js) e fontes vêm de CDN (cdnjs / Google Fonts)

## Rodar localmente
```
python3 -m http.server 8000   # abra http://localhost:8000
```

## Publicar
Basta servir esta pasta como site estático (HTTPS é necessário para instalar como app):
- **GitHub Pages**: Settings → Pages → branch → `/ (root)`
- **Netlify / Vercel / Cloudflare Pages**: aponte para o repositório, sem comando de build, diretório de publicação `/`

## Observações
- Sincronização entre aparelhos (`window.claude` db) só funciona dentro do Claude; fora dele o app roda 100% local.
- Dados são por aparelho/navegador: faça backup antes de trocar de celular.
