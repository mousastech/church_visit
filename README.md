# Gestão de Visitantes — ADMSBC

Sistema responsivo para cadastrar visitantes, aprovar nomes, compartilhar a lista com a mídia e projetar no telão. Esta edição foi preparada para GitHub e Vercel.

## Recursos

- Cadastro de nome, telefone, data, culto e observação.
- Aprovação individual antes da exibição.
- Telão responsivo com nomes em linhas separadas.
- Observação ao lado do nome no telão e abaixo em telas pequenas.
- Atualização automática a cada 15 segundos.
- Nome do culto memorizado no aparelho.
- Acesso protegido por senha da equipe.
- Dados compartilhados entre computadores, tablets e telefones.

## Publicar no GitHub

1. Extraia este arquivo ZIP.
2. Crie um repositório vazio no GitHub.
3. Dentro da pasta do projeto, execute:

```bash
git init
git add .
git commit -m "Sistema de gestão de visitantes"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

## Publicar no Vercel

1. No Vercel, selecione **Add New → Project** e importe o repositório do GitHub.
2. Em **Storage/Marketplace**, crie ou conecte um banco PostgreSQL Neon ao projeto.
3. Confirme que a integração criou a variável `DATABASE_URL`. Se usar outro PostgreSQL compatível, adicione essa variável manualmente.
4. Em **Settings → Environment Variables**, crie:

```text
APP_PASSWORD=uma-senha-forte-para-a-equipe
```

5. Faça o deploy. O sistema cria a tabela necessária automaticamente no primeiro acesso autenticado.

## Executar localmente

Requer Node.js 20 ou superior e um banco PostgreSQL.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Edite `.env.local` com a URL real do banco e a senha desejada. Abra `http://localhost:3000`.

## Banco de dados

O sistema cria automaticamente a tabela `visitors`. Se preferir criar manualmente, execute o arquivo [`database/schema.sql`](database/schema.sql) no seu PostgreSQL.

## Segurança

- Nunca envie `.env` ou `.env.local` para o GitHub.
- Use uma senha longa em `APP_PASSWORD`.
- A sessão expira após sete dias.
- Telefone e observações ficam armazenados no banco; restrinja o acesso ao repositório e ao painel do banco.

## Dados da versão atual

O ZIP contém o código e os arquivos visuais, mas não contém os visitantes já cadastrados no site hospedado no ChatGPT Sites. O banco do Vercel começa vazio.
