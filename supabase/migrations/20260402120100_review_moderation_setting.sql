INSERT INTO public.site_settings (key, value)
VALUES ('review_moderation_required', 'true')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "public read storefront branding settings" ON public.site_settings;
CREATE POLICY "public read storefront branding settings"
ON public.site_settings FOR SELECT
USING (
  key = ANY (
    ARRAY[
      'site_name',
      'site_tagline',
      'support_email',
      'support_phone',
      'whatsapp_number',
      'site_theme_preset',
      'review_moderation_required'
    ]
  )
);

DROP POLICY IF EXISTS "Authenticated customers can insert own product reviews" ON public.product_reviews;
CREATE POLICY "Authenticated customers can insert own product reviews"
ON public.product_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id = auth.uid()
  AND (
    (
      status = 'pending'
      AND COALESCE(
        (
          SELECT lower(value) IN ('true', '1', 'yes', 'on')
          FROM public.site_settings
          WHERE key = 'review_moderation_required'
          LIMIT 1
        ),
        true
      )
    )
    OR (
      status = 'approved'
      AND NOT COALESCE(
        (
          SELECT lower(value) IN ('true', '1', 'yes', 'on')
          FROM public.site_settings
          WHERE key = 'review_moderation_required'
          LIMIT 1
        ),
        true
      )
    )
  )
);
