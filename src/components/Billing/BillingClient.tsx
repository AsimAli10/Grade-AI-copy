"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Calendar, Sparkles, Download, AlertCircle } from "lucide-react";
import { createCheckoutSession, redirectToCheckout } from "@/utils/stripe";
import type { User } from "@supabase/supabase-js";

export type BillingClientProps = {
  initialUser?: User | null;
  initialSubscription?: any | null;
};

export function BillingClient({
  initialUser = null,
  initialSubscription,
}: BillingClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(initialUser);
  const [subscription, setSubscription] = useState<any>(initialSubscription ?? null);
  const [loading, setLoading] = useState(!initialUser);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setLoading(false);
    }
  }, [initialUser]);

  useEffect(() => {
    setSubscription(initialSubscription ?? null);
  }, [initialSubscription]);

  useEffect(() => {
    if (initialUser && typeof initialSubscription !== "undefined") {
      return;
    }

    let cancelled = false;

    const fetchBillingData = async () => {
      try {
        setLoading(true);
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          router.push("/auth");
          return;
        }

        if (cancelled) return;

        setUser(session.user);

        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!cancelled) {
          setSubscription(subData ?? null);
        }
      } catch (err) {
        console.error("Error fetching billing data:", err);
        toast({
          title: "Error",
          description: "Failed to load billing information.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchBillingData();

    return () => {
      cancelled = true;
    };
  }, [initialUser, initialSubscription, router, toast]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID || "";
      if (!priceId) {
        throw new Error("Premium plan price ID not configured");
      }

      const checkoutUrl = await createCheckoutSession(priceId, "monthly");
      await redirectToCheckout(checkoutUrl);
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout process.",
        variant: "destructive",
      });
      setUpgrading(false);
    }
  };

  const handleManageSubscription = () => {
    toast({
      title: "Coming Soon",
      description: "Subscription management portal will be available soon.",
    });
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </main>
    );
  }

  const isPremium = subscription?.subscription_type === "premium" && subscription?.is_active;
  const isFree = !subscription || subscription?.subscription_type === "free";

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and payment information</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> Current Plan
                </CardTitle>
                <CardDescription className="mt-2">
                  {isPremium ? "You're subscribed to our Premium plan" : "You're currently on the Free plan"}
                </CardDescription>
              </div>
              <Badge variant={isPremium ? "default" : "secondary"} className="text-lg px-4 py-2">
                {isPremium ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" /> Premium
                  </>
                ) : (
                  "Free"
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPremium && subscription?.current_period_end && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Next billing date:</span>
                <span className="font-semibold">
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </span>
              </div>
            )}

            {isPremium && subscription?.billing_cycle && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Billing cycle:</span>
                <span className="font-semibold capitalize">{subscription.billing_cycle}</span>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {isFree && (
                <Button onClick={handleUpgrade} disabled={upgrading}>
                  {upgrading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" /> Upgrade to Premium
                    </>
                  )}
                </Button>
              )}

              {isPremium && (
                <Button variant="outline" onClick={handleManageSubscription}>
                  Manage Subscription
                </Button>
              )}

              <Button variant="outline" onClick={() => router.push("/plans")}>
                View All Plans
              </Button>
            </div>
          </CardContent>
        </Card>

        {isPremium && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Your payment method is managed through Stripe</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleManageSubscription}>
                Update Payment Method
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View your past invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {isPremium ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">Premium Subscription</p>
                    <p className="text-sm text-muted-foreground">
                      {subscription?.billing_cycle === "yearly" ? "Annual Plan" : "Monthly Plan"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4 mr-2" /> Download
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center py-4">
                  More billing history will appear here as you make payments
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No billing history available</p>
                <p className="text-sm mt-2">Upgrade to Premium to start your subscription</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-orange-900 dark:text-orange-100">Important Information</p>
                <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1 list-disc list-inside">
                  <li>All payments are processed securely through Stripe</li>
                  <li>You can cancel your subscription at any time</li>
                  <li>No refunds for partial billing periods</li>
                  <li>Contact support for billing inquiries</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
