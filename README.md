# Labora CRM

CRM para agências de marketing digital. Stack: Next.js + Google Sheets.

## Setup local

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Crie `.env.local` na raiz:

```env
GOOGLE_SHEET_ID=1NTu_FTKFUSJzNcN0e5Kfy3qjklgofEalx7hLJNz3GQg
GOOGLE_SERVICE_ACCOUNT_EMAIL=labora-crm@crm-labora-b16.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> A `GOOGLE_PRIVATE_KEY` está no `credentials_json.json`. Copie o valor do campo `private_key` inteiro (incluindo os `\n` literais entre as aspas).

### 3. Rodar

```bash
npm run dev
# Acesse http://localhost:3000
```

## Deploy na Vercel

1. Push para GitHub
2. Conecta repositório na Vercel
3. Em **Settings → Environment Variables**, adiciona as 3 variáveis acima
4. Deploy automático

> Hostinger: aponta o domínio customizado para a Vercel em DNS → CNAME.

## Estrutura das abas no Google Sheets

A planilha precisa ter estas abas com cabeçalho na linha 1:

| Aba | Campos |
|-----|--------|
| `tContact` | contact_id, client_id, name, email, phone, ddi, doc, valid_phone, duplicate_phone, city, tags, status, stage, origin, utm_source, utm_medium, utm_campaign, notes, consent_given_at, created_at, deleted_at |
| `tFato` | fato_id, client_id, contact_id, product_id, transaction, event, event_key, stage, status, value, full_price, gross_price, payment_type, purchase_status, credit_card_flag, lost_status, checkout_url, purchase_created_at, purchase_paid_at, won_at, lost_at, created_at, deleted_at |
| `tClient` | client_id, name, cnpj, segment, city, responsible_name, responsible_email, responsible_phone, created_at, deleted_at |
| `tProduct` | product_id, client_id, name, checkout_app, price, currency, status, created_at, deleted_at |
| `tLogin` | user_id, client_id, name, email, password_hash, role, active, last_login_at, created_at |

## Próximos passos (pós-MVP)

- [ ] Importar CSV (643 contatos) via script
- [ ] Tela de login com JWT
- [ ] Modal de criação/edição de contato
- [ ] Drag-and-drop no kanban
- [ ] Webhooks (Meta Ads, formulários)
