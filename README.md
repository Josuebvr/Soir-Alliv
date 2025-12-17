# Soir - Portfólio de Impressões 3D

Site de catálogo e carrinho com sistema de comentários/reviews persistidos no GitHub.

## 🚀 Setup

### 1. Criar repositório para comentários
- Acesse https://github.com/new
- Crie repositório `soir-comments` (público)
- Inicialize com README

### 2. Gerar GitHub Personal Access Token
- Acesse https://github.com/settings/tokens
- Clique "Generate new token (classic)"
- Marque permissões: `repo` + `workflow`
- Copie o token gerado

### 3. Configurar projeto
```bash
# 1. Copie config.example.js para config.js
cp config.example.js config.js

# 2. Edite config.js e substitua SEU_TOKEN_AQUI pelo token gerado
# (arquivo já tem seu usuário: Josuebvr)

# 3. Faça push do projeto para GitHub Pages
git add .
git commit -m "Adicionar site com comentários"
git push
```

### 4. Local (desenvolvimento)
```bash
# Instalar dependências
npm install

# Iniciar servidor (porta 3000)
npm start

# Acessar: http://localhost:3000
```

## 📝 Como funciona

### Reviews/Comentários
- Comentários com nota (1-5 estrelas)
- Suporte a fotos (até 6 por comentário)
- Fotos salvas como base64 em `comentarios.json`
- Dados persistidos no GitHub automaticamente

### Armazenamento
- **Arquivo:** `comentarios.json` no repositório `soir-comments`
- **Formato:** JSON com estrutura por produto (productId)
- **Fallback:** localStorage se GitHub indisponível

### URLs de produtos
- Link de compartilhamento: `?product=p01`
- Abre modal do produto automaticamente

## 🔒 Segurança

⚠️ **Importante:** O `config.js` contém seu token GitHub
- Não compartilhe publicamente
- Arquivo está no `.gitignore` para não enviar para GitHub
- Se comprometido, regenere token em https://github.com/settings/tokens

## 📱 Funcionalidades

✅ Catálogo de produtos com filtro/busca
✅ Carrinho com envio por WhatsApp
✅ Compartilhamento por link direto
✅ Sistema de reviews com fotos
✅ Comentários persistidos no GitHub
✅ Responsive design

## 🛠️ Tecnologias

- HTML5 / CSS3 / JavaScript Vanilla
- GitHub API para persistência
- LocalStorage como fallback
- Node.js + Express (servidor local)
- Multer para upload (servidor local)

## 📝 Licença

Todos os direitos reservados - Soir 2025
