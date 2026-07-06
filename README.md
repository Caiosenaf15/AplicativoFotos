# 📸 AplicativoFotos

> Site de compartilhamento de fotos e vídeos para festas e eventos — os convidados escaneiam um QR Code, enviam suas fotos e elas aparecem instantaneamente no álbum coletivo.

---

## ✨ Sobre o projeto

O **AplicativoFotos** foi criado para a festa de 15 anos de Maria. O organizador coloca um QR Code no local do evento; os convidados escaneiam, tiram uma foto ou escolhem da galeria, e a imagem vai direto para o álbum compartilhado — visível para todos em tempo real.

Projeto front-end puro (HTML + CSS + JS), sem framework, usando **Supabase** como back-end (banco de dados + storage de arquivos). Inclui também uma **página de administração** com senha para gerenciar e excluir fotos.

---

## 🗂️ Estrutura

```
AplicativoFotos/
├── index.html          # Página principal — upload e galeria
├── admin.html          # Painel de administração (protegido por senha)
└── src/
    ├── indexJS.js      # Lógica da página principal (Supabase, upload, galeria)
    ├── indexStyle.css  # Estilos da página principal (glassmorphism / Liquid Glass)
    ├── adminJS.js      # Lógica do painel admin (auth, listagem, exclusão)
    └── adminStyle.css  # Estilos do painel admin
```

---

## 🎯 Funcionalidades

**Página principal (`index.html`)**
- 📷 Botão de câmera para tirar foto ou escolher da galeria
- 👁️ Preview do arquivo antes de enviar
- 📤 Upload para o Supabase Storage (limite de 50 MB por arquivo)
- 🖼️ Galeria com todas as fotos e vídeos enviados
- 🔍 Lightbox para visualizar em tela cheia (Esc para fechar)
- 👤 Campo de nome opcional (identificado no arquivo)
- 🔐 Login anônimo automático via Supabase Auth
- 🗑️ Convidado pode excluir apenas suas próprias fotos

**Painel admin (`admin.html`)**
- 🔒 Acesso por senha (definida no código)
- 📋 Listagem de todas as fotos com thumbnail
- 🗑️ Exclusão de qualquer foto com confirmação
- 📊 Contador total de itens

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML / CSS / JS puro | Front-end sem frameworks |
| [Supabase](https://supabase.com) | Back-end: banco de dados (PostgreSQL) + Storage |
| Supabase Auth | Login anônimo automático dos convidados |
| Supabase JS SDK v2 | Importado via CDN (jsDelivr) |

---

## ⚙️ Configuração

### 1. Criar projeto no Supabase (gratuito)

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Crie uma tabela `fotos` no banco com a estrutura abaixo
3. Crie um bucket de Storage chamado `fotos` com acesso público
4. Copie a **URL** e a **anon key** do projeto

**SQL para criar a tabela:**
```sql
create table fotos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),
  nome_arquivo text not null,
  created_at timestamptz default now()
);

-- Habilitar RLS
alter table fotos enable row level security;

-- Qualquer um pode ler
create policy "Leitura pública" on fotos for select using (true);

-- Usuário logado pode inserir
create policy "Inserir próprias" on fotos for insert
  with check (auth.uid() = owner_id);

-- Usuário só apaga as próprias
create policy "Apagar próprias" on fotos for delete
  using (auth.uid() = owner_id);
```

**Política do Storage (bucket `fotos`):**
```sql
-- Leitura pública
create policy "Leitura pública storage" on storage.objects
  for select using (bucket_id = 'fotos');

-- Upload para usuários autenticados
create policy "Upload autenticado" on storage.objects
  for insert with check (
    bucket_id = 'fotos' and auth.role() = 'authenticated'
  );

-- Dono pode apagar
create policy "Apagar próprio" on storage.objects
  for delete using (
    bucket_id = 'fotos' and auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 2. Configurar as credenciais

Abra `src/indexJS.js` e `src/adminJS.js` e substitua:

```js
const SUPABASE_URL = "https://SEU_PROJETO.supabase.co";
const SUPABASE_KEY = "SUA_ANON_KEY";
```

Em `src/adminJS.js`, troque também a senha do painel:

```js
const ADMIN_PASSWORD = "sua_senha_aqui";
```

### 3. Hospedar

Qualquer hospedagem estática funciona:

- **GitHub Pages** — ative em *Settings → Pages → Branch: main*
- **Netlify** — arraste a pasta para [app.netlify.com](https://app.netlify.com)
- **Vercel** — importe o repositório e faça deploy

### 4. Gerar o QR Code

Com o link em mãos, gere o QR Code em:
- [qr-code-generator.com](https://www.qr-code-generator.com)
- [goqr.me](https://goqr.me)

Imprima e distribua no evento!

---

## 📊 Limites do plano gratuito Supabase

| Recurso | Limite gratuito |
|---|---|
| Storage | 1 GB |
| Transferência (bandwidth) | 2 GB / mês |
| Requisições de banco | 500 MB de dados |
| Usuários anônimos | Ilimitado |
| Projetos ativos | 2 |

Para uma festa de centenas de pessoas, o plano gratuito é suficiente.

---

## 🎨 Design

O projeto usa uma estética **Liquid Glass** — efeito de glassmorphism com orbs de cor animados no fundo, inspirado no iOS 26. Paleta roxa/vinho, tipografia Inter, visual mobile-first.

---

## 👨‍💻 Autor

**Caio** — Sistemas de Informação · CEFET/RJ (campus Nova Friburgo)

---

## 📄 Licença

MIT — fique à vontade para usar, adaptar e distribuir.
