import { Button } from "@/components/ui/button";
import { MessageSquare, Shield, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

type LandingPageProps = {
  onOpenLogin: () => void;
};

export function LandingPage({ onOpenLogin }: LandingPageProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            {t('landing.title')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('landing.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card">
            <MessageSquare className="w-10 h-10 text-primary" />
            <h3 className="font-semibold">{t('landing.features.conversations.title')}</h3>
            <p className="text-sm text-muted-foreground text-center">
              {t('landing.features.conversations.description')}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card">
            <Shield className="w-10 h-10 text-primary" />
            <h3 className="font-semibold">{t('landing.features.security.title')}</h3>
            <p className="text-sm text-muted-foreground text-center">
              {t('landing.features.security.description')}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card">
            <Zap className="w-10 h-10 text-primary" />
            <h3 className="font-semibold">{t('landing.features.speed.title')}</h3>
            <p className="text-sm text-muted-foreground text-center">
              {t('landing.features.speed.description')}
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
            {t('landing.getStarted')}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t('landing.signupPrompt')}
          </p>
        </div>
      </div>
    </div>
  );
}
