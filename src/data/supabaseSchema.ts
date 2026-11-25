// 将来の本番環境（Supabase / PostgreSQL）向けのテーブル設計案
// アプリ内のコレクション名・フィールド名と一対一で対応させています。
export const SUPABASE_SCHEMA = `-- HOSAKA Nutrition 本番用テーブル設計案（Supabase / PostgreSQL）
-- コレクション名＝テーブル名、各フィールド＝カラム。入れ子のデータは jsonb。

create table staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('admin','staff')) default 'staff',
  is_active boolean not null default true,         -- アカウント停止
  created_at timestamptz default now()
);

create table patients (
  id text primary key,
  patient_no text unique not null,
  name text not null, name_kana text,
  birth_date date not null,
  sex text check (sex in ('male','female')),
  height_cm numeric, weight_kg numeric, body_fat_pct numeric, skeletal_muscle_kg numeric,
  occupation text, activity_level text, exercise_habit text, sleep_hours numeric,
  medical_history text, medications text, allergies text,
  visit_status text, purposes text[], purpose_note text, staff_memo text,
  menstruation text, is_student boolean, student jsonb, guidance_active boolean,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid references staff_profiles(id), updated_by uuid references staff_profiles(id)
);

create table questionnaires (id text primary key, patient_id text references patients(id) on delete cascade,
  date date, answers jsonb, notes jsonb, free_text text, staff text, created_at timestamptz default now(), updated_at timestamptz default now());
create table nutrition_plans (id text primary key, patient_id text references patients(id) on delete cascade,
  date date, staff text, bmr_method text, energy_source text, energy_manual numeric, activity_level text,
  pfc jsonb, protein_per_kg numeric, adjustments jsonb, memo text, snapshot jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now());
create table meal_days (id text primary key, patient_id text references patients(id) on delete cascade,
  date date, items jsonb, note text, created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (patient_id, date));
create table foods (id text primary key, name text not null, kana text, category text, state text,
  source text, verified boolean, per100 jsonb, units jsonb, serving jsonb, note text, product_id text,
  created_at timestamptz default now(), updated_at timestamptz default now());
create table materials (id text primary key, category text, title text, audience text, summary text,
  body text, tags text[], month int, created_at timestamptz default now(), updated_at timestamptz default now());
create table distributions (id text primary key, kind text, ref_id text, patient_id text references patients(id) on delete cascade,
  date date, staff text, note text, created_at timestamptz default now());
create table guidance_docs (id text primary key, patient_id text references patients(id) on delete cascade,
  date date, staff text, purposes text[], plan_id text, targets_text text, current_tendency text,
  priorities text, foods jsonb, menu text, next_goals text, closing text, status text,
  created_at timestamptz default now(), updated_at timestamptz default now());
create table progress_records (id text primary key, patient_id text references patients(id) on delete cascade,
  date date, weight_kg numeric, body_fat_pct numeric, skeletal_muscle_kg numeric, sleep_hours numeric,
  fatigue int, meal_summary text, intake_summary text, habit_improvement text, guidance_content text,
  next_goal text, next_check text, staff text, created_at timestamptz default now(), updated_at timestamptz default now());
create table products (id text primary key, name text, maker text, ingredients text, serving_label text,
  serving_grams numeric, nutrients jsonb, allergens text, intake_guide text, price int, cautions text,
  description text, active boolean, created_at timestamptz default now(), updated_at timestamptz default now());
create table audit_logs (id bigserial primary key, at timestamptz default now(),
  staff_id uuid references staff_profiles(id), action text, target text);

-- Row Level Security：有効なスタッフだけが読み書き、削除は管理者のみ
alter table patients enable row level security;
create policy "active staff read" on patients for select
  using (exists (select 1 from staff_profiles s where s.id = auth.uid() and s.is_active));
create policy "active staff write" on patients for insert with check
  (exists (select 1 from staff_profiles s where s.id = auth.uid() and s.is_active));
create policy "active staff update" on patients for update
  using (exists (select 1 from staff_profiles s where s.id = auth.uid() and s.is_active));
create policy "admin delete" on patients for delete
  using (exists (select 1 from staff_profiles s where s.id = auth.uid() and s.is_active and s.role = 'admin'));
-- ※ 他の患者関連テーブルにも同様のポリシーを設定する
`;
