import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, LogOut, Settings, Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserSettings } from "./UserSettings";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type UserPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

type AuthFlow = 'login' | 'signup' | 'verifying';

export function UserPanel({ isOpen, onClose }: UserPanelProps) {
  const { t } = useTranslation();
  const [authFlow, setAuthFlow] = useState<AuthFlow>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if user is logged in from localStorage
  const userDataStr = localStorage.getItem('user_data');
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  const isLoggedIn = !!userData;

  // Email validation regex
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Form validation
  const isFormValid = isValidEmail(email) && password.length >= 8 && (authFlow !== 'signup' || name.trim().length > 0);

  // Cleanup cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
              cooldownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        toast({
          title: t('auth.loginFailed'),
          description: data.error || data.message || t('auth.invalidCredentials'),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.loginSuccess'),
      });
      
      const user = {
        email: data.email || email,
        name: data.name || email.split('@')[0],
        loginTime: new Date().toISOString(),
        token: data.token
      };
      
      localStorage.setItem('user_data', JSON.stringify(user));
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: t('common.error'),
        description: t('auth.loginFailed'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      // Create account
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create account',
          email: email,
          password: password,
          name: name
        })
      });

      const data = await response.json();
      
      if (!data.ok) {
        toast({
          title: t('auth.signupFailed'),
          description: data.error || t('auth.signupFailed'),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('auth.accountCreated'),
        description: t('auth.signupSuccess'),
      });
      
      // Send verification code
      await handleSendCode();
      
      // Transition to verification flow
      setAuthFlow('verifying');
      setVerificationCode("");
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: t('common.error'),
        description: t('auth.signupFailed'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    try {
      const response = await fetch('/api/auth/sendcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!data.ok) {
        toast({
          title: t('common.error'),
          description: data.error || t('auth.verificationFailed'),
          variant: "destructive",
        });
        return false;
      }

      // Set cooldown from Azure response or default to 60 seconds
      const cooldown = data.resendCooldownSecs || 60;
      setResendCooldown(cooldown);

      return true;
    } catch (error) {
      console.error('Send code error:', error);
      toast({
        title: t('common.error'),
        description: t('auth.verificationFailed'),
        variant: "destructive",
      });
      return false;
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    try {
      const success = await handleSendCode();
      if (success) {
        toast({
          title: t('auth.codeResent'),
          description: t('auth.codeResentSuccess'),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      toast({
        title: t('auth.codeInvalid'),
        description: t('auth.codeInvalidMessage'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verifycode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: verificationCode
        })
      });

      const data = await response.json();

      if (!data.ok) {
        // Handle specific error cases
        const errorMessage = data.error || '';
        if (errorMessage.toLowerCase().includes('expired')) {
          toast({
            title: t('auth.codeExpired'),
            description: t('auth.codeExpiredMessage'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('auth.codeInvalid'),
            description: t('auth.codeInvalidMessage'),
            variant: "destructive",
          });
        }
        setVerificationCode("");
        return;
      }

      // Verification successful
      toast({
        title: t('auth.verificationSuccess'),
        description: t('auth.verificationSuccessMessage'),
      });

      // Store user data and log in
      const user = {
        email: email,
        name: name,
        loginTime: new Date().toISOString(),
        token: data.token
      };
      
      localStorage.setItem('user_data', JSON.stringify(user));
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Verify code error:', error);
      toast({
        title: t('common.error'),
        description: t('auth.verificationFailed'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignup = () => {
    setAuthFlow('signup');
    setVerificationCode("");
    setResendCooldown(0);
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_data');
    window.location.reload();
  };

  if (isLoggedIn) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="panel-user-logged-in">
          <SheetHeader>
            <SheetTitle>{t('auth.account')}</SheetTitle>
            <SheetDescription>{t('auth.accountDescription')}</SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="profile" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" data-testid="tab-profile">
                <User className="w-4 h-4 mr-2" />
                {t('auth.profile')}
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Settings className="w-4 h-4 mr-2" />
                {t('settings.title')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-6">
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
                  <Label className="text-sm text-muted-foreground">{t('auth.memberSince')}</Label>
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
                {t('auth.logout')}
              </Button>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <UserSettings userEmail={userData.email} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    );
  }

  // Verification view
  if (authFlow === 'verifying') {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent data-testid="panel-user-verification">
          <SheetHeader>
            <SheetTitle>{t('auth.verificationRequired')}</SheetTitle>
            <SheetDescription>
              {t('auth.verificationPrompt', { email })}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleVerifyCode} className="mt-6 space-y-6">
            <div className="flex items-center justify-center py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verification-code" className="text-center block">
                {t('auth.enterCode')}
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  data-testid="input-verification-code"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              data-testid="button-verify"
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? t('auth.verifying') : t('auth.verify')}
            </Button>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendCode}
                disabled={isLoading || resendCooldown > 0}
                data-testid="button-resend-code"
              >
                {resendCooldown > 0 
                  ? t('auth.resendCooldown', { seconds: resendCooldown })
                  : (isLoading ? t('auth.resendingCode') : t('auth.resendCode'))}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBackToSignup}
                disabled={isLoading}
                data-testid="button-back-to-signup"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('auth.backToSignup')}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    );
  }

  // Login / Signup view
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent data-testid="panel-user-login">
        <SheetHeader>
          <SheetTitle>{authFlow === 'login' ? t('auth.login') : t('auth.signup')}</SheetTitle>
          <SheetDescription>
            {authFlow === 'login'
              ? t('auth.loginPrompt') 
              : t('auth.signupPrompt')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={authFlow === 'login' ? handleLogin : handleSignup} className="mt-6 space-y-4">
          {authFlow === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.name')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('auth.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="input-name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
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

          <Button 
            type="submit" 
            className="w-full" 
            data-testid="button-submit"
            disabled={!isFormValid || isLoading}
          >
            {isLoading 
              ? t('common.loading')
              : (authFlow === 'login' ? t('auth.login') : t('auth.signup'))}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setAuthFlow(authFlow === 'login' ? 'signup' : 'login')}
              className="text-sm text-primary hover:underline"
              data-testid="button-toggle-mode"
              disabled={isLoading}
            >
              {authFlow === 'login'
                ? t('auth.toggleToSignup') 
                : t('auth.toggleToLogin')}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
