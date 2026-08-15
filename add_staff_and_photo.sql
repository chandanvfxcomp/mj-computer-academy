-- 1. Allow a new 'staff' role (receptionist) alongside admin/student
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin','student','staff'));

-- 2. Staff-check function (same safe pattern as is_admin, avoids RLS recursion)
create or replace function is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from profiles where id = auth.uid() and role = 'staff'
  );
$$;

-- 3. Staff can view all students/payments and manage payments, same as admin,
--    but CANNOT add/edit/delete students or manage courses (those stay admin-only)
drop policy if exists "Admins can view all profiles" on profiles;
create policy "Admins and staff can view all profiles"
  on profiles for select
  using (is_admin() or is_staff());

drop policy if exists "Admins can view all payments" on payments;
create policy "Admins and staff can view all payments"
  on payments for select
  using (is_admin() or is_staff());

drop policy if exists "Admins can insert payments" on payments;
create policy "Admins and staff can insert payments"
  on payments for insert
  with check (is_admin() or is_staff());

drop policy if exists "Admins can update payments" on payments;
create policy "Admins and staff can update payments"
  on payments for update
  using (is_admin() or is_staff());

drop policy if exists "Admins can delete payments" on payments;
create policy "Admins and staff can delete payments"
  on payments for delete
  using (is_admin() or is_staff());

-- 4. Student photo (for ID cards)
alter table profiles add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

create policy "Admins can upload student photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'student-photos' and is_admin());

create policy "Anyone logged in can view student photos"
on storage.objects for select
to authenticated
using (bucket_id = 'student-photos');
