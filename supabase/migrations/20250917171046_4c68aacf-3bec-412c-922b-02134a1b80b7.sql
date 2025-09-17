-- Secure RPC to share a note with all members in a room
-- This bypasses RLS safely using SECURITY DEFINER and validates membership

CREATE OR REPLACE FUNCTION public.share_note_to_room(p_room_id uuid, p_note_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  -- Ensure caller is a member of the room
  IF NOT public.is_member_of_room(p_room_id) THEN
    RAISE EXCEPTION 'not a member of room';
  END IF;

  -- Insert copies for each member except the sender, based on the original note
  INSERT INTO public.notes (
    user_id,
    original_content,
    title,
    processing_status,
    key_points,
    summary,
    generated_qa,
    generated_flashcards,
    is_shared_note,
    shared_from_user_id,
    shared_from_room_id,
    original_note_id
  )
  SELECT
    rm.user_id,
    n.original_content,
    n.title,
    n.processing_status,
    n.key_points,
    n.summary,
    n.generated_qa,
    n.generated_flashcards,
    true,
    auth.uid(),
    p_room_id,
    p_note_id
  FROM public.room_members rm
  JOIN public.notes n ON n.id = p_note_id AND n.user_id = auth.uid()
  WHERE rm.room_id = p_room_id
    AND rm.user_id <> auth.uid();

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Record the sharing event (for activity stream)
  INSERT INTO public.room_shared_notes (room_id, note_id, shared_by_user_id)
  VALUES (p_room_id, p_note_id, auth.uid());

  RETURN inserted_count;
END;
$$;

-- Ensure authenticated users can call the function
GRANT EXECUTE ON FUNCTION public.share_note_to_room(uuid, uuid) TO authenticated;