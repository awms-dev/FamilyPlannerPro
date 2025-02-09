import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { FaUserFriends } from "react-icons/fa";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Extract invite token from URL and verify it
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('invite');
    if (token) {
      setInviteToken(token);
      // Verify the invite token
      apiRequest("GET", `/api/invites/${token}`)
        .then(res => {
          if (!res.ok) {
            throw new Error("Invalid invitation link");
          }
        })
        .catch(error => {
          toast({
            title: "Invalid Invitation",
            description: "The invitation link you're using is invalid or has expired.",
            variant: "destructive",
          });
          setInviteToken(null);
        });
    }
  }, []);

  const loginForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true })),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
      email: "",
    },
  });

  // After successful registration with invite token, join the family
  useEffect(() => {
    if (user && inviteToken) {
      apiRequest("POST", `/api/invites/${inviteToken}/accept`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to join family");
          return res.json();
        })
        .then(() => {
          toast({
            title: "Welcome!",
            description: "You've successfully joined the family.",
          });
          window.location.href = "/"; // Redirect to home page
        })
        .catch(error => {
          toast({
            title: "Error",
            description: "Failed to join the family. Please try again.",
            variant: "destructive",
          });
        });
    }
  }, [user, inviteToken]);

  if (user && !inviteToken) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Tabs defaultValue={inviteToken ? "register" : "login"}>
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="login-username">Username</Label>
                      <Input id="login-username" {...loginForm.register("username")} />
                    </div>
                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <Input id="login-password" type="password" {...loginForm.register("password")} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      Login
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="register-username">Username</Label>
                      <Input id="register-username" {...registerForm.register("username")} />
                    </div>
                    <div>
                      <Label htmlFor="register-email">Email</Label>
                      <Input id="register-email" type="email" {...registerForm.register("email")} />
                    </div>
                    <div>
                      <Label htmlFor="register-display-name">Display Name</Label>
                      <Input id="register-display-name" {...registerForm.register("displayName")} />
                    </div>
                    <div>
                      <Label htmlFor="register-password">Password</Label>
                      <Input id="register-password" type="password" {...registerForm.register("password")} />
                    </div>
                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      Register {inviteToken && "& Join Family"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:flex flex-col items-center justify-center p-8 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="max-w-md text-center">
          <FaUserFriends className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Family Activity Manager
          </h1>
          <p className="text-muted-foreground">
            {inviteToken
              ? "You've been invited to join a family! Create an account to get started."
              : "Stay organized and connected with your family. Track activities, assign tasks, and never miss an important event."}
          </p>
        </div>
      </div>
    </div>
  );
}