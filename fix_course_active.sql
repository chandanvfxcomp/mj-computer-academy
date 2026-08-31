-- Ensure karo ki 'active' column exist karta hai (agar pehle se hai toh kuch nahi hoga)
alter table courses add column if not exists active boolean not null default true;

-- Check karo abhi courses ka active status kya hai
select id, name, active from courses order by name;
