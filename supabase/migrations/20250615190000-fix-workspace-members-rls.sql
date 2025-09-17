
-- This migration fixes the Row Level Security (RLS) policies for the workspace_members table.
-- The previous policies incorrectly prevented admins/managers from adding new users to a workspace.
-- This script consolidates and corrects the policies for SELECT, INSERT, UPDATE, and DELETE.

-- 1. Create a function to check if the user is an admin or manager of a workspace.
-- Using SECURITY DEFINER allows it to bypass RLS policies of the calling user, preventing recursion.
CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_manager(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user has an 'admin' or 'manager' role in the specified workspace.
  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id = p_workspace_id
      AND wm.role IN ('admin', 'manager')
  );
END;
$$;

-- 2. Create a function to get all workspaces a user is a member of.
-- This helps avoid recursive RLS checks on the workspace_members table itself.
CREATE OR REPLACE FUNCTION public.get_my_workspaces()
RETURNS TABLE(id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id
  FROM public.workspace_members
  WHERE user_id = auth.uid();
$$;

-- 3. Clean up ALL existing policies on workspace_members to start fresh.
-- This is important to avoid conflicts from previous migration attempts.
DROP POLICY IF EXISTS "Users can view workspace members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert themselves as workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can insert workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can delete workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_user_view" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_owner_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "member_own_access" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_view_same_workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_manage_own" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_own" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_own" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_view_members" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can delete members" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view other members in the same workspace" ON public.workspace_members;

-- 4. Create new, correct policies for workspace_members table.

-- SELECT: A user can see all members of any workspace they belong to.
CREATE POLICY "Members can view other members in the same workspace"
ON public.workspace_members
FOR SELECT
USING (
  workspace_id IN (SELECT id FROM public.get_my_workspaces())
);

-- INSERT: A user can add a new member to a workspace if they are an admin or manager of that workspace.
CREATE POLICY "Admins and managers can add members"
ON public.workspace_members
FOR INSERT
WITH CHECK (
  public.is_workspace_admin_or_manager(workspace_id)
);

-- UPDATE: A user can update a member's details (like their role) if they are an admin or manager.
CREATE POLICY "Admins and managers can update members"
ON public.workspace_members
FOR UPDATE
USING (
  public.is_workspace_admin_or_manager(workspace_id)
)
WITH CHECK (
  public.is_workspace_admin_or_manager(workspace_id)
);

-- DELETE: A user can remove a member from a workspace if they are an admin or manager.
CREATE POLICY "Admins and managers can delete members"
ON public.workspace_members
FOR DELETE
USING (
  public.is_workspace_admin_or_manager(workspace_id)
);
