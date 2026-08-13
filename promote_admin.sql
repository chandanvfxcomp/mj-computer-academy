update profiles
set role = 'admin'
where id = (select id from auth.users where email = 'mjcomputeracademy@gmail.com');
