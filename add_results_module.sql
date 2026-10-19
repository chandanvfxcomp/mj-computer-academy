-- ===== RESULTS MODULE =====

-- 1. Exams: har exam kisi ek course/class ke liye hota hai
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course_id uuid not null references courses(id) on delete cascade,
  exam_date date not null default current_date,
  max_marks numeric(6,2) not null check (max_marks > 0),
  created_at timestamptz default now()
);

-- 2. Results: har student ke marks (ek exam mein ek hi result)
create table if not exists exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  marks numeric(6,2) not null check (marks >= 0),
  remarks text,
  created_at timestamptz default now(),
  unique (exam_id, student_id)
);

alter table exams enable row level security;
alter table exam_results enable row level security;

-- 3. EXAMS permissions
drop policy if exists "Admins manage exams" on exams;
create policy "Admins manage exams" on exams
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Staff manage category exams" on exams;
create policy "Staff manage category exams" on exams
  for all
  using (
    is_staff() and (
      staff_category() is null
      or exists (select 1 from courses c where c.id = exams.course_id and c.category = staff_category())
    )
  )
  with check (
    is_staff() and (
      staff_category() is null
      or exists (select 1 from courses c where c.id = exams.course_id and c.category = staff_category())
    )
  );

drop policy if exists "Students view own course exams" on exams;
create policy "Students view own course exams" on exams
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.course_id = exams.course_id)
    or exists (select 1 from exam_results r where r.exam_id = exams.id and r.student_id = auth.uid())
  );

-- 4. EXAM_RESULTS permissions
drop policy if exists "Admins manage results" on exam_results;
create policy "Admins manage results" on exam_results
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Staff manage category results" on exam_results;
create policy "Staff manage category results" on exam_results
  for all
  using (
    is_staff() and exists (
      select 1 from profiles p join courses c on c.id = p.course_id
      where p.id = exam_results.student_id
        and (staff_category() is null or c.category = staff_category())
    )
  )
  with check (
    is_staff() and exists (
      select 1 from profiles p join courses c on c.id = p.course_id
      where p.id = exam_results.student_id
        and (staff_category() is null or c.category = staff_category())
    )
  );

-- Student sirf APNA result dekh sakta hai
drop policy if exists "Students view own results" on exam_results;
create policy "Students view own results" on exam_results
  for select using (student_id = auth.uid());
