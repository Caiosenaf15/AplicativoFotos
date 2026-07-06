# 📸 AplicativoFotos

> Site de compartilhamento de fotos e vídeos em tempo real para festas e eventos — acesse pelo QR Code, tire a foto e ela aparece instantaneamente para todos os convidados.

---

## ✨ Sobre o projeto

O **AplicativoFotos** é um site responsivo de arquivo único (`festa.html`) inspirado no aplicativo Dots, pensado para ser usado em festas e eventos. O organizador imprime um QR Code e afixa no local — os convidados escaneiam, tiram fotos ou enviam da galeria, e todas as imagens aparecem em tempo real num mural coletivo visível para todo mundo.

Construído com HTML, CSS e JavaScript puro no front-end, usando **Firebase** (Firestore + Storage) como back-end — sem servidor próprio, sem mensalidade, escalável para centenas de conexões simultâneas.

---

## 🎯 Funcionalidades

- 📷 **Câmera direta** — botão dedicado que abre a câmera traseira do celular
- 🖼️ **Upload da galeria** — selecione múltiplos arquivos de uma vez
- 🗂️ **Fila de upload** — visualize todos os arquivos selecionados antes de enviar, com progresso individual por arquivo
- ⚡ **Galeria em tempo real** — novas fotos aparecem para todos os convidados sem precisar recarregar a página
- 🎞️ **Suporte a vídeos** — vídeos fazem preview com hover e abrem no lightbox
- 🔍 **Lightbox** — clique em qualquer mídia para ver em tela cheia
- 👤 **Nome do autor** — cada convidado pode identificar suas fotos
- 📱 **Mobile-first** — otimizado para celular, funciona em iOS e Android
- 🌙 **Design de festa** — tema escuro com gradiente dourado/rosa/roxo

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML / CSS / JS puro | Front-end sem frameworks |
| [Firebase Firestore](https://firebase.google.com/products/firestore) | Banco de dados em tempo real (WebSockets) |
| [Firebase Storage](https://firebase.google.com/products/storage) | Armazenamento de fotos e vídeos |
| Firebase SDK v10 (ESM) | Importado via CDN, sem build step |

---

## 🚀 Como usar

### 1. Criar projeto no Firebase (gratuito)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **Adicionar projeto** e dê um nome (ex: `festa-maria`)
3. Ative o **Cloud Firestore** → *Criar banco de dados* → **Modo de teste**
4. Ative o **Storage** → *Começar* → **Modo de teste**
5. Vá em **Configurações do Projeto** (⚙️) → **Geral** → **Seus apps** → clique em `</>` (Web)
6. Registre o app e copie o objeto `firebaseConfig`

### 2. Configurar o arquivo

Abra o `festa.html` e substitua o bloco de configuração no início do script:

```js
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};
```

Também personalize o nome da festa:

```js
const PARTY_NAME = "Nome da Sua Festa ✨";
```

### 3. Hospedar o site

Qualquer hospedagem estática funciona. As opções gratuitas recomendadas:

- **Firebase Hosting** — `firebase deploy` após instalar a CLI
- **GitHub Pages** — suba o `festa.html` como `index.html` no repositório e ative Pages nas configurações
- **Netlify / Vercel** — arraste o arquivo para o painel

### 4. Gerar o QR Code

Com o link do site em mãos, gere o QR Code em qualquer gerador gratuito:
- [qr-code-generator.com](https://www.qr-code-generator.com)
- [goqr.me](https://goqr.me)

Imprima e cole em mesas, paredes ou na entrada da festa.

---

## 📂 Estrutura do projeto

```
AplicativoFotos/
└── festa.html      # Aplicação completa em arquivo único
```

O projeto é intencionalmente um arquivo único — fácil de hospedar, editar e distribuir.

---

## 🔒 Regras de segurança Firebase (recomendado para produção)

O modo de teste permite leitura e escrita abertas por 30 dias. Para a festa, isso é suficiente. Se quiser restringir após o evento, atualize as regras no Firestore e Storage:

**Firestore** (`Firestore > Regras`):
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /photos/{doc} {
      allow read: if true;
      allow write: if request.resource.data.keys().hasAll(['url','name','type','createdAt']);
    }
  }
}
```

**Storage** (`Storage > Regras`):
```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /festa/{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 100 * 1024 * 1024
                   && (request.resource.contentType.matches('image/.*')
                    || request.resource.contentType.matches('video/.*'));
    }
  }
}
```

---

## 📊 Limites do plano gratuito Firebase (Spark)

| Recurso | Limite gratuito |
|---|---|
| Firestore — leituras | 50.000 / dia |
| Firestore — gravações | 20.000 / dia |
| Storage | 5 GB armazenado |
| Storage — download | 1 GB / dia |
| Conexões simultâneas | Sem limite fixo (WebSockets) |

Para uma festa de até ~300 pessoas, o plano gratuito é mais que suficiente.

---

## 🖼️ Preview

```
┌─────────────────────────────────────┐
│  Nossa Festa ✨                      │
│  Registre e compartilhe os momentos │
│  ● AO VIVO · 42 fotos               │
│                                     │
│  [📷 Tirar foto] [🖼️ Galeria]       │
│                                     │
│  ┌──┐ ┌──┐ ┌──┐   ← fila de upload  │
│  │✅│ │⏳│ │  │                     │
│  └──┘ └──┘ └──┘                     │
│                                     │
│  [Seu nome]           [Enviar →]    │
│                                     │
│  ╔════╦════╦════╦════╗              │
│  ║foto║foto║foto║foto║  ← galeria   │
│  ╠════╬════╬════╬════╣  em tempo   │
│  ║foto║foto║foto║foto║  real        │
│  ╚════╩════╩════╩════╝              │
└─────────────────────────────────────┘
```

---

## 👨‍💻 Autor

**Caio** — estudante de Sistemas de Informação no CEFET/RJ (campus Nova Friburgo)

---

## 📄 Licença

Este projeto está sob a licença MIT. Sinta-se à vontade para usar, modificar e distribuir.
