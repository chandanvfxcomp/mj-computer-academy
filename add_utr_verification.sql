-- Payment mein UTR number aur screenshot ka data
alter table payments add column if not exists utr_number text;
alter table payments add column if not exists screenshot_url text;
alter table payments add column if not exists ocr_matched boolean;

-- Screenshot store karne ke liye storage bucket
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', true)
on conflict (id) do nothing;

-- Student sirf apne khud ke folder mein upload kar sake
create policy "Students can upload own payment screenshots"
on storage.objects for insert
to authenticated
with check (bucket_id = 'payment-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

-- Sab (admin + student) screenshot dekh sake
create policy "Anyone logged in can view payment screenshots"
on storage.objects for select
to authenticated
using (bucket_id = 'payment-screenshots');
