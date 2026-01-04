# Environment Variables Fix for Widget Plans

## Issue
The error "Price ID not configured for this plan" occurs because your environment variables are missing the `VITE_` prefix.

## Solution

In Vite, **all environment variables that need to be accessible in the frontend must be prefixed with `VITE_`**.

### Current (Incorrect)
```env
STRIPE_WIDGET_PLAN1_MONTHLY_PRICE_ID=price_1SP2rkPO1jMh2jA474zm1A8Y
STRIPE_WIDGET_PLAN1_YEARLY_PRICE_ID=price_1SP2rkPO1jMh2jA4X19OJrPc
```

### Correct Format
```env
VITE_STRIPE_WIDGET_PLAN1_MONTHLY_PRICE_ID=price_1SP2rkPO1jMh2jA474zm1A8Y
VITE_STRIPE_WIDGET_PLAN1_YEARLY_PRICE_ID=price_1SP2rkPO1jMh2jA4X19OJrPc
```

## Complete Environment Variables for Widget Plans

Add these to your `.env` file with the `VITE_` prefix:

```env
# Widget Plan 1 (Premium Plan 1)
VITE_STRIPE_WIDGET_PLAN1_MONTHLY_PRICE_ID=price_1SP2rkPO1jMh2jA474zm1A8Y
VITE_STRIPE_WIDGET_PLAN1_YEARLY_PRICE_ID=price_1SP2rkPO1jMh2jA4X19OJrPc

# Widget Plan 2 (Premium Plan 2)
VITE_STRIPE_WIDGET_PLAN2_MONTHLY_PRICE_ID=price_1SP2sXPO1jMh2jA4iEY0oNfV
VITE_STRIPE_WIDGET_PLAN2_YEARLY_PRICE_ID=price_1SP2stPO1jMh2jA4T5x3M8xi

# Widget Plan 3 (Premium Plan 3)
VITE_STRIPE_WIDGET_PLAN3_MONTHLY_PRICE_ID=price_1SP2tdPO1jMh2jA4q9uuyvwE
VITE_STRIPE_WIDGET_PLAN3_YEARLY_PRICE_ID=price_1SP2u2PO1jMh2jA4pbnlPnuR
```

## After Updating

1. **Restart your development server** (Vite needs to be restarted to pick up new environment variables):
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

2. **For production/Vercel**, add these environment variables in your Vercel dashboard:
   - Go to Settings → Environment Variables
   - Add each variable with the `VITE_` prefix
   - Redeploy your application

## Note for Backend/Edge Functions

For **Edge Functions** (Supabase functions), you don't need the `VITE_` prefix. Those variables are:
- `STRIPE_WIDGET_PLAN1_MONTHLY_PRICE_ID` (no VITE_ prefix)
- etc.

These are set in Supabase Edge Function environment settings, not in your `.env` file.

## Quick Checklist

- [ ] Update `.env` file with `VITE_` prefix
- [ ] Restart development server
- [ ] Test widget plan selection
- [ ] Add variables to Vercel (with `VITE_` prefix) for production
- [ ] Redeploy application

