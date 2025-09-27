exports.up = function(knex) {
    return knex.schema.createTable('barcode_scans', function(table) {
        table.increments('id').primary();
        table.string('shipmentId').references('id').inTable('shipments').onDelete('CASCADE');
        table.string('scannerId').nullable(); // Physical scanner device ID
        table.integer('courierId').references('id').inTable('users').nullable();
        table.string('previousStatus');
        table.string('newStatus');
        table.timestamp('scannedAt').defaultTo(knex.fn.now());
        table.integer('scannedBy').references('id').inTable('users');
        table.text('notes').nullable();
        table.timestamps(true, true);
        
        table.index(['shipmentId']);
        table.index(['courierId']);
        table.index(['scannedAt']);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('barcode_scans');
};