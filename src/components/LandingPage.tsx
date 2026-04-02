
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Bot, HeartPulse, Salad, ShieldCheck, TestTubeDiagonal } from 'lucide-react';
import { Logo } from './icons/Logo';
import { Footer } from './Footer';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedText } from './AnimatedText';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const features = [
  {
    icon: <Bot className="w-8 h-8 text-primary" />,
    title: 'AI Risk Assessment',
    description: 'Input your health metrics to receive an instant, AI-powered diabetes risk score and a detailed analysis.',
  },
  {
    icon: <Salad className="w-8 h-8 text-primary" />,
    title: 'Meal Analyzer',
    description: 'Snap a photo of your meal and get an AI-driven nutritional breakdown, complete with feedback and suggestions.',
  },
  {
    icon: <HeartPulse className="w-8 h-8 text-primary" />,
    title: 'Personalized Plans',
    description: 'Receive custom meal and exercise plans from our AI, tailored to your health profile and fitness level.',
  },
    {
    icon: <TestTubeDiagonal className="w-8 h-8 text-primary" />,
    title: 'Blood Report Reader',
    description: 'Upload an image of your lab report to automatically extract and interpret key medical data.',
  },
];

const images = [
  { src: '/images/front.png', blend: false, alt: 'DiaHelper dashboard overview' },
  { src: '/images/front2.png', blend: true, alt: 'DiaHelper health analytics preview' },
];

const ImageFader = ({ image, index }: { image: { src: string, blend: boolean, alt: string }, index: number }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0"
        >
            <Image
                src={image.src}
                fill
              alt={image.alt}
                className={`object-cover ${image.blend ? 'mix-blend-multiply' : ''}`}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                data-ai-hint="health technology abstract"
                priority={index === 0}
                onLoad={() => setIsLoaded(true)}
            />
        </motion.div>
    );
};

const faqItems = [
  {
    question: 'How can I check my diabetes risk online?',
    answer:
      'You can check your diabetes risk online using AI tools like DiaHelper by entering your BMI, glucose and lifestyle details.',
  },
  {
    question: 'Is there a free diabetes risk calculator?',
    answer: 'Yes, DiaHelper provides a free AI-powered diabetes risk calculator for instant results.',
  },
  {
    question: 'What does DiaHelper do?',
    answer:
      'DiaHelper analyzes your health inputs to estimate diabetes risk, explains the results, and provides practical nutrition and lifestyle guidance.',
  },
  {
    question: 'How accurate is the AI diabetes risk assessment?',
    answer:
      'DiaHelper uses AI models to provide personalized estimates. Results are informational and should be confirmed by a healthcare professional.',
  },
  {
    question: 'Can I check diabetes risk at home?',
    answer:
      'Yes. You can check diabetes risk at home by entering basic details like BMI, glucose history, and activity level into DiaHelper.',
  },
  {
    question: 'Who should use DiaHelper?',
    answer:
      'DiaHelper is helpful for anyone who wants early risk awareness, preventive insights, or personalized guidance to support healthier habits.',
  },
  {
    question: 'Is DiaHelper an AI diabetes checker in India?',
    answer:
      'Yes. DiaHelper is an AI diabetes checker that can be used in India and globally to get instant risk insights based on your health inputs.',
  },
  {
    question: 'Is DiaHelper a free diabetes prediction tool?',
    answer:
      'DiaHelper provides a free diabetes prediction tool so you can check your risk online without cost.',
  },
  {
    question: 'What information do I need to use the risk calculator?',
    answer:
      'You can use the calculator with basic health details like BMI, age, activity level, and glucose history if available.',
  },
  {
    question: 'Can DiaHelper help with preventive care?',
    answer:
      'Yes. DiaHelper explains your risk score and suggests nutrition and lifestyle steps that support preventive care.',
  },
];


export function LandingPage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(timer); // Cleanup on component unmount
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 flex flex-wrap items-center gap-3 py-3 shadow-sm sm:h-16 sm:flex-nowrap sm:gap-0 sm:py-0">
        <Link href="/" className="flex items-center justify-center gap-2">
          <Logo className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">DiaHelper</span>
        </Link>
        <nav className="w-full flex items-center justify-between gap-4 sm:ml-auto sm:w-auto sm:justify-start sm:gap-6">
          <Link
            href="/#faq"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            FAQ
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Login
          </Link>
          <Button asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-secondary/50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-4">
                   <AnimatedText 
                    text="Take Control of Your Health with DiaHelper" 
                    el="h1"
                    className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none"
                    />
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Your intelligent partner for diabetes risk assessment. Leverage the power of AI to understand your health, analyze your meals, and get personalized insights to live a healthier life.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg" className="group">
                    <Link href="/signup">
                      Get Started for Free
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-xl lg:order-last lg:aspect-square">
                 <AnimatePresence>
                   <ImageFader image={images[currentImageIndex]} index={currentImageIndex} />
                 </AnimatePresence>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">Key Features</div>
                 <AnimatedText 
                    text="A Smarter Way to Manage Your Health" 
                    el="h2"
                    className="text-3xl font-bold tracking-tighter sm:text-5xl"
                    />
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  DiaHelper provides a suite of intelligent tools designed to empower you on your wellness journey.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-2 mt-12">
              {features.map((feature) => (
                <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center gap-4">
                        {feature.icon}
                        <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        <section className="w-full py-8 md:py-16 lg:py-20 bg-background">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                What is a Diabetes Risk Calculator?
              </h2>
              <p className="text-muted-foreground md:text-lg">
                A diabetes risk calculator helps you estimate your chances of developing diabetes based on key health
                factors like BMI, glucose levels, age, and lifestyle. DiaHelper uses artificial intelligence to provide
                more accurate and personalized results compared to traditional methods.
              </p>
            </div>
          </div>
        </section>
        <section id="faq" className="w-full py-12 md:py-20 lg:py-24 bg-secondary/50">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-8">
              <h2 className="text-3xl font-bold tracking-tighter text-center sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <Accordion type="single" collapsible className="rounded-2xl border border-border bg-background/70 px-6">
                {faqItems.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left text-base text-foreground">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
        <section className="w-full py-8 md:py-16 lg:py-20 bg-secondary/50">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Ready to Start Your Journey?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Create an account today and take the first step towards a proactive and informed approach to your health.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
                <Button asChild size="lg" className="group w-full">
                    <Link href="/signup">
                        Sign Up Now
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t">
        <div className="container flex flex-col items-center gap-4 px-4 py-6 text-center md:px-6">
          <p className="w-full text-center text-xs text-muted-foreground">
            &copy; 2026 DiaHelper. All rights reserved by Abhay.
          </p>
          <Footer />
        </div>
      </footer>
    </div>
  );
}

