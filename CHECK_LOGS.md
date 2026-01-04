# How to Check Edge Function Logs

The function is returning 500 error. You need to check the logs to see what's actually failing.

## Option 1: Check Logs via Supabase Dashboard (Easiest)

1. Go to https://app.supabase.com
2. Select your project (`begjeguienmqpmrcokud`)
3. Go to **Edge Functions** (left sidebar)
4. Click on `create-checkout-session`
5. Click on **Logs** tab
6. Look for the most recent error - this will show you what's actually failing

The error message will tell you:
- If it's an import error
- If it's a syntax error
- If it's a runtime error
- What line is causing the problem

## Option 2: Check Logs via Supabase CLI

If you have Supabase CLI installed:

```bash
supabase functions logs create-checkout-session
```

Or with more details:

```bash
supabase functions logs create-checkout-session --follow
```

## Common Errors You Might See

### "SyntaxError" or "Unexpected token"
- **Fix**: Check the code for syntax errors
- **Solution**: Make sure the file is properly saved and deployed

### "Cannot find module" or "Import error"
- **Fix**: The import URL might be incorrect
- **Solution**: Verify the import URLs are correct

### "Deno is not defined"
- **Fix**: Already fixed with `@ts-nocheck`, but might need redeployment
- **Solution**: Redeploy the function

### "Function exited due to an error"
- **Fix**: Check the actual error message in logs
- **Solution**: Look at the detailed error in the logs

## What to Do After Checking Logs

1. **Copy the exact error message** from the logs
2. **Redeploy the function** with the latest code
3. **Test again** with the OPTIONS request

## Quick Redeploy

After fixing any issues found in logs:

**Via Dashboard:**
1. Edge Functions → `create-checkout-session`
2. Click **Deploy** or update the code

**Via CLI:**
```bash
supabase functions deploy create-checkout-session
```

