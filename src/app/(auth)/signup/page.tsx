
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Logo } from "@/components/icons/Logo";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Footer } from "@/components/Footer";
import { AnimatedText } from "@/components/AnimatedText";
import { signupSchema, type SignupFormData } from "@/lib/types";

// List of common disposable email domains
const disposableDomains = new Set([
  '10minutemail.com', 'temp-mail.org', 'mailinator.com', 'guerrillamail.com',
  'throwawaymail.com', 'getnada.com', 'mintemail.com', 'tempr.email',
  'maildrop.cc', 'yopmail.com', 'mail.tm', 'dispostable.com', 'fakemail.net',
  'tempmail.com', 'trashmail.com'
]);


export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSignUp = async (data: SignupFormData) => {
    // Check for disposable email
    const emailDomain = data.email.split('@')[1];
    if (disposableDomains.has(emailDomain)) {
      toast({
        variant: "destructive",
        title: "Unsupported Email Provider",
        description: "Please use a permanent email address, not a temporary one.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      router.push("/set-username");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign-up Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="bg-primary text-primary-foreground flex-col items-center justify-center p-8 text-center hidden lg:flex">
        <div className="mb-8 lg:mb-0">
          <Logo className="w-16 h-16 lg:w-24 lg:h-24 mx-auto mb-4" />
          <AnimatedText el="h1" text="Create your DiaHelper Account" className="text-3xl lg:text-5xl font-bold" once />
          <AnimatedText el="p" text="Your intelligent partner in diabetes risk management." className="text-md lg:text-lg mt-2 lg:mt-4" once />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-12 bg-secondary">
        <motion.div
          className="mx-auto grid w-[350px] gap-6 bg-card p-6 rounded-lg shadow-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid gap-2 text-center">
            <Logo className="w-12 h-12 text-primary mx-auto mb-2 lg:hidden" />
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to create your account
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignUp)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email">Email</Label>
                    <FormControl>
                      <Input id="email" placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="password">Password</Label>
                    <FormControl>
                      <Input id="password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <FormControl>
                      <Input id="confirm-password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "Create Account"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            <p>
              Already have an account?{" "}
              <Link href="/login" className="underline text-primary font-semibold">
                Sign in
              </Link>
            </p>
             <p className="mt-2">
                Having trouble?{" "}
                <a href="mailto:abhay.dec03@gmail.com" className="underline text-primary font-semibold">
                    Contact Support
                </a>
            </p>
          </div>
        </motion.div>
        <div className="mt-8">
          <Footer />
        </div>
      </div>
    </div>
  );
}
