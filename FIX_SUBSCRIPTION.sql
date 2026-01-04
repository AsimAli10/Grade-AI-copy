-- Diagnostic and Fix Query for Subscription Sync
-- Replace email with your email or user_id

-- Step 1: Check if subscription exists in platform_subscriptions
SELECT 
  ps.id as subscription_id,
  ps.user_id,
  ps.subscription_type,
  ps.platform_plan_id,
  ps.is_active,
  ps.stripe_subscription_id,
  ps.stripe_price_id,
  ps.billing_cycle,
  p.id as profile_id,
  p.email,
  p.platform_subscription_id,
  p.platform_subscription_type,
  p.platform_subscription_plan_id,
  CASE 
    WHEN ps.id IS NULL THEN 'NO SUBSCRIPTION FOUND'
    WHEN p.platform_subscription_id IS DISTINCT FROM ps.id THEN 'OUT OF SYNC: subscription_id'
    WHEN p.platform_subscription_type IS DISTINCT FROM ps.subscription_type THEN 'OUT OF SYNC: subscription_type'
    WHEN p.platform_subscription_plan_id IS DISTINCT FROM ps.platform_plan_id THEN 'OUT OF SYNC: plan_id'
    ELSE 'IN SYNC'
  END as sync_status
FROM profiles p
LEFT JOIN platform_subscriptions ps ON ps.user_id = p.id AND ps.is_active = TRUE
WHERE p.email = 'aghashahhyder@gmail.com';

-- Step 2: Manual fix - Update profile from platform_subscriptions
UPDATE profiles p
SET 
  platform_subscription_id = ps.id,
  platform_subscription_type = ps.subscription_type,
  platform_subscription_plan_id = ps.platform_plan_id,
  updated_at = NOW()
FROM platform_subscriptions ps
WHERE p.id = ps.user_id
  AND ps.is_active = TRUE
  AND p.email = 'aghashahhyder@gmail.com'
  AND (
    p.platform_subscription_id IS DISTINCT FROM ps.id
    OR p.platform_subscription_type IS DISTINCT FROM ps.subscription_type
    OR p.platform_subscription_plan_id IS DISTINCT FROM ps.platform_plan_id
  )
RETURNING p.*, ps.id as subscription_id, ps.subscription_type, ps.platform_plan_id;

-- Step 3: Verify all active subscriptions are synced
SELECT 
  ps.user_id,
  p.email,
  ps.id as subscription_id,
  ps.subscription_type,
  ps.platform_plan_id,
  ps.is_active,
  p.platform_subscription_id,
  p.platform_subscription_type,
  p.platform_subscription_plan_id,
  CASE 
    WHEN p.platform_subscription_id IS DISTINCT FROM ps.id THEN 'OUT OF SYNC'
    WHEN p.platform_subscription_type IS DISTINCT FROM ps.subscription_type THEN 'OUT OF SYNC'
    WHEN p.platform_subscription_plan_id IS DISTINCT FROM ps.platform_plan_id THEN 'OUT OF SYNC'
    ELSE 'IN SYNC'
  END as sync_status
FROM platform_subscriptions ps
LEFT JOIN profiles p ON p.id = ps.user_id
WHERE ps.is_active = TRUE
ORDER BY ps.created_at DESC
LIMIT 10;

