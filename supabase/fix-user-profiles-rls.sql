-- Fix RLS policies for user_profiles table
-- This allows proper user creation during signup

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."user_profiles";
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."user_profiles";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."user_profiles";

-- Create new policies that work properly
CREATE POLICY "Users can view own profile" ON "public"."user_profiles"
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON "public"."user_profiles"
    FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile
-- This works because the profile ID matches the authenticated user's ID
CREATE POLICY "Users can insert own profile" ON "public"."user_profiles"
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";

-- Ensure the table is accessible
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."user_profiles" TO "authenticated";
