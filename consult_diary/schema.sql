-- 1. Create users table extending auth.users
create table public.users (
  id uuid references auth.users not null primary key,
  name text,
  role text check (role in ('admin', 'consultant'))
);

-- Enable RLS
alter table public.users enable row level security;

-- 2. Create customers table
create table public.customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create stages table
create table public.stages (
  id serial primary key,
  name text not null,
  description text
);

-- 4. Create stage_guides table
create table public.stage_guides (
  id serial primary key,
  stage_id integer references public.stages(id) on delete cascade,
  law_text text,
  guide_text text,
  checklist jsonb
);

-- 5. Create cases table
create table public.cases (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.customers(id) on delete cascade,
  case_type text not null,
  status text default '진행중',
  current_stage_id integer references public.stages(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create logs table
create table public.logs (
  id uuid default gen_random_uuid() primary key,
  case_id uuid references public.cases(id) on delete cascade,
  content text not null,
  created_by text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert Sample Stages & Guides
insert into public.stages (id, name, description) values
(1, '초기상담', '고객과 처음 만나는 단계'),
(2, '서류검토', '제출된 서류를 검토하는 단계'),
(3, '계약진행', '실제 계약을 체결하는 단계');

insert into public.stage_guides (stage_id, law_text, guide_text, checklist) values
(1, '공인중개사법 제25조 (중개대상물의 확인·설명)', '고객의 요구사항을 명확히 파악하고, 기본적인 안내를 진행하세요.', '["고객 신분 확인", "요구사항 메모", "예상 비용 안내"]'),
(2, '부동산 거래신고 등에 관한 법률 제3조', '등기부등본 및 관련 서류를 꼼꼼히 확인하세요.', '["등기부등본 열람", "건축물대장 확인", "권리관계 분석"]'),
(3, '민법 제563조 (매매의 의의)', '계약서를 작성하고 양 당사자의 서명 날인을 받으세요.', '["계약서 초안 작성", "특약사항 확인", "계약금 입금 확인"]');
