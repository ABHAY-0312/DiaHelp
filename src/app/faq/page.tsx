import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about DiaHelper, diabetes risk assessment, and health insights.',
  alternates: {
    canonical: '/faq',
  },
};

const faqs = [
  {
    question: 'What is DiaHelper?',
    answer:
      'DiaHelper is a health assistant that helps you assess diabetes risk and track personalized health insights.',
  },
  {
    question: 'Is DiaHelper a replacement for medical advice?',
    answer:
      'No. DiaHelper provides informational insights and should not replace professional medical advice.',
  },
  {
    question: 'How does the diabetes risk assessment work?',
    answer:
      'You provide basic health information and DiaHelper analyzes it to estimate risk and suggest next steps.',
  },
  {
    question: 'Can I use DiaHelper for meal planning and exercise guidance?',
    answer:
      'Yes. DiaHelper offers nutrition and activity guidance tailored to your goals and preferences.',
  },
  {
    question: 'Is my data private?',
    answer:
      'We prioritize privacy and data security. Review the app privacy details for specifics.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Support
        </p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Quick answers about DiaHelper, diabetes risk assessment, and the insights you receive.
        </p>
      </header>
      <section className="space-y-6">
        {faqs.map((faq) => (
          <article
            key={faq.question}
            className="rounded-2xl border border-border bg-background/60 p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-foreground">{faq.question}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
