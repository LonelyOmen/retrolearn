import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, User, Mail, Lock, UserPlus } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("signin-email") as string;
    const password = formData.get("signin-password") as string;

    const { error } = await signIn(email, password);
    
    setIsLoading(false);
    if (!error) {
      onClose();
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("signup-email") as string;
    const password = formData.get("signup-password") as string;
    const fullName = formData.get("signup-name") as string;

    const { error } = await signUp(email, password, fullName);
    
    setIsLoading(false);
    if (!error) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-2 border-primary scanlines">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-retro glow-text">
            ACCESS TERMINAL
          </DialogTitle>
          <DialogDescription className="font-retro text-muted-foreground">
            Sign in to save your notes and study progress
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-background border border-primary">
            <TabsTrigger 
              value="signin" 
              className="font-retro data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              SIGN IN
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="font-retro data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              SIGN UP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="font-retro text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  EMAIL
                </Label>
                <Input
                  id="signin-email"
                  name="signin-email"
                  type="email"
                  required
                  className="font-mono bg-background border-primary focus:border-accent"
                  placeholder="user@retro.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="font-retro text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  PASSWORD
                </Label>
                <Input
                  id="signin-password"
                  name="signin-password"
                  type="password"
                  required
                  className="font-mono bg-background border-primary focus:border-accent"
                  placeholder="••••••••"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full font-retro"
                variant="neon"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ACCESSING...
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    SIGN IN
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="font-retro text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  FULL NAME
                </Label>
                <Input
                  id="signup-name"
                  name="signup-name"
                  type="text"
                  required
                  className="font-mono bg-background border-primary focus:border-accent"
                  placeholder="Retro Wizard"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="font-retro text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  EMAIL
                </Label>
                <Input
                  id="signup-email"
                  name="signup-email"
                  type="email"
                  required
                  className="font-mono bg-background border-primary focus:border-accent"
                  placeholder="user@retro.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="font-retro text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  PASSWORD
                </Label>
                <Input
                  id="signup-password"
                  name="signup-password"
                  type="password"
                  required
                  minLength={6}
                  className="font-mono bg-background border-primary focus:border-accent"
                  placeholder="••••••••"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full font-retro"
                variant="neon"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    CREATING...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    CREATE ACCOUNT
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}