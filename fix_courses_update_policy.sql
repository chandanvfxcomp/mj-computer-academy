drop policy if exists "Admins can update courses" on courses;
create policy "Admins can update courses"
  on courses for update
  using (is_admin())
  with check (is_admin());
