DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'review_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL CHECK (char_length(trim(body)) >= 12),
  status public.review_status NOT NULL DEFAULT 'pending',
  author_display_name TEXT NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT product_reviews_product_customer_key UNIQUE (product_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status_created_at
  ON public.product_reviews (product_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_reviews_customer_id
  ON public.product_reviews (customer_id);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Approved product reviews are publicly readable" ON public.product_reviews;
CREATE POLICY "Approved product reviews are publicly readable"
ON public.product_reviews
FOR SELECT
USING (
  status = 'approved'
  OR customer_id = auth.uid()
  OR public.current_user_is_admin()
);

DROP POLICY IF EXISTS "Authenticated customers can insert own product reviews" ON public.product_reviews;
CREATE POLICY "Authenticated customers can insert own product reviews"
ON public.product_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id = auth.uid()
  AND status = 'pending'
);

DROP POLICY IF EXISTS "Admins can update product reviews" ON public.product_reviews;
CREATE POLICY "Admins can update product reviews"
ON public.product_reviews
FOR UPDATE
TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());
