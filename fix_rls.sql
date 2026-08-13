-- Ye function role check karega bina RLS loop ke
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Purani policies hatao jo loop create kar rahi thi
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Admins can insert profiles" on profiles;
drop policy if exists "Admins can update profiles" on profiles;
drop policy if exists "Admins can view all payments" on payments;
drop policy if exists "Admins can insert payments" on payments;
drop policy if exists "Admins can update payments" on payments;
drop policy if exists "Admins can delete payments" on payments;

-- Naye function ke sath dobara banao
create policy "Admins can view all profiles"
  on profiles for select
  using (is_admin());

create policy "Admins can insert profiles"
  on profiles for insert
  with check (is_admin());

create policy "Admins can update profiles"
  on profiles for update
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
