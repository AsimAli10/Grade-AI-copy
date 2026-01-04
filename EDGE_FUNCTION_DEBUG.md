# Edge Function Debugging Guide

## Recent Changes

### 1. Enhanced URL Validation (Edge Function)
- Added fallback logic for `baseUrl` construction
- Validates URLs before sending to Stripe
- Better error messages for invalid URLs
- Added production URL fallback

### 2. Enhanced Error Handling (Frontend)
- Improved error extraction from Supabase Edge Function responses
- Checks multiple possible locations for error messages
- Better logging to help debug issues

## Next Steps

### 1. Redeploy Edge Function
You must redeploy the Edge Function for the URL validation changes to take effect:

```bash
supabase functions deploy create-checkout-session
```

Or deploy via Supabase Dashboard:
1. Go to Edge Functions in your Supabase dashboard
2. Find `create-checkout-session`
3. Click "Deploy" or update the code directly in the dashboard

### 2. Check Edge Function Logs
After redeploying, try the checkout again and check the logs:

1. Go to Supabase Dashboard → Edge Functions → `create-checkout-session`
2. Click on "Logs" tab
3. Look for:
   - "Constructed baseUrl: ..."
   - "Creating checkout session with URLs: ..."
   - Any error messages

### 3. Common Issues and Solutions

#### Issue: "Not a valid URL"
**Solution**: The Edge Function now constructs URLs automatically. Make sure:
- `SUPABASE_URL` environment variable is set in Supabase Edge Function secrets
- The function is redeployed with the latest code

#### Issue: "Table not found: widget_subscriptions"
**Solution**: Run the migration:
```sql
-- Run this in Supabase SQL Editor
\i supabase/migrations/20250130000000_widget_tracking.sql
```

Or ensure the migration has been applied:
1. Go to Supabase Dashboard → Database → Migrations
2. Check if `20250130000000_widget_tracking.sql` is listed
3. If not, apply it manually in the SQL Editor

#### Issue: "500 Internal Server Error"
**Solution**: 
1. Check Edge Function logs for the actual error
2. Verify all environment variables are set:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Make sure the Edge Function is deployed

### 4. Testing
1. Open browser console (F12)
2. Try selecting a widget plan
3. Check the console for detailed error logs
4. Check Edge Function logs in Supabase dashboard

### 5. Environment Variables Checklist

#### Frontend (.env file):
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_WIDGET_PLAN1_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_WIDGET_PLAN1_YEARLY_PRICE_ID=price_...
VITE_STRIPE_WIDGET_PLAN2_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_WIDGET_PLAN2_YEARLY_PRICE_ID=price_...
VITE_STRIPE_WIDGET_PLAN3_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_WIDGET_PLAN3_YEARLY_PRICE_ID=price_...
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_APP_URL=https://what-the-food-theta.vercel.app
```

#### Supabase Edge Function Secrets:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Debug Information

The frontend now logs detailed error information:
- Error object structure
- Error keys
- Error context
- Parsed error messages

Check the browser console for these logs when an error occurs.

