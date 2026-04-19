# Labora CRM — Setup completo

## O que está nesta pasta

| Arquivo | O que faz |
|---|---|
| `1_setup_sheets.js` | Cria as 5 abas na planilha com cabeçalhos formatados |
| `lib/sheets.js` | Camada CRUD para o Next.js usar |
| `.env.local.example` | Template das variáveis de ambiente |

---

## Passo a passo

### 1. Configure o Google Cloud

Você já tem a conta. Só confirme que:

1. A **Sheets API** está habilitada no projeto
2. Você tem uma **Service Account** com o papel `Editor`
3. Baixou o `credentials.json` da service account

### 2. Compartilhe a planilha com a service account

Abra a planilha no Google Drive → Compartilhar → cole o email da service account
(formato: `nome@projeto.iam.gserviceaccount.com`) → permissão **Editor**.

Se pular esse passo, o script vai retornar erro 403.

### 3. Rode o setup da planilha

```bash
# Na pasta deste README
npm install googleapis
node 1_setup_sheets.js
```

Edite o `SPREADSHEET_ID` no topo do arquivo antes de rodar.

O script vai criar as 5 abas (`tClient`, `tProduct`, `tContact`, `tFato`, `tLogin`)
com os cabeçalhos corretos, linha 1 em negrito e congelada.

### 4. Crie o projeto Next.js

```bash
npx create-next-app@latest labora-crm \
  --typescript \
  --eslint \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd labora-crm
npm install googleapis
```

### 5. Configure as variáveis de ambiente

```bash
cp .env.local.example labora-crm/.env.local
```

Edite o `.env.local` com os valores reais:
- `GOOGLE_SHEET_ID` — ID da planilha (está na URL)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — email da service account
- `GOOGLE_PRIVATE_KEY` — chave do `credentials.json`

### 6. Copie a lib para o projeto

```bash
cp lib/sheets.js labora-crm/src/lib/sheets.js
```

### 7. Teste a conexão

Crie `labora-crm/src/app/api/test/route.js`:

```js
import { getAll } from '@/lib/sheets';

export async function GET() {
  const clients = await getAll('tClient');
  return Response.json({ ok: true, count: clients.length });
}
```

Rode `npm run dev` e acesse `http://localhost:3000/api/test`.
Se retornar `{ ok: true, count: 0 }`, a conexão está funcionando.

---

## Como usar a lib nas rotas

```js
import { getAll, insert, update, softDelete } from '@/lib/sheets';

// Listar todos os contatos de um client
const contatos = await getAll('tContact', 'id-do-client');

// Criar um novo contato
await insert('tContact', {
  contact_id: crypto.randomUUID(),
  client_id: 'id-do-client',
  name: 'João Silva',
  email: 'joao@email.com',
  status: 'Lead',
  stage: 'Prospecção',
  created_at: new Date().toISOString(),
});

// Atualizar o estágio de um negócio
await update('tFato', 'fato_id', 'uuid-do-negocio', {
  stage: 'Proposta',
}, 'id-do-client');

// Soft delete de um contato (LGPD)
await softDelete('tContact', 'contact_id', 'uuid-do-contato', 'id-do-client');
```

---

## Armadilhas comuns

**Erro 403** — a service account não tem acesso à planilha. Compartilhe com ela.

**`private_key` quebrando** — no `.env.local`, a chave precisa estar entre aspas duplas
com `\n` literal (não quebras reais). O código converte automaticamente.

**Colunas desalinhadas** — nunca reordene as colunas na planilha manualmente.
A lib usa posição, não nome de coluna na leitura. Se precisar reordenar, atualize o
`SCHEMA` em `sheets.js` primeiro.

**Rate limit do Sheets** — a API gratuita suporta 300 requests/minuto. Para o MVP
isso é mais que suficiente. Pós-MVP considere cache em memória (Redis ou similar).
