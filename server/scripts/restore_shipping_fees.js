const { knex } = require('../db');

async function runRestore() {
  console.log('Starting restore_shipping_fees run');
  const rows = await knex('client_transactions')
    .where('description', 'like', 'Shipping fee for delivered shipment %')
    .andWhere('amount', '<', 0)
    .select();

  if (!rows || rows.length === 0) {
    console.log('No historical shipping-fee deductions found. Nothing to do.');
    return { inserted: 0, affectedUsers: 0 };
  }

  console.log(`Found ${rows.length} shipping-fee deduction(s). Preparing to insert reversing deposits.`);
  const affectedUserIds = [...new Set(rows.map(r => r.userId))];

  await knex.transaction(async (trx) => {
    const inserted = [];

    for (const row of rows) {
      const refundId = `REV_${row.id}`;
      const refund = {
        id: refundId,
        userId: row.userId,
        type: 'Deposit',
        amount: Math.abs(Number(row.amount) || 0),
        date: new Date().toISOString(),
        description: `Refund shipping fee for ${row.description.replace(/^Shipping fee for delivered shipment /, '')}`,
        status: 'Processed'
      };

      const exists = await trx('client_transactions').where({ id: refundId }).first();
      if (exists) {
        console.log(`Skipping already-inserted refund ${refundId}`);
        continue;
      }

      await trx('client_transactions').insert(refund);
      inserted.push(refund);
    }

    // Recalculate wallet balances for affected users
    for (const userId of affectedUserIds) {
      const sumRow = await trx('client_transactions').where({ userId }).sum({ total: 'amount' }).first();
      const newBalance = Number((sumRow && sumRow.total) || 0);
      await trx('users').where({ id: userId }).update({ walletBalance: newBalance });
      console.log(`Updated walletBalance for user ${userId} -> ${newBalance.toFixed(2)}`);
    }

    console.log(`Inserted ${inserted.length} refund(s) across ${affectedUserIds.length} user(s).`);
  });

  return { insertedCount: rows.length, affectedUsers: affectedUserIds.length };
}

if (require.main === module) {
  (async () => {
    try {
      const result = await runRestore();
      console.log('restore_shipping_fees completed', result);
      process.exit(0);
    } catch (err) {
      console.error('Error running restore_shipping_fees:', err);
      process.exit(2);
    }
  })();
}

module.exports = { runRestore };
