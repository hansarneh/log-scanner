-- Sample products for testing
INSERT INTO products (ean, sku, name, price_kr) VALUES
('4007817327320', 'SKU001', 'Industrial Pump 2000', 150.00),
('4007817327321', 'SKU002', 'Hydraulic Valve Set', 85.00),
('4007817327322', 'SKU003', 'Steel Pipe 2m', 12.00),
('4007817327323', 'SKU004', 'Control Panel Basic', 250.00),
('4007817327324', 'SKU005', 'Solenoid Actuator', 32.00),
('4007817327325', 'SKU006', 'Pressure Sensor', 18.00),
('4007817327326', 'SKU007', 'Flow Meter Digital', 42.00),
('4007817327327', 'SKU008', 'Motor Mount Bracket', 9.50),
('4007817327328', 'SKU009', 'Seal Kit Standard', 7.50),
('4007817327329', 'SKU010', 'Filter Element 10μm', 4.50),
('4007817327330', 'SKU011', 'Gearbox Assembly', 150.00),
('4007817327331', 'SKU012', 'Coupling Flexible', 28.00),
('4007817327332', 'SKU013', 'Bearing Set', 12.00),
('4007817327333', 'SKU014', 'Shaft Extension', 8.50),
('4007817327334', 'SKU015', 'Mounting Plate', 6.50),
('4007817327335', 'SKU016', 'Electrical Connector', 3.50),
('4007817327336', 'SKU017', 'Cable Gland', 1.80),
('4007817327337', 'SKU018', 'Terminal Block', 4.20),
('4007817327338', 'SKU019', 'LED Indicator', 1.20),
('4007817327339', 'SKU020', 'Push Button', 0.95)
ON CONFLICT (ean) DO NOTHING;
