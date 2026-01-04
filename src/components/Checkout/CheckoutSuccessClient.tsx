'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function CheckoutSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subscriptionType, setSubscriptionType] = useState<string | null>(null);
  const cameFromWidgetFlow = subscriptionType === "widget";

  // Get search params in useEffect to ensure they're available
  useEffect(() => {
    if (searchParams) {
      setSessionId(searchParams.get("session_id"));
      setSubscriptionType(searchParams.get("type"));
    }
  }, [searchParams]);

  useEffect(() => {
    const verifySubscription = async () => {
      // Wait for searchParams to be available
      if (!searchParams) {
        return;
      }

      const currentSessionId = searchParams.get("session_id");
      const currentSubscriptionType = searchParams.get("type");
      const legacyWidgetFlow = currentSubscriptionType === "widget";

      if (!currentSessionId) {
        toast({
          title: "Invalid session",
          description: "No checkout session found.",
          variant: "destructive",
        });
        router.push("/plans");
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/auth");
          return;
        }

        const tableName = "platform_subscriptions";
        let attempts = 0;
        const maxAttempts = 10;

        const checkSubscription = async (): Promise<boolean> => {
          const { data: subData, error } = await supabase
            .from(tableName)
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (error) {
            console.error("Error fetching subscription:", error);
            return false;
          }

          const subscriptionRecord = subData as { is_active?: boolean } | null;

          if (subscriptionRecord?.is_active) {
            setSubscription(subscriptionRecord);
            return true;
          }

          return false;
        };

        let subscriptionActive = await checkSubscription();

        while (!subscriptionActive && attempts < maxAttempts) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          subscriptionActive = await checkSubscription();
          if (subscriptionActive) break;
        }

        if (subscriptionActive) {
          toast({
            title: "Success!",
            description:
              legacyWidgetFlow
                ? "Widget access now follows your WhatTheFood plan. You're ready to embed."
                : "Your Premium subscription is now active.",
          });

          setTimeout(() => {
            router.push((legacyWidgetFlow ? "/widget/dashboard" : "/dashboard") as any);
          }, 1500);
        } else {
          toast({
            title: "Subscription Processing",
            description: "Your subscription is being processed. You'll have access shortly.",
          });

          setTimeout(() => {
            router.push((legacyWidgetFlow ? "/widget/dashboard" : "/dashboard") as any);
          }, 2000);
        }

        setLoading(false);
      } catch (error: any) {
        console.error("Error verifying subscription:", error);
        toast({
          title: "Verification error",
          description: "We're verifying your subscription. Redirecting...",
          variant: "destructive",
        });

        setTimeout(() => {
          router.push((legacyWidgetFlow ? "/widget/dashboard" : "/dashboard") as any);
        }, 2000);

        setLoading(false);
      }
    };

    if (sessionId !== null) {
      void verifySubscription();
    }
  }, [router, searchParams, sessionId, subscriptionType, toast]);

  // Show loading if searchParams aren't ready yet or if we're still verifying
  if (loading || !searchParams || sessionId === null) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your subscription...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center py-16">
      <div className="container mx-auto px-4 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              {cameFromWidgetFlow
                ? "Your widget access is part of your WhatTheFood plan"
                : "Your Premium subscription is now active"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                <p className="font-semibold">
                  {subscription.subscription_type === "premium" ? "Premium - Active" : "Free plan"}
                </p>
                {subscription.current_period_end && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            <Button
              className="w-full"
                onClick={() => router.push((cameFromWidgetFlow ? "/widget/dashboard" : "/dashboard") as any)}
            >
              Go to Dashboard
            </Button>

            <Button
              variant="outline"
              className="w-full"
                onClick={() => router.push("/plans")}
            >
              View Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
