-- Backfill ssoEmail for existing users: <lowercase name>@vng.com.vn
-- Skip ADMIN role (default 'PM'/'admin' user) — they may keep custom ssoEmail.
UPDATE "User"
SET "ssoEmail" = LOWER(REPLACE("name", ' ', '')) || '@vng.com.vn'
WHERE "ssoEmail" IS NULL OR "ssoEmail" = '';
