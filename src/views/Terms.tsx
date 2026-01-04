export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using GradeAI, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
            <p className="text-muted-foreground">
              Permission is granted to temporarily use GradeAI for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Privacy Policy</h2>
            <p className="text-muted-foreground">
              Your use of GradeAI is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Prohibited Uses</h2>
            <p className="text-muted-foreground">
              You may not use GradeAI in any way that causes, or may cause, damage to the service or impairment of the availability or accessibility of GradeAI.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              In no event shall GradeAI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit) arising out of the use or inability to use GradeAI.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
