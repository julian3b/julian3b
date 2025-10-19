import { Button } from "@/components/ui/button";
import { MessageSquare, Shield, Zap } from "lucide-react";

type LandingPageProps = {
  onOpenLogin: () => void;
};

export function LandingPage({ onOpenLogin }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to AI Chat
          </h1>
          <p className="text-xl text-muted-foreground">
            Your intelligent conversation partner, powered by advanced AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card">
            <MessageSquare className="w-10 h-10 text-primary" />
            <h3 className="font-semibold">Smart Conversations</h3>
            <p className="text-sm text-muted-foreground text-center">
              Engage in natural, intelligent conversations
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card">
            <Shield className="w-10 h-10 text-primary" />
            <h3 className="font-semibold">Secure & Private</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your data is protected and encrypted
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card">
            <Zap className="w-10 h-10 text-primary" />
            <h3 className="font-semibold">Fast Responses</h3>
            <p className="text-sm text-muted-foreground text-center">
              Get instant, accurate answers
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={onOpenLogin} 
            size="lg" 
            className="px-8"
            data-testid="button-get-started"
          >
            Get Started
          </Button>
          <p className="text-sm text-muted-foreground">
            Sign up or log in to start chatting
          </p>
        </div>
      </div>
    </div>
  );
}
