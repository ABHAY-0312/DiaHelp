import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and conditions for using DiaHelper.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Legal
        </p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Terms & Conditions
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          These terms outline how DiaHelper can be used and the responsibilities of users.
        </p>
      </header>
      <section className="space-y-6 text-sm leading-6 text-muted-foreground">
        <p>
          DiaHelper provides informational health insights only. It does not replace professional medical advice,
          diagnosis, or treatment.
        </p>
        <p>
          By using DiaHelper, you agree to use the service responsibly and understand that results are estimates based on
          the information you provide.
        </p>
        <p>
          We may update these terms over time to reflect product or policy changes. Continued use of the service means you
          accept the latest terms.
        </p>
      </section>
    </main>
  );
}
