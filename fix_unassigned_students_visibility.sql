-- Jin students ka course assign nahi hai, unhe sabhi staff dekh sakein (category se independent)

drop policy if exists "Staff can view their category students" on profiles;
drop policy if exists "Staff can view their category payments" on payments;
drop policy if exists "Staff can insert their category payments" on payments;
drop policy if exists "Staff can update their category payments" on payments;
drop policy if exists "Staff can delete their category payments" on payments;

create policy "Staff can view their category students"
  on profiles for select
  using (
    is_staff() and role = 'student' and (
      staff_category() is null
      or profiles.course_id is null
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
        select 1 from profiles p
        where p.id = payments.student_id and (
          p.course_id is null
          or exists (select 1 from courses c where c.id = p.course_id and c.category = staff_category())
        )
      )
    )
  );

create policy "Staff can insert their category payments"
  on payments for insert
  with check (
    is_staff() and (
      staff_category() is null
      or exists (
        select 1 from profiles p
        where p.id = payments.student_id and (
          p.course_id is null
          or exists (select 1 from courses c where c.id = p.course_id and c.category = staff_category())
        )
      )
    )
  );

create policy "Staff can update their category payments"
  on payments for update
  using (
    is_staff() and (
      staff_category() is null
      or exists (
        select 1 from profiles p
        where p.id = payments.student_id and (
          p.course_id is null
          or exists (select 1 from courses c where c.id = p.course_id and c.category = staff_category())
        )
      )
    )
  );

create policy "Staff can delete their category payments"
  on payments for delete
  using (
    is_staff() and (
      staff_category() is null
      or exists (
        select 1 from profiles p
        where p.id = payments.student_id and (
          p.course_id is null
          or exists (select 1 from courses c where c.id = p.course_id and c.category = staff_category())
        )
      )
    )
  );
