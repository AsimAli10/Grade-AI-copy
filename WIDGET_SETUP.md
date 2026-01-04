# Widget System Setup Guide

This guide explains how to set up and use the widget system for food bloggers and site owners.

## Overview

The widget system allows food bloggers and site owners to embed a customizable food scanning widget on their websites using an iframe. The system includes:

1. **Widget Embed Page** (`/widget/embed`) - The iframe-embeddable widget
2. **Widget Dashboard** (`/widget/dashboard`) - User panel for customization and management
3. **Widget Plans Page** (`/widget/plans`) - Subscription plans for widget users
4. **Widget Admin Panel** (`/widget/admin`) - Admin panel for tracking usage

## Database Setup

### Run the Migration

Execute the database migration to create the necessary tables:

```bash
# Apply the migration
supabase migration up
```

The migration creates:
- `widget_subscriptions` - User widget subscriptions
- `widget_settings` - Widget customization settings
- `widget_sites` - Tracked websites where widgets are embedded
- `widget_api_calls` - API usage tracking

## Stripe Setup

### Create Stripe Products and Prices

You need to create 6 Stripe products for the widget plans:

1. **Premium Plan 1 Monthly**: $4.99/month
2. **Premium Plan 1 Yearly**: $49.99/year
3. **Premium Plan 2 Monthly**: $9.99/month
4. **Premium Plan 2 Yearly**: $99.90/year
5. **Premium Plan 3 Monthly**: $14.99/month
6. **Premium Plan 3 Yearly**: $149.99/year

### Environment Variables

Add these environment variables to your `.env` file and Vercel:

```env
# Widget Stripe Price IDs
VITE_STRIPE_WIDGET_PLAN1_MONTHLY_PRICE_ID=price_xxxxx
VITE_STRIPE_WIDGET_PLAN1_YEARLY_PRICE_ID=price_xxxxx
VITE_STRIPE_WIDGET_PLAN2_MONTHLY_PRICE_ID=price_xxxxx
VITE_STRIPE_WIDGET_PLAN2_YEARLY_PRICE_ID=price_xxxxx
VITE_STRIPE_WIDGET_PLAN3_MONTHLY_PRICE_ID=price_xxxxx
VITE_STRIPE_WIDGET_PLAN3_YEARLY_PRICE_ID=price_xxxxx
```

### Update Edge Function

Update your `create-checkout-session` Edge Function to handle widget subscriptions. The function should check the plan type and update the `widget_subscriptions` table instead of (or in addition to) the `subscriptions` table.

## Widget Plans

### Free Plan
- Price: $0/month
- Features:
  - Branding included
  - 1 scan per day
  - 1 site
  - Basic Support

### Premium Plan 1
- Price: $4.99/month or $49.99/year
- Features:
  - Remove branding
  - Unlimited scans
  - 1 site
  - Premium Support

### Premium Plan 2
- Price: $9.99/month or $99.90/year
- Features:
  - Remove branding
  - Unlimited scans
  - Up to 3 sites
  - Premium Support

### Premium Plan 3
- Price: $14.99/month or $149.99/year
- Features:
  - Remove branding
  - Unlimited scans
  - Unlimited sites
  - Premium Support

## Usage Flow

### For Users (Food Bloggers/Site Owners)

1. **Sign Up**: Users sign up or log in to your platform
2. **Choose Plan**: Users navigate to `/widget/plans` and select a plan
3. **Customize Widget**: After subscribing, users go to `/widget/dashboard` to:
   - Customize colors, borders, text
   - Generate embed code
   - Add tracked sites
   - View analytics

4. **Embed Widget**: Users copy the iframe embed code and paste it on their websites

### For Admins

1. **Access Admin Panel**: Navigate to `/widget/admin` (admin-only access)
2. **Monitor Usage**: View:
   - Total users and subscriptions
   - API call statistics
   - User performance metrics
   - Top users by API consumption

## Widget Customization

Users can customize:
- **Primary Color**: Hex color code for buttons and accents
- **Border Radius**: CSS border-radius value (e.g., "8px", "12px")
- **Custom Text**: Optional heading text displayed above the widget
- **Branding Visibility**: Show/hide "Powered by WhatTheFood" footer (requires paid plan)

## API Usage Tracking

Every widget API call is tracked with:
- Widget ID
- User ID
- Site URL (where the widget is embedded)
- Call type (scan, preview, etc.)
- Status (success, error, rate_limited)
- Response time
- Timestamp

## Embedding the Widget

### Basic Embed Code

```html
<iframe 
  src="https://whatthefood.io/widget/embed?id=WIDGET_ID" 
  width="100%" 
  height="600" 
  frameborder="0" 
  style="border-radius: 8px;">
</iframe>
```

### Custom Styling

Users can customize the widget appearance through the dashboard, and the embed URL remains the same. The widget automatically applies the user's customization settings.

## Security Considerations

1. **Widget ID Validation**: The embed page validates widget IDs and only loads widgets for authenticated users
2. **API Rate Limiting**: Implement rate limiting based on subscription plans
3. **CORS Configuration**: Ensure proper CORS headers for iframe embedding
4. **RLS Policies**: Row Level Security policies protect user data in Supabase

## Admin Access

To grant admin access:
1. Add user IDs to the `ADMIN_USER_IDS` array in `WidgetAdmin.tsx`, OR
2. Implement a role-based system in your database
3. Check user email domains (e.g., `@whatthefood.io`)

## Webhook Handling

Update your Stripe webhook handler to:
1. Update `widget_subscriptions` table when widget plan subscriptions change
2. Handle subscription updates, cancellations, and renewals
3. Update subscription status and site limits based on plan changes

## Next Steps

1. ✅ Run database migration
2. ✅ Create Stripe products and prices
3. ✅ Add environment variables
4. ✅ Update Edge Function for widget subscriptions
5. ✅ Configure admin access
6. ✅ Test widget embedding
7. ✅ Set up webhook handling for widget subscriptions

## Troubleshooting

### Widget Not Loading
- Check if widget ID is valid
- Verify user subscription is active
- Check browser console for errors
- Ensure CORS headers are configured

### Embed Code Not Working
- Verify iframe URL is correct
- Check site URL is added to user's tracked sites
- Confirm site limit hasn't been exceeded

### API Calls Not Tracking
- Check `widget_api_calls` table permissions
- Verify API call tracking code is executing
- Check browser console for errors

### Admin Panel Access Denied
- Verify user ID is in admin list
- Check email domain for admin access
- Ensure user is authenticated

