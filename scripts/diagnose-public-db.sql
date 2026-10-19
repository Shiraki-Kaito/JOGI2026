-- メタデータだけを読む。--file ではなく、内容を --command に渡す。
-- missing は対象が存在しないことを明示する。利用者の行は一切取得しない。
WITH required(name) AS (VALUES
 ('profiles'),('runs'),('game_users'),('game_sessions'),('game_auth_limits'),
 ('game_legacy_claims'),('game_users_login_unique'),('d1_migrations'),
 ('__drizzle_migrations')
)
SELECT r.name AS expected_name, COALESCE(s.type,'missing') AS object_type,
 s.tbl_name AS table_name, s.sql AS definition
FROM required r LEFT JOIN sqlite_master s ON s.name=r.name
ORDER BY r.name;

SELECT 'game_auth_limits columns' AS section;
PRAGMA table_info('game_auth_limits');
SELECT 'game_users columns' AS section;
PRAGMA table_info('game_users');
SELECT 'profiles columns' AS section;
PRAGMA table_info('profiles');
SELECT 'game_sessions columns' AS section;
PRAGMA table_info('game_sessions');
SELECT 'runs columns' AS section;
PRAGMA table_info('runs');
SELECT 'game_legacy_claims columns' AS section;
PRAGMA table_info('game_legacy_claims');

SELECT 'game_users indexes' AS section;
PRAGMA index_list('game_users');
SELECT 'login unique index columns' AS section;
PRAGMA index_info('game_users_login_unique');
SELECT 'game_auth_limits indexes' AS section;
PRAGMA index_list('game_auth_limits');
SELECT 'profiles indexes' AS section;
PRAGMA index_list('profiles');
SELECT 'game_sessions indexes and foreign keys' AS section;
PRAGMA index_list('game_sessions');
PRAGMA foreign_key_list('game_sessions');
