-- Create user_profiles table for user-specific settings
CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "fair_name" "text" DEFAULT 'Myplant 2025',
    "sales_rep_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Add primary key
ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");

-- Add foreign key to auth.users
ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON "public"."user_profiles"
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON "public"."user_profiles"
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON "public"."user_profiles"
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" 
    BEFORE UPDATE ON "public"."user_profiles" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
