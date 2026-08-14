alter table profiles add column if not exists date_of_birth date;
alter table profiles add column if not exists guardian_phone text;
alter table profiles add column if not exists joining_date date default current_date;
alter table profiles add column if not exists batch_timing text;
