-- 1. COURSES TABLE (fixed courses with fees, admin can edit/add/delete)
create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fee numeric(10,2) not null,
  admission_charge numeric(10,2) not null default 299,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table courses enable row level security;

create policy "Everyone logged in can view active courses"
  on courses for select
  using (true);

create policy "Admins can insert courses"
  on courses for insert
  with check (is_admin());

create policy "Admins can update courses"
  on courses for update
  using (is_admin());

create policy "Admins can delete courses"
  on courses for delete
  using (is_admin());

-- Starting courses (fee already includes the Rs. 299 admission charge)
insert into courses (name, fee) values
  ('DCA', 5000),
  ('DCA + Tally', 9999),
  ('Bundle Pack (DCA + Tally + Graphics)', 12000),
  ('Graphics Designer', 5000),
  ('Tally Prime', 7999);

-- 2. PROFILES: link to a course + allow admin to set a custom "offer" fee
alter table profiles add column course_id uuid references courses(id);
alter table profiles add column custom_fee numeric(10,2);

-- 3. PAYMENTS: add approval status
alter table payments add column status text not null default 'approved' check (status in ('pending','approved'));

-- Students can submit their own payment (always starts as pending)
create policy "Students can submit own pending payment"
  on payments for insert
  with check (student_id = auth.uid() and status = 'pending');

-- Students can view their own payments regardless of status (select policy already exists, this confirms nothing extra needed)
