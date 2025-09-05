-- Remove fair_name column from user_profiles table
-- This field is not needed as fair name should be configured at the system level, not per user

-- Drop the column
ALTER TABLE "public"."user_profiles" DROP COLUMN IF EXISTS "fair_name";

-- Update the trigger function to not include fair_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, sales_rep_name, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'full_name',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to the updated function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
