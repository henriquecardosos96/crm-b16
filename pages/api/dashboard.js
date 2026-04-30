// pages/api/dashboard.js
import { getAll } from '@/lib/sheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId = null } = req.query;

    const [contacts, fatos] = await Promise.all([
      getAll('tContact', clientId),
      getAll('tFato', clientId),
    ]);

    const activeContacts = contacts.filter(c => !c.deleted_at);
    const activeFatos    = fatos.filter(f => !f.deleted_at);

    // ── Métricas de contatos ──
    const total_contacts = activeContacts.length;
    const leads   = activeContacts.filter(c => c.status === 'Lead').length;
    const clientes = activeContacts.filter(c => c.status === 'Cliente').length;

    // ── Canais de origem ──
    const originMap = {};
    activeContacts.forEach(c => {
      const origin = c.origin || 'Outros';
      originMap[origin] = (originMap[origin] || 0) + 1;
    });
    const origins = Object.entries(originMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Pipeline ──
    const ACTIVE_STAGES = ['Lead', 'Qualificação', 'Proposta', 'Negociação'];
    const activeDeals = activeFatos.filter(f => ACTIVE_STAGES.includes(f.stage));
    const pipeline_total = activeDeals.reduce((sum, f) => sum + (parseFloat(f.value) || 0), 0);

    const ganhos  = activeFatos.filter(f => f.stage === 'Ganho');
    const total_ganho = ganhos.reduce((sum, f) => sum + (parseFloat(f.value) || 0), 0);

    // Taxa de conversão (Ganho / total com stage definido)
    const dealsWithStage = activeFatos.filter(f => f.stage);
    const conversion_rate = dealsWithStage.length
      ? Math.round((ganhos.length / dealsWithStage.length) * 100)
      : 0;

    // ── Negócios recentes ──
    const contactMap = {};
    activeContacts.forEach(c => { contactMap[c.contact_id] = c.name; });

    const recent_deals = activeFatos
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6)
      .map(f => ({
        fato_id:      f.fato_id,
        contact_name: contactMap[f.contact_id] || '—',
        stage:        f.stage,
        status:       f.status,
        value:        parseFloat(f.value) || 0,
        created_at:   f.created_at,
      }));

    // ── Contatos recentes ──
    const recent_contacts = activeContacts
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(c => ({
        contact_id: c.contact_id,
        name:       c.name,
        email:      c.email,
        status:     c.status,
        origin:     c.origin,
      }));

    return res.status(200).json({
      kpis: {
        total_contacts,
        leads,
        clientes,
        pipeline_total,
        total_ganho,
        conversion_rate,
        active_deals: activeDeals.length,
      },
      origins,
      recent_deals,
      recent_contacts,
    });

  } catch (err) {
    console.error('[API /dashboard]', err);
    return res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
}
