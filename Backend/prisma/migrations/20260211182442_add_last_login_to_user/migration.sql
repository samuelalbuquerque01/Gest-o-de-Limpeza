-- migration.sql
-- ✅ Adicionar campo lastLogin na tabela User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP;