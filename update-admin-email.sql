-- Update admin email from admin@flash.com to admin@shuhna.net
-- This script safely updates the admin user email in the database

UPDATE users 
SET email = 'admin@shuhna.net' 
WHERE email = 'admin@flash.com' 
  AND roles LIKE '%Administrator%';

-- Verify the update
SELECT id, email, name, roles 
FROM users 
WHERE email = 'admin@shuhna.net';
