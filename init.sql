create table if not exists users (
  id uuid primary key,
  user_name varchar(31) unique not null,
  display_name varchar(127) not null,
  pwd char(160) not null,
  email varchar(320) unique not null,
  created_at timestamp not null
);

create table if not exists pending_unverified_users (
  id uuid primary key,
  user_name varchar(31) not null,
  display_name varchar(127) not null,
  pwd char(160) not null,
  email varchar(320) not null,
  verification_code char(160) not null,
  verification_code_attempts integer not null,
  created_at timestamp not null
);

create table if not exists pending_user_details_changes (
  id uuid primary key,
  user_id uuid not null,
  new_user_name varchar(31) not null,
  new_display_name varchar(127) not null,
  new_email varchar(320) not null,
  created_at timestamp not null,
  constraint fk_user foreign key (user_id) references users (id) on delete cascade
);

create table if not exists pending_user_email_changes (
  id uuid primary key,
  user_id uuid not null,
  email varchar(320) not null,
  verification_code char(160) not null,
  verification_code_attempts integer not null,
  created_at timestamp not null,
  constraint fk_user foreign key (user_id) references users (id) on delete cascade
);

create table if not exists pending_user_password_changes (
  id uuid primary key,
  user_id uuid not null,
  new_password char(160),
  created_at timestamp not null,
  constraint fk_user foreign key (user_id) references users (id) on delete cascade
);

create table if not exists pending_user_password_resets (
  id uuid primary key,
  user_id uuid not null,
  new_password char(160),
  verification_code char(160) not null,
  verification_code_attempts integer not null,
  created_at timestamp not null,
  constraint fk_user foreign key (user_id) references users (id) on delete cascade
);

create table if not exists pending_user_deletions (
  id uuid primary key,
  user_id uuid not null,
  created_at timestamp not null,
  constraint fk_user foreign key (user_id) references users (id) on delete cascade
);

create table if not exists user_sessions (
  id uuid primary key,
  pwd char(160) not null,
  user_id uuid not null,
  created_at timestamp not null,
  constraint fk_user foreign key (user_id) references users (id) on delete cascade
);

create table if not exists typing_tests_solo_random_timed (
  id uuid primary key,
  user_id uuid not null,
  words text,
  test_time_seconds integer not null,
  characters_typed_correctly integer not null,
  characters_typed_incorrectly integer not null,
  words_typed_correctly integer not null,
  words_typed_incorrectly integer not null,
  replay_data jsonb not null,
  created_at timestamp not null,
  constraint fk_user foreign key (user_id) references users (id) on delete cascade
);

create table if not exists typing_tests_solo_random_words (
  id uuid primary key,
  user_id uuid not null,
  words text,
  seconds_taken real not null,
  characters_typed_correctly integer not null,
  characters_typed_incorrectly integer not null,
  words_typed_correctly integer not null,
  words_typed_incorrectly integer not null,
  replay_data jsonb not null,
  created_at timestamp not null,
  constraint fk_user foreign key (user_id) references users (id) on delete cascade
);

create table if not exists typing_tests_solo_quote (
  id uuid primary key,
  user_id uuid not null,
  quote_id uuid not null,
  seconds_taken real not null,
  characters_typed_correctly integer not null,
  characters_typed_incorrectly integer not null,
  words_typed_correctly integer not null,
  words_typed_incorrectly integer not null,
  replay_data jsonb not null,
  created_at timestamp not null,
  constraint fk_user foreign key (user_id) references users (id) on delete cascade
);
