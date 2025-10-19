import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, LogOut } from "lucide-react";

type UserPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function UserPanel({ isOpen, onClose }: UserPanelProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  
  // Check if user is logged in from localStorage
  const userDataStr = localStorage.getItem('user_data');
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  const isLoggedIn = !!userData;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Call your backend which proxies to Azure Function
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || 'Login failed');
        return;
      }

      const data = await response.json();
      
      // Store user data in localStorage
      const user = {
        email: data.email || email,
        name: data.name || email.split('@')[0],
        loginTime: new Date().toISOString(),
        token: data.token // Optional: store auth token if your Azure Function returns one
      };
      
      localStorage.setItem('user_data', JSON.stringify(user));
      
      // Reload to update UI
      window.location.reload();
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Call your backend which proxies to Azure Function
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || 'Signup failed');
        return;
      }

      const data = await response.json();
      
      // Store user data in localStorage
      const user = {
        email: data.email || email,
        name: data.name || name,
        loginTime: new Date().toISOString(),
        token: data.token // Optional: store auth token if your Azure Function returns one
      };
      
      localStorage.setItem('user_data', JSON.stringify(user));
      
      // Reload to update UI
      window.location.reload();
    } catch (error) {
      console.error('Signup error:', error);
      alert('Signup failed. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_data');
    window.location.reload();
  };

  if (isLoggedIn) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent data-testid="panel-user-logged-in">
          <SheetHeader>
            <SheetTitle>Account</SheetTitle>
            <SheetDescription>Manage your account settings</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg" data-testid="text-user-name">{userData.name}</h3>
                <p className="text-sm text-muted-foreground" data-testid="text-user-email">{userData.email}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-sm text-muted-foreground">Member since</Label>
                <p className="text-sm">{new Date(userData.loginTime).toLocaleDateString()}</p>
              </div>
            </div>

            <Button 
              onClick={handleLogout} 
              variant="destructive" 
              className="w-full"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent data-testid="panel-user-login">
        <SheetHeader>
          <SheetTitle>{isLogin ? "Log In" : "Create Account"}</SheetTitle>
          <SheetDescription>
            {isLogin 
              ? "Enter your credentials to access your account" 
              : "Create a new account to get started"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={isLogin ? handleLogin : handleSignup} className="mt-6 space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="input-name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="input-password"
            />
          </div>

          <Button type="submit" className="w-full" data-testid="button-submit">
            {isLogin ? "Log In" : "Create Account"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
              data-testid="button-toggle-mode"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Log in"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
