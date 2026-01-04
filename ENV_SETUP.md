# Environment Variables Setup

## Application URL Configuration

To ensure all URLs in your application use the correct domain (especially important for OAuth redirects and Stripe checkout), you need to set the `VITE_APP_URL` environment variable.

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `VITE_APP_URL`
   - **Value**: `https://what-the-food-theta.vercel.app`
   - **Environment**: Production, Preview, Development (or select as needed)
4. Click **Save**
5. **Redeploy** your application for the changes to take effect

### For Local Development

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add the following line:
   ```
   VITE_APP_URL=http://localhost:8080
   ```
   Or leave it empty to automatically use `window.location.origin`

### How It Works

The application uses a utility function (`getUrl()`) that:
- **In production**: Uses `VITE_APP_URL` from environment variables
- **In development**: Falls back to `window.location.origin` if `VITE_APP_URL` is not set

### Where It's Used

The `VITE_APP_URL` is used for:
- OAuth redirects (Google sign-in callback)
- Stripe checkout success/cancel URLs
- Any other absolute URL references in the application

### Files Updated

- ✅ `src/utils/url.ts` - New utility functions for URL handling
- ✅ `src/utils/stripe.ts` - Updated to use `getUrl()` instead of `window.location.origin`
- ✅ `src/pages/Auth.tsx` - Updated OAuth redirect to use `getUrl()`
- ✅ `src/vite-env.d.ts` - Added TypeScript type definitions

### Example `.env` File

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID=your_premium_monthly_price_id
VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID=your_premium_yearly_price_id

# Application URL (for production deployments)
VITE_APP_URL=https://what-the-food-theta.vercel.app
```

**Note**: Never commit `.env` files to version control. The `.env.example` file is provided as a template.

