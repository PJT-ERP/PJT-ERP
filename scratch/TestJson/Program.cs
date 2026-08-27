using Npgsql;
using System;

var connString = "Host=127.0.0.1;Port=5435;Database=pjt_production;Username=postgres;Password=postgres";
using var conn = new NpgsqlConnection(connString);
conn.Open();

using var cmd3 = new NpgsqlCommand("SELECT i.product_id, i.notes FROM sales_order_items i JOIN sales_orders s ON i.sales_order_id = s.\"Id\" WHERE s.so_number = 'SO-2026-002';", conn);
try {
    using var reader3 = cmd3.ExecuteReader();
    while (reader3.Read()) {
        Console.WriteLine("ProductId: " + reader3.GetGuid(0));
        Console.WriteLine("Notes: " + (reader3.IsDBNull(1) ? "null" : reader3.GetString(1)));
        Console.WriteLine("---");
    }
} catch (Exception e) {
    Console.WriteLine(e.Message);
}
