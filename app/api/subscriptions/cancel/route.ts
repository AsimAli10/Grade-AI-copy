import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { subscriptionType, userId } = await request.json();

    if (!userId || !subscriptionType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine which table to update
    const tableName = subscriptionType === "platform" ? "platform_subscriptions" : "widget_subscriptions";

    // Get current subscription
    const { data: subscription, error: fetchError } = await supabase
      .from(tableName)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching subscription:", fetchError);
      return NextResponse.json(
        { error: `Database error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!subscription) {
      // If subscription doesn't exist, create a free one
      console.log(`Subscription not found for user ${userId}, creating free subscription`);
      
      const insertData: any = {
        user_id: userId,
        subscription_type: "free",
        is_active: false,
      };

      // Add site_limit for widget subscriptions
      if (tableName === "widget_subscriptions") {
        insertData.site_limit = 1;
      }

      const { data: newSubscription, error: insertError } = await supabase
        .from(tableName)
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating subscription:", insertError);
        return NextResponse.json(
          { error: `Failed to create subscription: ${insertError.message}` },
          { status: 500 }
        );
      }

      // Return success since we've created a free subscription
      return NextResponse.json({ 
        success: true,
        message: "Subscription set to free" 
      });
    }

    // Cancel Stripe subscription if it exists
    if (subscription.stripe_subscription_id && stripeSecretKey) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2025-10-29.clover",
        });
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      } catch (stripeError: any) {
        console.error("Stripe cancellation error:", stripeError);
        // Continue with database update even if Stripe cancellation fails
      }
    }

    // Update subscription to free
    const updateData: any = {
      subscription_type: "free",
      is_active: false,
      stripe_subscription_id: null,
      stripe_price_id: null,
      billing_cycle: null,
      current_period_end: null,
    };

    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

