# ✂️ Confecção — Sistema de Gerenciamento

Sistema web para gerenciar clientes e pedidos de confecção de roupas.
Feito para celular, com banco de dados Firebase (gratuito).

---

## 🚀 Como configurar (passo a passo)

### 1. Criar projeto no Firebase (gratuito)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Dê um nome (ex: `confeccao-minha-mae`)
4. Desative o Google Analytics (não precisa)
5. Clique em **"Criar projeto"**

### 2. Criar o Firestore (banco de dados)

1. No menu lateral, clique em **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Iniciar no modo de teste"** (por 30 dias — depois configuramos as regras)
4. Escolha a região **`southamerica-east1`** (São Paulo) → Ativar

### 3. Registrar o app web

1. Na página inicial do projeto, clique no ícone **`</>`** (Web)
2. Dê um apelido (ex: `confeccao-web`)
3. **Não** marque Firebase Hosting
4. Clique em **"Registrar app"**
5. Copie o objeto `firebaseConfig` que aparecer

### 4. Colar as credenciais no código

Abra o arquivo `src/App.jsx` e substitua o bloco:

```js
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO_ID",
  ...
};
```

...pelos dados reais que você copiou do Firebase.

### 5. Instalar e rodar localmente

Precisa ter [Node.js](https://nodejs.org) instalado.

```bash
# Entrar na pasta do projeto
cd confeccao-app

# Instalar dependências
npm install

# Rodar no navegador (para testar)
npm run dev
```

Abra no celular: `http://SEU_IP_LOCAL:5173`

---

## 🌐 Publicar no GitHub Pages (acesso de qualquer lugar)

### 1. Criar repositório no GitHub

1. Acesse [github.com](https://github.com) → **"New repository"**
2. Nome: `confeccao-app`
3. Deixe **Public** (necessário para o Pages gratuito)
4. Clique em **"Create repository"**

### 2. Enviar o código

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/confeccao-app.git
git push -u origin main
```

### 3. Configurar o GitHub Pages com Actions

Crie o arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

4. No GitHub, vá em **Settings → Pages → Source**: selecione **"gh-pages"**

Após alguns minutos, o app estará disponível em:
`https://SEU_USUARIO.github.io/confeccao-app`

---

## 📱 Instalar no celular como app (PWA)

No Chrome/Safari, abra o link do GitHub Pages e toque em:
**"Adicionar à tela inicial"**

O app ficará salvo como ícone no celular, igual a um app de verdade!

---

## 🔒 Segurança do Firestore (após 30 dias)

Após o período de teste, atualize as regras no Firebase Console → Firestore → Regras:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Mude depois para autenticação
    }
  }
}
```

---

## 📦 Funcionalidades

- ✅ Cadastro de clientes (nome, telefone, endereço, obs)
- ✅ Pedidos com múltiplos itens
- ✅ Tamanhos infantil (1-10 anos), feminino (PP-EXG), masculino (PP-GG)
- ✅ Campo de observação por item (cor, bordado, detalhes)
- ✅ Valor por item + total automático
- ✅ Controle de entrada (sinal) e saldo a receber
- ✅ Status do pedido (Pendente → Produção → Pronto → Entregue)
- ✅ Filtro e busca de pedidos
- ✅ Dashboard com resumo financeiro
- ✅ Banco de dados em tempo real (Firebase Firestore)
- ✅ Funciona no celular

---

## 💰 Custos

O Firebase no plano **Spark (gratuito)** suporta:
- 1 GB de armazenamento
- 50.000 leituras/dia
- 20.000 escritas/dia

Para uma confecção pequena, isso é mais que suficiente por anos.
