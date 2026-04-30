// pages/api/deals.js
import { getAll } from '@/lib/sheets';

const STAGE_ORDER = ['Lead', 'Qualificação', 'Proposta', 'Negociação', 'Ganho', 'Perdido'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId = null } = req.query;

    const [fatos, contacts] = await Promise.all([
      getAll('tFato', clientId),
      getAll('tContact', clientId),
    ]);

    // Mapa de contact_id → name para enriquecer os cards
    const contactMap = {};
    contacts.forEach(c => { contactMap[c.contact_id] = c.name; });

    // Agrupa por stage
    const grouped = {};
    STAGE_ORDER.forEach(s => { grouped[s] = { cards: [], total: 0 }; });

    fatos
      .filter(f => !f.deleted_at)
      .forEach(f => {
        const stage = f.stage || 'Lead';
        if (!grouped[stage]) grouped[stage] = { cards: [], total: 0 };

        const value = parseFloat(f.value) || 0;
        grouped[stage].total += value;
        grouped[stage].cards.push({
          fato_id:        f.fato_id,
          contact_name:   contactMap[f.contact_id] || '—',
          contact_id:     f.contact_id,
          product_id:     f.product_id,
          stage:          stage,
          status:         f.status,
          value,
          payment_type:   f.payment_type,
          purchase_status: f.purchase_status,
          won_at:         f.won_at,
          lost_at:        f.lost_at,
          lost_status:    f.lost_status,
          created_at:     f.created_at,
        });
      });

    // Estatísticas do pipeline (para o dashboard)
    const pipeline_total = Object.values(grouped)
      .filter((_, i) => i < 4) // exclui Ganho e Perdido do "ativo"
      .reduce((sum, col) => sum + col.total, 0);

    const total_ganho = grouped['Ganho']?.total || 0;
    const total_perdido = grouped['Perdido']?.total || 0;

    return res.status(200).json({
      data: grouped,
      meta: {
        stages: STAGE_ORDER,
        pipeline_total,
        total_ganho,
        total_perdido,
        total_deals: fatos.filter(f => !f.deleted_at).length,
      },
    });

  } catch (err) {
    console.error('[API /deals]', err);
    return res.status(500).json({ error: 'Erro ao buscar negócios' });
  }
}
