INSERT OR IGNORE INTO `branches` (`id`,`code`,`name`,`address`,`phone`,`active`) VALUES
('branch-angeles','NTH','North Branch','Demo pickup location A · address withheld','Contact withheld for demo',1),
('branch-san-fernando','CTR','Central Branch','Demo pickup location B · address withheld','Contact withheld for demo',1),
('branch-tarlac','STH','South Branch','Demo pickup location C · address withheld','Contact withheld for demo',1);
--> statement-breakpoint
INSERT OR IGNORE INTO `products` (`id`,`sku`,`name`,`brand`,`category`,`description`,`price`,`form_factor`,`active`) VALUES
('prd-case-pano','CASE-ATX-PANO','Panorama Glass ARGB Case','Store Select','Case','Dual-chamber panoramic glass case with an open showcase layout.',4295,'ATX',1),
('prd-case-compact','CASE-MATX-MESH','Compact Mesh mATX Case','Store Select','Case','Space-saving white mesh case with tempered glass and strong airflow.',3495,'mATX',1);
--> statement-breakpoint
INSERT OR IGNORE INTO `inventory` (`id`,`branch_id`,`product_id`,`quantity`,`reserved`,`reorder_level`) VALUES
('inv-ang-prd-case-pano','branch-angeles','prd-case-pano',6,0,3),
('inv-sfp-prd-case-pano','branch-san-fernando','prd-case-pano',4,0,3),
('inv-tar-prd-case-pano','branch-tarlac','prd-case-pano',3,0,3),
('inv-ang-prd-case-compact','branch-angeles','prd-case-compact',7,0,3),
('inv-sfp-prd-case-compact','branch-san-fernando','prd-case-compact',5,0,3),
('inv-tar-prd-case-compact','branch-tarlac','prd-case-compact',3,0,3);
