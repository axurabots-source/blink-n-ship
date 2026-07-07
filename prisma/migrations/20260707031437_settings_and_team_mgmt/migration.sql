-- Add new columns to profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "owner_name" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "website" TEXT;

-- Create team_members table
CREATE TABLE IF NOT EXISTS "team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "supabase_id" TEXT UNIQUE,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "status" TEXT NOT NULL DEFAULT 'invited',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "team_members_owner_id_idx" ON "team_members"("owner_id");
CREATE INDEX IF NOT EXISTS "team_members_email_idx" ON "team_members"("email");

-- Create team_member_permissions table
CREATE TABLE IF NOT EXISTS "team_member_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "module" TEXT NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT false,
    "can_view_financial" BOOLEAN NOT NULL DEFAULT false,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_read" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "team_member_permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "team_member_permissions_member_id_module_key" UNIQUE ("member_id", "module")
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL UNIQUE,
    "order_booked" BOOLEAN NOT NULL DEFAULT true,
    "order_delivered" BOOLEAN NOT NULL DEFAULT true,
    "order_returned" BOOLEAN NOT NULL DEFAULT true,
    "booking_failed" BOOLEAN NOT NULL DEFAULT true,
    "low_stock" BOOLEAN NOT NULL DEFAULT true,
    "employee_login" BOOLEAN NOT NULL DEFAULT true,
    "permission_change" BOOLEAN NOT NULL DEFAULT true,
    "daily_summary" BOOLEAN NOT NULL DEFAULT false,
    "weekly_summary" BOOLEAN NOT NULL DEFAULT false,
    "monthly_summary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "browser_info" TEXT,
    "os" TEXT,
    "device" TEXT,
    "ip_address" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_last_active_at_idx" ON "user_sessions"("user_id", "last_active_at");

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_email" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "activity_logs_owner_id_idx" ON "activity_logs"("owner_id");
CREATE INDEX IF NOT EXISTS "activity_logs_owner_id_module_idx" ON "activity_logs"("owner_id", "module");
CREATE INDEX IF NOT EXISTS "activity_logs_owner_id_created_at_idx" ON "activity_logs"("owner_id", "created_at");

-- Add foreign keys
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_member_permissions" ADD CONSTRAINT "team_member_permissions_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
