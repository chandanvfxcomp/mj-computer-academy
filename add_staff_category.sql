-- 1. Staff ko ek category assign karne ke liye column (null = sab dekh sakta hai)
alter table profiles add column if not exists staff_category text check (staff_category in ('computer','academic'));

-- 2. Function jo logged-in staff ki category batayega (RLS loop se bachne ke liye)
create or replace function staff_category()
returns text
language sql
security definer
set search_path = public
as $$
  select staff_category from profiles where id = auth.uid() and role = 'staff';
$$;

-- 3. Purani "admin+staff combined" policies hatao
drop policy if exists "Admins and staff can view all profiles" on profiles;
drop policy if exists "Admins and staff can view all payments" on payments;
drop policy if exists "Admins and staff can insert payments" on payments;
drop policy if exists "Admins and staff can update payments" on payments;
drop policy if exists "Admins and staff can delete payments" on payments;

-- 4. Admin: full access (unchanged)
create policy "Admins can view all profiles"
  on profiles for select
  using (is_admin());

create policy "Admins can view all payments"
  on payments for select
  using (is_admin());

create policy "Admins can insert payments"
  on payments for insert
  with check (is_admin());

create policy "Admins can update payments"
  on payments for update
  using (is_admin());

create policy "Admins can delete payments"
  on payments for delete
  using (is_admin());

-- 5. Staff: sirf apni category ke students/payments (agar category set nahi hai, toh sab dikhega)
create policy "Staff can view their category students"
  on profiles for select
  using (
    is_staff() and role = 'student' and (
      staff_category() is null
      or exists (
        select 1 from courses c
        where c.id = profiles.course_id and c.category = staff_category()
      )
    )
  );

create policy "Staff can view their category payments"
  on payments for select
  using (
    is_staff() and (
      staff_category() is null
      or exists (
        select 1 from profiles p join courses c on c.id = p.course_id
        where p.id = payments.student_id and c.category = staff_category()
      )
    )
  );

create policy "Staff can insert their category payments"
  on payments for insert
  with check (
    is_staff() and (
      staff_category() is null
      or exists (
        select 1 from profiles p join courses c on c.id = p.course_id
        where p.id = payments.student_id and c.category = staff_category()
      )
    )
  );

create policy "Staff can update their category payments"
  on payments for update
  using (
    is_staff() and (
      staff_category() is null
      or exists (
        select 1 from profiles p join courses c on c.id = p.course_id
        where p.id = payments.student_id and c.category = staff_category()
      )
    )
  );

create policy "Staff can delete their category payments"
  on payments for delete
  using (
    is_staff() and (
      staff_category() is null
      or exists (
        select 1 from profiles p join courses c on c.id = p.course_id
        where p.id = payments.student_id and c.category = staff_category()
      )
    )
  );
