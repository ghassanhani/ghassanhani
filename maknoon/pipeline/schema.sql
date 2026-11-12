-- Maknoon content graph (SPEC §3). Postgres (Supabase) is the source of truth;
-- device packs are SQLite exports of the same tables.
-- Apply with: psql "$DATABASE_URL" -f pipeline/schema.sql   (safe to re-run)

create extension if not exists vector;
create extension if not exists pg_trgm;

create table if not exists license (
  id text primary key,                 -- 'cc-by-3.0', 'cc-by-nd-4.0'
  name text not null,
  url text,
  attribution text not null            -- the string the app must display
);

create table if not exists source (
  id text primary key,                 -- 'tanzil', 'ratq:tafsir-center'
  name_ar text, name_en text,
  url text,
  status text not null default 'ask' check (status in ('cleared', 'ask', 'blocked'))  -- SPEC §4
);

create table if not exists edition (
  id text primary key,                 -- 'tanzil-uthmani', 'ratq:cms-5'
  source_id text not null references source(id),
  license_id text not null references license(id),
  title_ar text, title_en text,
  version text,
  imported_at timestamptz,
  import_sha256 text                   -- hash recorded by the importer's verification step
);

create table if not exists node (
  id text primary key,                 -- 'ayah:2:255', 'hadith:bukhari:1', 'tafsir:ibn-kathir:2:255'
  type text not null check (type in (
    'ayah','surah','word','root','lemma','tafsir_passage','hadith','hadith_variant_cluster','isnad','narrator',
    'person','sharh_passage','fiqh_issue','fiqh_position','usul_principle','legal_maxim','maqsad','aqidah_topic',
    'akhlaq_topic','grammar_rule','lexicon_entry','event','place','book','topic','dhikr','learning_path')),
  title_ar text, title_en text,
  body_ar text,                        -- canonical, exactly as imported
  body_ar_norm text,                   -- normalized (src/search/arabic.ts normalize), search only
  meta jsonb not null default '{}',
  source_id text not null references source(id),
  edition_id text references edition(id),
  license_id text not null references license(id),
  embedding vector(1024)               -- filled in the semantic-search milestone (BGE-M3)
);
create index if not exists node_type on node (type);
create index if not exists node_norm_trgm on node using gin (body_ar_norm gin_trgm_ops);
create index if not exists node_norm_fts on node using gin (to_tsvector('simple', coalesce(body_ar_norm, '')));

create table if not exists reviewer (
  id text primary key,
  name text not null,
  role text not null                   -- 'scholar', 'founder', 'editor'
);

create table if not exists edge (
  id bigserial primary key,
  src text not null references node(id),
  dst text not null references node(id),
  rel text not null check (rel in (
    'explains','cites','evidence_for','occasion_of','abrogates','parallel_of','narrated_by','teacher_of',
    'participant_in','located_at','about_topic','same_root','part_of','derived_by','applies_to',
    'cause_of_disagreement','exemplified_by','defines')),
  qualifier jsonb not null default '{}',   -- madhhab, order, disputed
  provenance text not null,                -- 'imported:<source>', 'citation_mined', 'scholar'
  confidence real,
  status text not null default 'suggested' check (status in ('suggested', 'reviewed', 'rejected')),
  reviewed_by text references reviewer(id),
  reviewed_at timestamptz,
  evidence_ref text,                       -- where the link is stated (book, volume, page)
  -- CLAUDE.md rule 4: only a human reviewer moves a link out of 'suggested'
  check (status = 'suggested' or (reviewed_by is not null and reviewed_at is not null)),
  unique (src, dst, rel, provenance)
);
create index if not exists edge_src on edge (src, status);
create index if not exists edge_dst on edge (dst, status);

create table if not exists grading (
  hadith_id text not null references node(id),
  grader_id text not null,
  verdict text not null,
  source_ref text not null,
  primary key (hadith_id, grader_id, source_ref)
);

create table if not exists audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor text not null,                 -- reviewer id or 'importer:<source>'
  action text not null,                -- 'edge.review', 'edge.reject', 'import.load', 'import.rollback'
  target text not null,                -- edge id or edition id
  before jsonb, after jsonb
);

-- Every status change of a link is recorded (SPEC M4).
create or replace function log_edge_review() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into audit_log (actor, action, target, before, after)
    values (coalesce(new.reviewed_by, 'unknown'), 'edge.' || new.status, new.id::text,
            jsonb_build_object('status', old.status), jsonb_build_object('status', new.status));
  end if;
  return new;
end $$;
drop trigger if exists edge_review_audit on edge;
create trigger edge_review_audit after update on edge for each row execute function log_edge_review();

-- What the app reads by default: reviewed links only.
create or replace view reviewed_edge as select * from edge where status = 'reviewed';
