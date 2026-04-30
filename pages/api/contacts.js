// pages/api/contacts.js
import { getAll } from '@/lib/sheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { search = '', page = '1', limit = '50', clientId = null } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));

    let contacts = await getAll('tContact', clientId);

    // Filtra soft-deleted (já feito no getAll, mas garantia extra)
    contacts = contacts.filter(c => !c.deleted_at);

    // Busca por nome, email ou telefone
    if (search.trim()) {
      const q = search.toLowerCase();
      contacts = contacts.filter(c =>
        (c.name  || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.city  || '').toLowerCase().includes(q)
      );
    }

    const total = contacts.length;
    const totalPages = Math.ceil(total / limitNum);
    const start = (pageNum - 1) * limitNum;
    const paginated = contacts.slice(start, start + limitNum);

    // Retorna apenas campos necessários para a UI (nunca expor dados sensíveis desnecessários)
    const safeContacts = paginated.map(c => ({
      contact_id:    c.contact_id,
      name:          c.name,
      email:         c.email,
      phone:         c.phone,
      city:          c.city,
      tags:          c.tags,
      status:        c.status,
      stage:         c.stage,
      origin:        c.origin,
      created_at:    c.created_at,
    }));

    return res.status(200).json({
      data: safeContacts,
      meta: { total, page: pageNum, totalPages, limit: limitNum },
    });

  } catch (err) {
    console.error('[API /contacts]', err);
    return res.status(500).json({ error: 'Erro ao buscar contatos' });
  }
}
