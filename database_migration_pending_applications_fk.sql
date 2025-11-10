-- Add foreign key constraint to pending_applications.auth_user_id
-- This links pending_applications to the users table

-- First, ensure the foreign key constraint doesn't already exist
do $$ 
begin
  -- Check if the foreign key constraint already exists
  if not exists (
    select 1 
    from information_schema.table_constraints 
    where constraint_schema = 'public' 
      and table_name = 'pending_applications' 
      and constraint_name = 'pending_applications_auth_user_id_fkey'
  ) then
    -- Add the foreign key constraint
    -- Using on delete set null because if a user is deleted, 
    -- we might want to keep the pending application record for audit purposes
    alter table public.pending_applications
      add constraint pending_applications_auth_user_id_fkey
      foreign key (auth_user_id) 
      references public.users(id) 
      on delete set null;
    
    raise notice 'Foreign key constraint added to pending_applications.auth_user_id';
  else
    raise notice 'Foreign key constraint already exists on pending_applications.auth_user_id';
  end if;
end $$;

-- Add index for better query performance
create index if not exists idx_pending_applications_auth_user_id 
  on public.pending_applications(auth_user_id);

-- Add index on email for faster lookups during approval process
create index if not exists idx_pending_applications_email 
  on public.pending_applications(email);

