
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { Inter as FontSans, Caveat as FontCaveat } from "next/font/google"
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/ThemeProvider';
import { DevToolsWarning } from '@/components/DevToolsWarning';

export const metadata: Metadata = {
  title: 'DiaHelper - Diabetes Risk Assessment',
  description: 'An intelligent assistant to help you assess your diabetes risk.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.77-.77-.77a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z%22 /><path d=%22m12 14 2-2 2-2%22 /><path d=%22m9.06 11.94-.06.06%22 /><path d=%22m14.94 11.94.06.06%22 /></svg>',
  },
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
      </head>
      <body className={cn(
          "min-h-screen bg-background font-sans antialiased",
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
