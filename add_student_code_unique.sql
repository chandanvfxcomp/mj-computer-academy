-- Student code ko database level pe unique banate hain (safety ke liye)
-- Agar ye fail ho ("duplicate key") toh matlab pehle se hi 2 students ka code same hai —
-- pehle unme se ek ka code manually alag karna padega, phir ye dobara run karna
alter table profiles add constraint profiles_student_code_unique unique (student_code);
