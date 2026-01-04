# Quick Redeploy Instructions

The Edge Function code has been fixed. The OPTIONS handler now runs before imports, which should fix the 500 error.

## Redeploy the Function

### Option 1: Via Supabase CLI

```bash
cd /Users/aghahaider/Documents/Fiverr/Project/What-the-food
supabase functions deploy create-checkout-session
```

### Option 2: Via Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Edge Functions** → `create-checkout-session`
4. Click **Deploy** (or update the code if already deployed)

## Verify Deployment

After redeploying, the OPTIONS request should return **204** instead of **500**.

Test by trying to subscribe to a plan again.

## If Still Getting 500 Error

Check the Edge Function logs:
```bash
supabase functions logs create-checkout-session
```

Look for any import errors or startup failures.

