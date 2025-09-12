const knex = require('knex')({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
});

async function addFlyersToPostgres() {
  try {
    console.log('🔗 Connecting to PostgreSQL database...');
    
    // Test connection
    await knex.raw('SELECT 1');
    console.log('✅ Connected to PostgreSQL successfully');
    
    // Check current inventory items
    console.log('\n📦 Current inventory items:');
    const current = await knex('inventory_items').select('*').orderBy('id');
    current.forEach(item => {
      console.log(`  ${item.id}: ${item.name} (${item.quantity} ${item.unit})`);
    });
    
    // Define flyer items
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
    
    console.log('\n📋 Adding/updating flyer items...');
    
    // Add or update each flyer item
    for (const flyer of flyerItems) {
      try {
        const exists = await knex('inventory_items').where('id', flyer.id).first();
        
        if (!exists) {
          await knex('inventory_items').insert(flyer);
          console.log(`✅ Added: ${flyer.name} (${flyer.quantity} units)`);
        } else {
          await knex('inventory_items')
            .where('id', flyer.id)
            .update({
              quantity: flyer.quantity,
              lastUpdated: flyer.lastUpdated,
              minStock: flyer.minStock,
              unitPrice: flyer.unitPrice
            });
          console.log(`📝 Updated: ${flyer.name} (${flyer.quantity} units)`);
        }
      } catch (error) {
        console.error(`❌ Error with ${flyer.name}:`, error.message);
      }
    }
    
    // Show final inventory
    console.log('\n📦 Final inventory items:');
    const final = await knex('inventory_items').select('*').orderBy('id');
    final.forEach(item => {
      const isFlyer = item.id.includes('flyer');
      const emoji = isFlyer ? '📄' : (item.id.includes('box') ? '📦' : '🔧');
      console.log(`  ${emoji} ${item.id}: ${item.name} (${item.quantity} ${item.unit}) - $${item.unitPrice}`);
    });
    
    console.log('\n🎉 Flyer management completed successfully!');
    
  } catch (error) {
    console.error('❌ Error managing flyers:', error);
  } finally {
    await knex.destroy();
  }
}

// Check if we have environment variables
if (!process.env.DATABASE_URL && !process.env.DATABASE_PRIVATE_URL) {
  console.error('❌ No DATABASE_URL or DATABASE_PRIVATE_URL environment variable found');
  console.log('💡 Make sure to set your PostgreSQL connection string');
  process.exit(1);
}

addFlyersToPostgres();
