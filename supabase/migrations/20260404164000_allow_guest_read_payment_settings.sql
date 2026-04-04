-- Guest checkout needs read access to payment method availability.
-- This keeps writes restricted while allowing anon + authenticated clients to read.
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.payment_settings;

CREATE POLICY "Allow public read access to payment settings"
ON public.payment_settings
FOR SELECT
TO anon, authenticated
USING (true);
