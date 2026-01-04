# Deploy Supabase Edge Functions for Stripe

This guide will help you deploy the Supabase Edge Functions needed for Stripe checkout.

## Prerequisites

1. **Supabase CLI installed**: [Install Supabase CLI](https://supabase.com/docs/guides/cli)
2. **Stripe Account**: With API keys and webhook secret
3. **Supabase Project**: Your project should be set up

## Step 1: Install Supabase CLI (if not already installed)

```bash
# macOS
brew install supabase/tap/supabase

# Windows (using Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or using npm
npm install -g supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

## Step 3: Link Your Project

```bash
supabase link --project-ref your-project-ref
```

You can find your project ref in your Supabase dashboard URL: `https://app.supabase.com/project/your-project-ref`

## Step 4: Set Up Environment Secrets

Set the required secrets for your Edge Functions:

```bash
# Set Stripe Secret Key
supabase secrets set STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key

# Set Stripe Webhook Secret (get this from Stripe Dashboard > Webhooks)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Set Supabase Service Role Key (for webhook handler)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Note**: The `SUPABASE_URL` and `SUPABASE_ANON_KEY` are automatically available in Edge Functions, but you may need to set them manually:

```bash
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

## Step 5: Deploy Edge Functions

```bash
# Deploy checkout session function
supabase functions deploy create-checkout-session

# Deploy webhook handler
supabase functions deploy stripe-webhook
```

## Step 6: Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://your-project-ref.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Update the secret in Supabase:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Step 7: Test the Integration

1. Try subscribing to a premium plan
2. Use Stripe test card: `4242 4242 4242 4242`
3. Check the subscription status in your database
4. Verify webhook events in Stripe Dashboard

## Troubleshooting

### Function not found error
- Make sure you've deployed the functions: `supabase functions deploy create-checkout-session`
- Verify the function exists: `supabase functions list`

### Authentication errors
- Check that the user is logged in
- Verify the Authorization header is being sent correctly

### Stripe errors
- Verify your Stripe secret key is correct
- Check Stripe Dashboard for API errors
- Ensure webhook secret matches in both Stripe and Supabase

### Database update errors
- Verify RLS policies allow updates to subscriptions table
- Check that service role key has proper permissions

## Viewing Logs

```bash
# View logs for checkout function
supabase functions logs create-checkout-session

# View logs for webhook function
supabase functions logs stripe-webhook
```

## Alternative: Manual Deployment via Supabase Dashboard

If you prefer using the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions**
3. Click **Create a new function**
4. Copy the code from `supabase/functions/create-checkout-session/index.ts`
5. Name it `create-checkout-session`
6. Set the secrets in the function settings
7. Repeat for `stripe-webhook` function

## Environment Variables Summary

Make sure these are set:
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `SUPABASE_URL`: Your Supabase project URL (usually auto-set)
- `SUPABASE_ANON_KEY`: Your Supabase anon key (usually auto-set)

