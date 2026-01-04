export default function RefundPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">30-Day Money-Back Guarantee</h2>
            <p className="text-muted-foreground">
              We offer a 30-day money-back guarantee for all Premium subscriptions. If you&apos;re not
              completely satisfied with WhatTheFood, you can request a full refund within 30 days
              of your purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">How to Request a Refund</h2>
            <p className="text-muted-foreground">
              To request a refund, please contact our support team at support@whatthefood.io with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>Your account email address</li>
              <li>Your subscription purchase date</li>
              <li>Reason for refund (optional but helpful for improving our service)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Processing Time</h2>
            <p className="text-muted-foreground">
              Refunds are typically processed within 5-10 business days. The refund will be issued
              to the original payment method used for the purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Subscription Cancellation</h2>
            <p className="text-muted-foreground">
              You can cancel your subscription at any time from your account settings. Cancellation
              will take effect at the end of your current billing period, and you&apos;ll retain access
              to Premium features until that date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Exceptions</h2>
            <p className="text-muted-foreground">
              Refunds are not available after 30 days from the purchase date. Once your subscription
              auto-renews, the 30-day guarantee applies to that new billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about our refund policy, please contact us at
              support@whatthefood.io
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}