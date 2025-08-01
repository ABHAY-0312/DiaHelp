
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
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
import { loginSchema, type LoginFormData } from "@/lib/types";


export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSignIn = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push("/dashboard");
    } catch (error: any) {
      let description = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        description = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.code === 'auth/too-many-requests') {
        description = "Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.";
      }
      toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = form.getValues("email");
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your inbox for instructions to reset your password.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.message,
      });
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="bg-primary text-primary-foreground flex-col items-center justify-center p-8 text-center hidden lg:flex">
        <div className="mb-8 lg:mb-0">
          <Logo className="w-16 h-16 lg:w-24 lg:h-24 mx-auto mb-4" />
          <AnimatedText el="h1" text="Welcome back to DiaHelper" className="text-3xl lg:text-5xl font-bold" once />
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
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignIn)} className="grid gap-4">
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
                    <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                        <button type="button" onClick={handlePasswordReset} className="ml-auto inline-block text-sm underline">
                        Forgot your password?
                        </button>
                    </div>
                    <FormControl>
                      <Input id="password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "Login"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            <p>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="underline text-primary font-semibold">
                Sign up
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
