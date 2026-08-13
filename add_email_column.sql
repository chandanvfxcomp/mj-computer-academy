alter table profiles add column if not exists email text;

-- Existing students ka email bhi fill kar do (auth.users se)
update profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;
