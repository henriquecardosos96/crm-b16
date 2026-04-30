/**
 * LABORA CRM — lib/sheets.js
 * 
 * Camada de acesso ao Google Sheets.
 * Todas as rotas da API importam daqui — nunca chamam o Google diretamente.
 * 
 * Uso:
 *   import { getAll, insert, update, softDelete } from '@/lib/sheets';
 */

import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// ─── SCHEMA — ordem das colunas por tabela ────────────────────────────────────
export const SCHEMA = {
  tClient: [
    'client_id', 'name', 'cnpj', 'segment', 'city',
    'responsible_name', 'responsible_email', 'responsible_phone',
    'created_at', 'deleted_at',
  ],
  tProduct: [
    'product_id', 'client_id', 'name', 'checkout_app',
    'price', 'currency', 'status',
    'created_at', 'deleted_at',
  ],
  tContact: [
    'contact_id', 'client_id', 'name', 'email', 'phone', 'ddi',
    'doc', 'valid_phone', 'duplicate_phone', 'city', 'tags',
    'status', 'stage', 'origin',
    'utm_source', 'utm_medium', 'utm_campaign',
    'notes', 'consent_given_at', 'created_at', 'deleted_at',
  ],
  tFato: [
    'fato_id', 'client_id', 'contact_id', 'product_id',
    'transaction', 'event', 'event_key',
    'stage', 'status', 'value', 'full_price', 'gross_price',
    'payment_type', 'purchase_status', 'credit_card_flag',
    'lost_status', 'checkout_url',
    'purchase_created_at', 'purchase_paid_at',
    'won_at', 'lost_at', 'created_at', 'deleted_at',
  ],
  tLogin: [
    'user_id', 'client_id', 'name', 'email', 'password_hash',
    'role', 'active', 'last_login_at', 'created_at',
  ],
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetsClient() {
  const auth = getAuth();
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

// ─── CONVERSÃO linhas ↔ objetos ───────────────────────────────────────────────
function rowToObject(headers, row) {
  return headers.reduce((obj, key, i) => {
    obj[key] = row[i] ?? '';
    return obj;
  }, {});
}

function objectToRow(headers, obj) {
  return headers.map(key => obj[key] ?? '');
}

// ─── LEITURA ──────────────────────────────────────────────────────────────────

/**
 * Retorna todos os registros de uma tabela (sem deleted_at preenchido).
 * 
 * @param {string} table  - Nome da aba: 'tClient', 'tContact', etc.
 * @param {string} clientId - Filtra por client_id (isolamento multi-tenant).
 *                            Passe null apenas para tClient e tLogin internos.
 */
export async function getAll(table, clientId = null) {
  const sheets = await getSheetsClient();
  const headers = SCHEMA[table];

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${table}!A2:ZZ`, // pula linha 1 (cabeçalho)
  });

  const rows = res.data.values ?? [];
  let records = rows
    .map(row => rowToObject(headers, row))
    .filter(r => !r.deleted_at); // soft delete — ignora registros removidos

  // Isolamento multi-tenant
  if (clientId) {
    records = records.filter(r => r.client_id === clientId);
  }

  return records;
}

/**
 * Busca um único registro pelo ID primário da tabela.
 */
export async function getById(table, idField, idValue, clientId = null) {
  const all = await getAll(table, clientId);
  return all.find(r => r[idField] === idValue) ?? null;
}

// ─── ESCRITA ──────────────────────────────────────────────────────────────────

/**
 * Insere um novo registro no final da tabela.
 * O objeto deve conter todos os campos obrigatórios.
 */
export async function insert(table, data) {
  const sheets = await getSheetsClient();
  const headers = SCHEMA[table];

  const now = new Date().toISOString();
  const record = {
    ...data,
    created_at: data.created_at || now,
    deleted_at: '',
  };

  const row = objectToRow(headers, record);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${table}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  return record;
}

/**
 * Atualiza campos de um registro existente.
 * Busca a linha pelo idField e sobrescreve os campos passados em data.
 */
export async function update(table, idField, idValue, data, clientId = null) {
  const sheets = await getSheetsClient();
  const headers = SCHEMA[table];

  // Busca todas as linhas brutas para encontrar o índice correto
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${table}!A2:ZZ`,
  });

  const rows = res.data.values ?? [];
  const idIndex = headers.indexOf(idField);
  const clientIndex = headers.indexOf('client_id');

  const rowIndex = rows.findIndex(row => {
    const matchId = row[idIndex] === idValue;
    const matchClient = clientId ? row[clientIndex] === clientId : true;
    return matchId && matchClient;
  });

  if (rowIndex === -1) return null;

  // Reconstrói o objeto mesclando dados antigos com novos
  const existing = rowToObject(headers, rows[rowIndex]);
  const updated = { ...existing, ...data };
  const newRow = objectToRow(headers, updated);

  // +2 porque: +1 pelo cabeçalho, +1 porque Sheets é 1-indexed
  const sheetRow = rowIndex + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${table}!A${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [newRow] },
  });

  return updated;
}

/**
 * Soft delete — preenche deleted_at com timestamp atual.
 * O registro permanece na planilha mas é ignorado pelo getAll.
 * Necessário para LGPD (direito ao esquecimento = apagar os dados pessoais,
 * mas manter o registro anonimizado para fins contábeis).
 */
export async function softDelete(table, idField, idValue, clientId = null) {
  return update(
    table,
    idField,
    idValue,
    { deleted_at: new Date().toISOString() },
    clientId
  );
}
