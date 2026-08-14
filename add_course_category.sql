alter table courses add column if not exists category text not null default 'computer' check (category in ('computer','academic'));
