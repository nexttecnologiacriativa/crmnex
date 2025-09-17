
-- Atualizar o usuário existente para ser super admin
UPDATE profiles 
SET super_admin_role = 'super_admin' 
WHERE email = 'otavio@otaviojames.com';
