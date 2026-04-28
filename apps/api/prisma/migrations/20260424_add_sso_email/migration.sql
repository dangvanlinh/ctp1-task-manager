-- Add ssoEmail column to User for SSO-based login (Keycloak / OAuth2 Proxy)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ssoEmail" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_ssoEmail_key" ON "User"("ssoEmail");
