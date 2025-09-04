const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: './flash.sqlite' },
  useNullAsDefault: true
});

async function manageFlyers() {
  try {
    console.log('Managing flyer inventory items...');
    
    // First, let's see what's currently in the database
    const current = await knex('inventory_items').select('*');
    console.log('\n=== CURRENT INVENTORY ===');
    current.forEach(item => {
      console.log(`${item.id}: ${item.name} (${item.quantity} ${item.unit})`);
    });
    
    // Define the flyer items we want to add
    const flyerItems = [
      { 
        id: 'inv_flyer_sm', 
        name: 'Small Flyer', 
        quantity: 2000, 
        unit: 'flyers', 
        lastUpdated: new Date().toISOString(), 
        minStock: 500, 
        unitPrice: 0.25 
      },
      { 
        id: 'inv_flyer_md', 
        name: 'Medium Flyer', 
        quantity: 1500, 
        unit: 'flyers', 
        lastUpdated: new Date().toISOString(), 
        minStock: 300, 
        unitPrice: 0.35 
      },
      { 
        id: 'inv_flyer_lg', 
        name: 'Large Flyer', 
        quantity: 1000, 
        unit: 'flyers', 
        lastUpdated: new Date().toISOString(), 
        minStock: 200, 
        unitPrice: 0.50 
      }
    ];
    
    console.log('\n=== ADDING FLYERS ===');
    
    // Add each flyer item if it doesn't exist
    for (const flyer of flyerItems) {
      try {
        const exists = await knex('inventory_items').where('id', flyer.id).first();
        if (!exists) {
          await knex('inventory_items').insert(flyer);
          console.log(`✅ Added: ${flyer.name}`);
        } else {
          console.log(`⚠️  Already exists: ${flyer.name} (${exists.quantity} in stock)`);
          // Update existing flyer with new quantities
          await knex('inventory_items').where('id', flyer.id).update({
            quantity: flyer.quantity,
            lastUpdated: flyer.lastUpdated
          });
          console.log(`📝 Updated ${flyer.name} to ${flyer.quantity} units`);
        }
      } catch (error) {
        console.error(`❌ Error with ${flyer.name}:`, error.message);
      }
    }
    
    // Show final inventory
    console.log('\n=== FINAL INVENTORY ===');
    const final = await knex('inventory_items').select('*').orderBy('id');
    final.forEach(item => {
      console.log(`${item.id}: ${item.name} (${item.quantity} ${item.unit}) - $${item.unitPrice}`);
    });
    
    console.log('\n✅ Flyer management completed!');
    
  } catch (error) {
    console.error('❌ Error managing flyers:', error);
  } finally {
    await knex.destroy();
  }
}

manageFlyers();
