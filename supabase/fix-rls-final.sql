-- Final fix for user_profiles RLS policies
-- This allows proper user creation during signup

-- First, disable RLS temporarily to fix the policies
ALTER TABLE "public"."user_profiles" DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."user_profiles";
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."user_profiles";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."user_profiles";

-- Re-enable RLS
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to insert their own profile
-- This works because the profile ID matches the authenticated user's ID
CREATE POLICY "Users can insert own profile" ON "public"."user_profiles"
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create a policy that allows users to view their own profile
CREATE POLICY "Users can view own profile" ON "public"."user_profiles"
    FOR SELECT USING (auth.uid() = id);

-- Create a policy that allows users to update their own profile
CREATE POLICY "Users can update own profile" ON "public"."user_profiles"
    FOR UPDATE USING (auth.uid() = id);

-- Grant necessary permissions
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";

-- Ensure the table is accessible
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."user_profiles" TO "authenticated";
