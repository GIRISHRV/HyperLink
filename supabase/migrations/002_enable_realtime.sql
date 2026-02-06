-- Enable Realtime for transfers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;

-- Create a function to notify on transfer status changes
CREATE OR REPLACE FUNCTION public.notify_transfer_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify subscribed clients about transfer changes
  PERFORM pg_notify(
    'transfer_update',
    json_build_object(
      'id', NEW.id,
      'status', NEW.status,
      'completed_at', NEW.completed_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transfer updates
DROP TRIGGER IF EXISTS transfer_update_trigger ON public.transfers;
CREATE TRIGGER transfer_update_trigger
  AFTER UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_transfer_update();
