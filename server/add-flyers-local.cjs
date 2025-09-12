const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: './flash.sqlite' },
  useNullAsDefault: true
});

async function addFlyers() {
  try {
    console.log('Adding flyers to existing inventory...');
    
    const flyerItems = [
      { id: 'inv_flyer_sm', name: 'Small Flyer', quantity: 2000, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 500, unitPrice: 0.25 },
      { id: 'inv_flyer_md', name: 'Medium Flyer', quantity: 1500, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 300, unitPrice: 0.35 },
      { id: 'inv_flyer_lg', name: 'Large Flyer', quantity: 1000, unit: 'flyers', lastUpdated: new Date().toISOString(), minStock: 200, unitPrice: 0.50 }
    ];
    
    for (const flyer of flyerItems) {
      const exists = await knex('inventory_items').where('id', flyer.id).first();
      if (!exists) {
        await knex('inventory_items').insert(flyer);
        console.log(`✅ Added: ${flyer.name}`);
      } else {
        console.log(`⚠️ Already exists: ${flyer.name}`);
      }
    }
    
    console.log('\n📦 Current inventory:');
    const all = await knex('inventory_items').select('*').orderBy('id');
    all.forEach(item => console.log(`  ${item.id}: ${item.name} (${item.quantity})`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await knex.destroy();
  }
}

addFlyers();
