-- Jin students ka code nahi hai, unko naya professional unique code do
with numbered as (
  select id, full_name, created_at,
    row_number() over (order by created_at) as rn
  from profiles
  where role = 'student' and (student_code is null or student_code = '')
)
update profiles p
set student_code = 'MJCA' || to_char(now(), 'YY') || upper(left(n.full_name, 1)) || lpad(n.rn::text, 4, '0')
from numbered n
where p.id = n.id;
