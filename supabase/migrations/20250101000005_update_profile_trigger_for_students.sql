-- ============================================
-- Update Profile Trigger to Support Student Role
-- ============================================
-- This updates the trigger to check user_metadata for role
-- If role is 'student' in metadata, create profile with student role
-- Otherwise default to 'teacher'

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role public.user_role := 'teacher';
BEGIN
  -- Check if user_metadata has role set to 'student'
  IF NEW.raw_user_meta_data->>'role' = 'student' THEN
    user_role := 'student';
  END IF;
  
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    user_role
  )
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

