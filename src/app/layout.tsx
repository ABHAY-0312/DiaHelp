
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { Inter as FontSans, Caveat as FontCaveat } from "next/font/google"
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/ThemeProvider';
import { DevToolsWarning } from '@/components/DevToolsWarning';

const siteUrl = 'https://dia-help.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Free AI Diabetes Risk Calculator | DiaHelper',
    template: '%s | DiaHelper',
  },
  description: 'Check your diabetes risk online using AI. Analyze BMI, glucose and health data instantly with DiaHelper. Free diabetes calculator.',
  applicationName: 'DiaHelper',
  category: 'health',
  keywords: [
    'diabetes risk assessment',
    'health tracking',
    'blood sugar insights',
    'wellness assistant',
    'health analytics',
    'nutrition planning',
    'fitness guidance',
    'preventive care',
    'diabetes risk calculator online free',
    'check diabetes risk using AI',
    'how to check diabetes risk at home',
    'AI diabetes checker India',
    'free diabetes prediction tool',
    'care finder prescription',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'DiaHelper - Diabetes Risk Assessment',
    description: 'Assess diabetes risk, track health insights, and get personalized guidance with DiaHelper.',
    siteName: 'DiaHelper',
    images: [
      {
        url: '/images/front.png',
        alt: 'DiaHelper health insights preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DiaHelper - Diabetes Risk Assessment',
    description: 'Assess diabetes risk, track health insights, and get personalized guidance with DiaHelper.',
    images: ['/images/front.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  authors: [{ name: 'DiaHelper Team' }],
  creator: 'DiaHelper Team',
  publisher: 'DiaHelper',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.77-.77-.77a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z%22 /><path d=%22m12 14 2-2 2-2%22 /><path d=%22m9.06 11.94-.06.06%22 /><path d=%22m14.94 11.94.06.06%22 /></svg>',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'DiaHelper',
      url: siteUrl,
    },
    {
      '@type': 'WebSite',
      name: 'DiaHelper',
      url: siteUrl,
      description: 'Assess diabetes risk, track health insights, and get personalized guidance with DiaHelper.',
      publisher: {
        '@type': 'Organization',
        name: 'DiaHelper',
        url: siteUrl,
      },
    },
    {
      '@type': 'WebApplication',
      name: 'DiaHelper',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      url: siteUrl,
      description: 'Assess diabetes risk, track health insights, and get personalized guidance with DiaHelper.',
    },
  ],
};

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontCaveat = FontCaveat({
  subsets: ["latin"],
  variable: "--font-caveat",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={cn(
          "min-h-screen bg-background font-sans antialiased overflow-x-hidden",
          fontSans.variable,
          fontCaveat.variable
        )}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
            themes={['light', 'dark', 'system']}
          >
            <AuthProvider>
              {children}
            </AuthProvider>
            <Toaster />
          </ThemeProvider>
          <DevToolsWarning />
      </body>
    </html>
  );
}

