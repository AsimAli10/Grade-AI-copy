# Verify Your Edge Function Endpoints

Your Supabase Edge Functions are deployed at:
- **Checkout**: `https://begjeguienmqpmrcokud.supabase.co/functions/v1/create-checkout-session`
- **Webhook**: `https://begjeguienmqpmrcokud.supabase.co/functions/v1/stripe-webhook`

## Quick Verification Steps

### 1. Test Checkout Endpoint (OPTIONS Request)

The endpoint should return **204** for OPTIONS requests:

```bash
curl -X OPTIONS \
  https://begjeguienmqpmrcokud.supabase.co/functions/v1/create-checkout-session \
  -H "Origin: http://localhost:8080" \
  -v
```

**Expected**: Status `204 No Content` with CORS headers

**If you get 500**: The function needs to be redeployed with the latest code.

### 2. Test Checkout Endpoint (POST Request)

This requires authentication, so test from your app:
1. Log in to your app
2. Try subscribing to a plan
3. Check browser console for errors

### 3. Verify Webhook Endpoint in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint (or create one)
3. Set endpoint URL: `https://begjeguienmqpmrcokud.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Webhook Signing Secret** (starts with `whsec_`)
6. Set it in your Edge Function secrets:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Required Secrets

Make sure these secrets are set in your Edge Functions:

### For `create-checkout-session`:
- `STRIPE_SECRET_KEY` - Your Stripe secret key (starts with `sk_`)
- `SUPABASE_URL` - Usually auto-set by Supabase
- `SUPABASE_ANON_KEY` - Usually auto-set by Supabase

### For `stripe-webhook`:
- `STRIPE_SECRET_KEY` - Your Stripe secret key (starts with `sk_`)
- `STRIPE_WEBHOOK_SECRET` - Your webhook signing secret (starts with `whsec_`)
- `SUPABASE_URL` - Usually auto-set by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (from Supabase Dashboard)

## Deploy Both Functions

After making code changes, redeploy both functions:

```bash
# Deploy checkout function
supabase functions deploy create-checkout-session

# Deploy webhook function
supabase functions deploy stripe-webhook
```

## Check Logs

If something isn't working, check the logs:

```bash
# Checkout function logs
supabase functions logs create-checkout-session

# Webhook function logs
supabase functions logs stripe-webhook
```

## Test Flow

1. ✅ User subscribes → `create-checkout-session` creates Stripe Checkout
2. ✅ User completes payment → Stripe redirects to success page
3. ✅ Stripe sends webhook → `stripe-webhook` updates database
4. ✅ User sees subscription active in dashboard

## Troubleshooting

### "500 Error on OPTIONS"
- Redeploy the function with the latest code (OPTIONS handler fixed)

### "Function not found"
- Deploy the function: `supabase functions deploy create-checkout-session`

### "Stripe secret key not configured"
- Set the secret: `supabase secrets set STRIPE_SECRET_KEY=sk_...`

### "Webhook signature verification failed"
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Make sure the endpoint URL in Stripe matches exactly

