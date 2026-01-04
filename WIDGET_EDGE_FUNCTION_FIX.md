# Widget Subscription Edge Function Fix

## Problem
When choosing a widget plan, the Edge Function was returning a 500 error because it wasn't handling widget subscriptions correctly.

## Solution
Updated both Edge Functions to support widget subscriptions:

### 1. `create-checkout-session/index.ts`
- Added support for `subscriptionType` parameter ('widget' or 'main')
- Checks the appropriate subscription table (`widget_subscriptions` or `subscriptions`)
- Stores customer ID in the correct table
- Includes `subscriptionType` in Stripe session metadata

### 2. `stripe-webhook/index.ts`
- Handles widget subscription webhooks
- Determines subscription type from metadata
- Maps price IDs to widget plan types (plan1, plan2, plan3)
- Updates the correct subscription table
- Sets appropriate site limits based on plan

## Price ID Mapping

The webhook currently maps widget plans based on price ID patterns:
- `plan1` or `widget-plan1` → Plan 1 (1 site)
- `plan2` or `widget-plan2` → Plan 2 (3 sites)
- `plan3` or `widget-plan3` → Plan 3 (unlimited sites)

**Note**: For better reliability, consider:
1. Adding price ID to plan mapping in environment variables
2. Storing mapping in database
3. Using explicit price ID matching instead of string inclusion

## Next Steps

1. **Redeploy Edge Functions**:
   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy stripe-webhook
   ```

2. **Verify Price ID Mapping**: Update the webhook handler to use explicit price ID matching once you have your Stripe price IDs

3. **Test Widget Subscription Flow**:
   - Select a widget plan
   - Complete checkout
   - Verify subscription is created in `widget_subscriptions` table
   - Verify site limits are set correctly

4. **Test Webhook**: Ensure webhook events update widget subscriptions correctly

## Environment Variables Needed

For the webhook to correctly map price IDs to plans, consider adding:

```env
STRIPE_WIDGET_PLAN1_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_WIDGET_PLAN1_YEARLY_PRICE_ID=price_xxxxx
STRIPE_WIDGET_PLAN2_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_WIDGET_PLAN2_YEARLY_PRICE_ID=price_xxxxx
STRIPE_WIDGET_PLAN3_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_WIDGET_PLAN3_YEARLY_PRICE_ID=price_xxxxx
```

Then update the webhook to use these for explicit matching instead of string inclusion.

