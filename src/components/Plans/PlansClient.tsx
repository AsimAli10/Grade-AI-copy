"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createCheckoutSession, redirectToCheckout } from "@/utils/stripe";
import { getPlatformSubscription } from "@/utils/subscription";
import type { User } from "@supabase/supabase-js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Plan {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  billing_cycle: "free" | "monthly" | "yearly";
  interval: string;
  features?: string[];
  is_popular?: boolean;
  stripe_price_id?: string | null;
}

export type PlansClientProps = {
  initialUser?: User | null;
  initialPlans?: Plan[];
  initialSubscription?: any;
};

export function PlansClient({
  initialUser = null,
  initialPlans = [],
  initialSubscription = null,
}: PlansClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [isFetchingPlans, setIsFetchingPlans] = useState(initialPlans.length === 0);
  const [subscription, setSubscription] = useState<any>(initialSubscription);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [planToCancel, setPlanToCancel] = useState<Plan | null>(null);

  useEffect(() => {
    if (initialPlans.length > 0) {
      setPlans(initialPlans);
    }
  }, [initialPlans]);

  useEffect(() => {
    if (initialSubscription) {
      setSubscription(initialSubscription);
    }
  }, [initialSubscription]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push("/auth");
          return;
        }

        if (initialPlans.length === 0) {
          setIsFetchingPlans(true);
          const { data: plansData } = await supabase
            .from("platform_plans")
            .select("*")
            .eq("is_active", true)
            .order("price_cents", { ascending: true });

          if (!cancelled) {
            setPlans(plansData || []);
          }
        }

        if (!initialSubscription) {
          const sub = await getPlatformSubscription(session.user.id);
          if (!cancelled) {
            setSubscription(sub);
          }
        }
      } catch (error) {
        console.error("Error loading plans:", error);
        if (!cancelled && initialPlans.length === 0) {
          toast({
            title: "Error",
            description: "Failed to load plans. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setIsFetchingPlans(false);
        }
      }
    };

    if (!initialUser || initialPlans.length === 0 || !initialSubscription) {
      void loadData();
    } else {
      setIsFetchingPlans(false);
    }

    return () => {
      cancelled = true;
    };
  }, [initialUser, initialPlans.length, initialSubscription, router, toast]);

  const formatPrice = (price_cents: number, interval: string) => {
    if (interval === "free") return "$0";
    return `$${(price_cents / 100).toFixed(2)}`;
  };

  const translateFeature = (feature: string): string => {
    // Return feature as-is (no translation needed)
    return feature;
  };

  const translateDescription = (description: string | undefined, billingCycle: string): string => {
    if (!description) return "";
    // Return description as-is (no translation needed)
    return description;
  };

  const isCurrentPlan = (plan: Plan) => {
    if (!subscription) return false;

    // For free plan, check even if is_active is false (after cancellation)
    if (subscription.subscription_type === "free") {
      const planCycle = plan.billing_cycle || (plan.interval === "free" ? "free" : null);
      return planCycle === "free";
    }

    // For paid plans, require is_active to be true
    if (!subscription.is_active) return false;

    if (subscription.platform_plan_id && plan.id) {
      return subscription.platform_plan_id === plan.id;
    }

    if (subscription.subscription_type === "premium") {
      const planCycle = plan.billing_cycle ||
        (plan.interval === "month" ? "monthly" : plan.interval === "year" ? "yearly" : null);
      return planCycle === subscription.billing_cycle && planCycle !== "free";
    }

    return false;
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !planToCancel) return;

    setCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Error",
          description: "Please sign in to continue.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionType: "platform",
          userId: session.user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      // Refresh subscription data
      const sub = await getPlatformSubscription(session.user.id);
      setSubscription(sub);

      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });

      setShowCancelDialog(false);
      setPlanToCancel(null);
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    try {
      const billingCycle = plan.billing_cycle ||
        (plan.interval === "month" ? "monthly" : plan.interval === "year" ? "yearly" : plan.interval === "free" ? "free" : "monthly");
      setLoading(`${plan.name}-${billingCycle}`);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth");
        return;
      }

      const ensureProfile = async () => {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (existingProfile) return;

        const { error } = await (supabase as any)
          .from("profiles")
          .insert({ id: session.user.id, email: session.user.email || "" });

        if (error) {
          if (error.code === "23503") {
            throw new Error(
              "Profile foreign key constraint error. Please run the migration: 20250105000000_fix_profiles_fk_constraint.sql"
            );
          }
          throw new Error(`Failed to create profile: ${error.message}`);
        }
      };

      if (billingCycle === "free") {
        await ensureProfile();

        const { data: existing } = await (supabase as any)
          .from("platform_subscriptions")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        let subscriptionId: string | null = null;
        let error: any = null;

        if (existing?.id) {
          const { data: updateData, error: updateError } = await (supabase as any)
            .from("platform_subscriptions")
            .update({
              subscription_type: "free",
              is_active: true,
              platform_plan_id: plan.id,
              stripe_customer_id: null,
              stripe_subscription_id: null,
              stripe_price_id: null,
              billing_cycle: "free",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", session.user.id)
            .select("id")
            .single();

          subscriptionId = updateData?.id || existing.id;
          error = updateError;
        } else {
          const { data: insertData, error: insertError } = await (supabase as any)
            .from("platform_subscriptions")
            .insert({
              user_id: session.user.id,
              subscription_type: "free",
              is_active: true,
              platform_plan_id: plan.id,
              billing_cycle: "free",
            })
            .select("id")
            .single();

          subscriptionId = insertData?.id || null;
          error = insertError;
        }

        if (error) {
          throw error;
        }

        if (subscriptionId) {
          await (supabase as any)
            .from("profiles")
            .update({
              platform_subscription_id: subscriptionId,
              platform_subscription_type: "free",
              platform_subscription_plan_id: plan.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.user.id);
        }

        toast({
          title: "Free Plan Activated",
          description: "You have successfully switched to the free plan.",
        });

        router.push("/dashboard");
        return;
      }

      const priceId = plan.stripe_price_id ||
        (billingCycle === "monthly"
          ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID
          : billingCycle === "yearly"
          ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID
          : undefined);

      if (!priceId) {
        toast({
          title: "Error",
          description: `Price ID not found for ${billingCycle} billing cycle.`,
          variant: "destructive",
        });
        return;
      }

      const checkoutUrl = await createCheckoutSession(
        priceId,
        billingCycle as "monthly" | "yearly",
        "platform",
        plan.id,
        plan.name
      );

      await redirectToCheckout(checkoutUrl);
    } catch (error: any) {
      console.error("Error selecting plan:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to select plan",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground mb-6 pb-1" >
            Select the plan that best fits your needs
          </p>
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="mx-auto">
            Keep Using Free Plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {isFetchingPlans ? (
            <div className="col-span-3 text-center text-muted-foreground">Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="col-span-3 text-center text-muted-foreground">No plans available</div>
          ) : (
            plans.map((plan) => {
              const billingCycle = plan.billing_cycle ||
                (plan.interval === "month" ? "monthly" : plan.interval === "year" ? "yearly" : plan.interval === "free" ? "free" : "monthly");
              const isLoading = loading === `${plan.name}-${billingCycle}`;
              const isCurrent = isCurrentPlan(plan);

              const isPaidPlan = billingCycle !== "free";
              const isCurrentPaidPlan = isCurrent && isPaidPlan;
              
              // Determine button text based on current subscription and target plan
              const getButtonText = () => {
                if (isLoading) return "Processing...";
                if (isCurrentPaidPlan) return "Cancel Subscription";
                if (isCurrent) return "Current Plan";
                
                // Check if user has an active premium subscription
                const hasActivePremium = subscription?.subscription_type === "premium" && subscription?.is_active;
                const currentBillingCycle = subscription?.billing_cycle;
                const isOnFreePlan = !hasActivePremium && (subscription?.subscription_type === "free" || !subscription);
                
                if (billingCycle === "free") {
                  // If user is on premium (monthly or yearly), show "Go Free"
                  if (hasActivePremium) {
                    return "Go Free";
                  }
                  return "Get Started";
                }
                
                if (billingCycle === "yearly") {
                  // If user is on premium monthly, show "Go Annually"
                  if (hasActivePremium && currentBillingCycle === "monthly") {
                    return "Go Annually";
                  }
                  // If user is on free plan, show "Go Yearly"
                  if (isOnFreePlan) {
                    return "Go Yearly";
                  }
                  return "Subscribe Yearly";
                }
                
                if (billingCycle === "monthly") {
                  // If user is on premium yearly, show "Go Monthly"
                  if (hasActivePremium && currentBillingCycle === "yearly") {
                    return "Go Monthly";
                  }
                  // If user is on free plan, show "Go Monthly"
                  if (isOnFreePlan) {
                    return "Go Monthly";
                  }
                  return "Subscribe Monthly";
                }
                
                return "Select Plan";
              };
              
              const buttonText = getButtonText();

              return (
                <Card
                  key={plan.id}
                  className={`relative ${plan.is_popular ? "border-primary border-2 shadow-lg md:scale-105" : "border-2"}`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      {plan.billing_cycle === "free" && <Sparkles className="h-6 w-6 text-primary" />}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{formatPrice(plan.price_cents, plan.interval)}</span>
                      <span className="text-muted-foreground">
                        {plan.billing_cycle === "monthly" ? "/month" : plan.billing_cycle === "yearly" ? "/year" : "forever"}
                      </span>
                    </div>
                    <CardDescription className="mt-2">{translateDescription(plan.description, billingCycle)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {(Array.isArray(plan.features) ? plan.features : []).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{translateFeature(feature)}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${isCurrentPaidPlan ? "bg-destructive hover:bg-destructive/90" : ""}`}
                      variant={isCurrentPaidPlan ? "destructive" : isCurrent ? "outline" : plan.is_popular ? "default" : "outline"}
                      onClick={() => {
                        if (isCurrentPaidPlan) {
                          setPlanToCancel(plan);
                          setShowCancelDialog(true);
                        } else if (!isCurrent) {
                          handleSelectPlan(plan);
                        }
                      }}
                      disabled={isLoading || cancelling || (isCurrent && !isCurrentPaidPlan)}
                    >
                      {buttonText}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
