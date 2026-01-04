# Quick Fix: Checkout "Failed to send request" Error

The error "Failed to send a request to the Edge Function" means the Supabase Edge Function `create-checkout-session` is **not deployed** yet.

## Immediate Solution

You need to deploy the Edge Function. Here are two quick ways:

### Option 1: Deploy via Supabase CLI (Recommended)

```bash
# 1. Install Supabase CLI (if not installed)
# macOS: brew install supabase/tap/supabase
# Or: npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link your project
supabase link --project-ref your-project-ref
# Find your project ref in: https://app.supabase.com/project/YOUR_PROJECT_REF

# 4. Set secrets (required!)
supabase secrets set STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... # From Stripe Dashboard > Webhooks
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # From Supabase Dashboard > Settings > API

# 5. Deploy the function
supabase functions deploy create-checkout-session
```

### Option 2: Deploy via Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Edge Functions** (left sidebar)
4. Click **Create a new function**
5. Name it: `create-checkout-session`
6. Copy the code from `supabase/functions/create-checkout-session/index.ts`
7. Paste it into the editor
8. Go to **Settings** tab and set these secrets:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key (starts with `sk_`)
   - `STRIPE_WEBHOOK_SECRET`: Your webhook signing secret (starts with `whsec_`)
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
9. Click **Deploy**

## Verify Deployment

After deploying, verify it works:

1. Try subscribing to a plan again
2. Check the browser console for more detailed errors
3. Check Edge Function logs: `supabase functions logs create-checkout-session`

## Common Issues

### Issue: "Function not found" or "404"
**Solution**: The function isn't deployed. Follow deployment steps above.

### Issue: "Stripe secret key not configured"
**Solution**: Set the `STRIPE_SECRET_KEY` secret in Edge Function settings.

### Issue: "Unauthorized"
**Solution**: Make sure you're logged in. Check browser console for auth errors.

### Issue: Network errors
**Solution**: 
- Check your internet connection
- Verify your Supabase URL is correct
- Check if Edge Functions are enabled in your Supabase project

## Testing

After deployment, test with:
- Stripe test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC

## Need Help?

1. Check the browser console for detailed error messages
2. Check Edge Function logs for server-side errors
3. Verify all secrets are set correctly
4. Make sure your Supabase project has Edge Functions enabled

