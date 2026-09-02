UPDATE branches SET code='NTH', name='North Branch', address='Demo pickup location A · address withheld', phone='Contact withheld for demo' WHERE id='branch-angeles';
--> statement-breakpoint
UPDATE branches SET code='CTR', name='Central Branch', address='Demo pickup location B · address withheld', phone='Contact withheld for demo' WHERE id='branch-san-fernando';
--> statement-breakpoint
UPDATE branches SET code='STH', name='South Branch', address='Demo pickup location C · address withheld', phone='Contact withheld for demo' WHERE id='branch-tarlac';
--> statement-breakpoint
UPDATE products SET brand='Store Select' WHERE lower(brand) LIKE '%pclogic%';
--> statement-breakpoint
INSERT INTO store_settings (key,value,updated_at) VALUES ('businessName','TECH SYSTEMS',CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO store_settings (key,value,updated_at) VALUES ('supportEmail','hello@techsystems.example',CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO store_settings (key,value,updated_at) VALUES ('supportPhone','Contact withheld for demo',CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP;
--> statement-breakpoint
UPDATE orders SET order_number=replace(order_number,'PCL-','TS-') WHERE order_number LIKE 'PCL-%';
--> statement-breakpoint
UPDATE notifications SET order_number=replace(order_number,'PCL-','TS-'), subject=replace(replace(subject,'PClogic','Tech Systems'),'PC LOGIC','TECH SYSTEMS'), body=replace(replace(body,'PClogic','Tech Systems'),'PC LOGIC','TECH SYSTEMS') WHERE order_number LIKE 'PCL-%' OR subject LIKE '%PClogic%' OR body LIKE '%PClogic%';
--> statement-breakpoint
UPDATE stock_movements SET reference=replace(reference,'PCL-','TS-') WHERE reference LIKE 'PCL-%';
--> statement-breakpoint
UPDATE commerce_records SET reference='NORTH5', title='5% North Branch pickup offer', payload=replace(replace(payload,'PCL-','TS-'),'ANGELES5','NORTH5'), updated_at=CURRENT_TIMESTAMP WHERE id='seed-promo-pickup';
--> statement-breakpoint
UPDATE commerce_records SET payload=replace(payload,'PCL-','TS-'), updated_at=CURRENT_TIMESTAMP WHERE payload LIKE '%PCL-%';
