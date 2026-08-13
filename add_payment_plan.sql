-- Course ki total duration (months mein) — installment calculate karne ke liye
alter table courses add column if not exists duration_months integer not null default 6;

-- Student kaunsa payment plan use kar raha hai
alter table profiles add column if not exists payment_plan text default 'monthly'
  check (payment_plan in ('monthly','half_yearly','yearly','one_time'));
