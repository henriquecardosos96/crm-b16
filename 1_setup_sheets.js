/**
 * LABORA CRM — Setup do Google Sheets
 * 
 * Execução:
 *   node 1_setup_sheets.js
 * 
 * Pré-requisitos:
 *   npm install googleapis
 *   Arquivo credentials.json na mesma pasta (service account do Google Cloud)
 * 
 * O script cria (ou limpa) as 5 abas do CRM e insere os cabeçalhos corretos.
 */

const { google } = require('googleapis');
const path = require('path');

// ─── CONFIGURAÇÃO ────────────────────────────────────────────────────────────
const SPREADSHEET_ID = 'COLE_AQUI_O_ID_DA_SUA_PLANILHA';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// Schema completo — ordem dos campos = ordem das colunas na planilha
const SCHEMA = {
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

// ─── AUTENTICAÇÃO ────────────────────────────────────────────────────────────
async function getAuth() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth.getClient();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function getExistingSheets(sheets) {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return res.data.sheets.map(s => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
  }));
}

async function createSheet(sheets, title) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
  console.log(`  ✓ Aba criada: ${title}`);
}

async function clearAndSetHeaders(sheets, tabName, headers) {
  // Limpa o conteúdo existente
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:ZZ`,
  });

  // Insere cabeçalhos na linha 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] },
  });

  console.log(`  ✓ Cabeçalhos inseridos em ${tabName} (${headers.length} colunas)`);
}

async function formatHeaderRow(sheets, sheetId) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          // Linha 1 em negrito + fundo cinza
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 },
                textFormat: { bold: true },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        {
          // Congela a primeira linha
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    },
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Labora CRM — Setup do Google Sheets\n');

  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const existing = await getExistingSheets(sheets);
  const existingTitles = existing.map(s => s.title);

  for (const [tabName, headers] of Object.entries(SCHEMA)) {
    console.log(`\n📋 Processando ${tabName}...`);

    // Cria a aba se não existir
    if (!existingTitles.includes(tabName)) {
      await createSheet(sheets, tabName);
    }

    // Insere cabeçalhos
    await clearAndSetHeaders(sheets, tabName, headers);

    // Busca o sheetId atualizado para formatar
    const updatedSheets = await getExistingSheets(sheets);
    const sheet = updatedSheets.find(s => s.title === tabName);
    if (sheet) {
      await formatHeaderRow(sheets, sheet.sheetId);
      console.log(`  ✓ Formatação aplicada`);
    }
  }

  console.log('\n✅ Setup concluído! Planilha pronta para uso.\n');
  console.log(`🔗 https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}\n`);
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
