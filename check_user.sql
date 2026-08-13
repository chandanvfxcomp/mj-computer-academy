select u.email, p.role, p.full_name
from auth.users u
left join profiles p on p.id = u.id;
