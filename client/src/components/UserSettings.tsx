import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UserSettings } from "@shared/schema";

type UserSettingsProps = {
  userEmail: string;
};

export function UserSettings({ userEmail }: UserSettingsProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 2000,
    responseStyle: "balanced",
    conversationStyle: "friendly",
    customPersonality: "",
  });

  useEffect(() => {
    fetchSettings();
  }, [userEmail]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      if (data.ok && data.settings) {
        // Normalize field names (Azure returns PascalCase, we need camelCase)
        const normalizedSettings = {
          model: data.settings.model || data.settings.Model,
          temperature: data.settings.temperature || data.settings.Temperature,
          maxTokens: data.settings.maxTokens || data.settings.MaxTokens,
          responseStyle: data.settings.responseStyle || data.settings.ResponseStyle,
          conversationStyle: data.settings.conversationStyle || data.settings.ConversationStyle,
          customPersonality: data.settings.customPersonality || data.settings.CustomPersonality || "",
        };
        setSettings(normalizedSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: t('common.error'),
        description: t('settings.settingsError'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: userEmail,
          settings: settings
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      toast({
        title: t('common.success'),
        description: t('settings.settingsSaved'),
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: t('common.error'),
        description: t('settings.settingsError'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="space-y-2 pb-6 border-b">
        <Label htmlFor="language">
          <Languages className="w-4 h-4 inline mr-2" />
          {t('settings.language')}
        </Label>
        <Select
          value={i18n.language}
          onValueChange={(lng) => i18n.changeLanguage(lng)}
        >
          <SelectTrigger id="language" data-testid="select-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t('languages.en')}</SelectItem>
            <SelectItem value="es">{t('languages.es')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">{t('settings.aiCustomization')}</h3>
        
        {/* Model Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">{t('settings.selectModel')}</Label>
            <Select
              value={settings.model}
              onValueChange={(value) => setSettings({ ...settings, model: value as any })}
            >
              <SelectTrigger id="model" data-testid="select-model">
                <SelectValue placeholder={t('settings.selectModel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-5-nano">GPT-5 Nano - $0.05/$0.40 per 1M tokens</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini - $0.15/$0.60 per 1M tokens</SelectItem>
                <SelectItem value="gpt-5-mini">GPT-5 Mini - $0.25/$2.00 per 1M tokens</SelectItem>
                <SelectItem value="gpt-5">GPT-5 - $1.25/$10.00 per 1M tokens</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o - $2.50/$10.00 per 1M tokens</SelectItem>
                <SelectItem value="gpt-4.5">GPT-4.5 - $75.00/$150.00 per 1M tokens</SelectItem>
                <SelectItem value="o1-pro">o1-Pro - $150.00/$600.00 per 1M tokens</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose which AI model to use (prices: input/output tokens)
            </p>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">{t('settings.temperature')}</Label>
              <span className="text-sm text-muted-foreground">{settings.temperature?.toFixed(1)}</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[settings.temperature || 0.7]}
              onValueChange={(value) => setSettings({ ...settings, temperature: value[0] })}
              data-testid="slider-temperature"
            />
            <p className="text-sm text-muted-foreground">
              {t('settings.temperatureDescription')}
            </p>
          </div>

          {/* Max Tokens Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxTokens">{t('settings.maxTokens')}</Label>
              <span className="text-sm text-muted-foreground">{settings.maxTokens} tokens</span>
            </div>
            <Slider
              id="maxTokens"
              min={100}
              max={4000}
              step={100}
              value={[settings.maxTokens || 2000]}
              onValueChange={(value) => setSettings({ ...settings, maxTokens: value[0] })}
              data-testid="slider-maxtokens"
            />
            <p className="text-sm text-muted-foreground">
              {t('settings.maxTokensDescription')}
            </p>
          </div>

          {/* Response Style */}
          <div className="space-y-2">
            <Label htmlFor="responseStyle">{t('settings.responseStyle')}</Label>
            <Select
              value={settings.responseStyle}
              onValueChange={(value) => setSettings({ ...settings, responseStyle: value as any })}
            >
              <SelectTrigger id="responseStyle" data-testid="select-response-style">
                <SelectValue placeholder={t('settings.responseStyle')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">{t('settings.responseStyles.concise')}</SelectItem>
                <SelectItem value="balanced">{t('settings.responseStyles.balanced')}</SelectItem>
                <SelectItem value="detailed">{t('settings.responseStyles.detailed')}</SelectItem>
                <SelectItem value="comprehensive">{t('settings.responseStyles.comprehensive')}</SelectItem>
                <SelectItem value="bullet-points">{t('settings.responseStyles.bulletPoints')}</SelectItem>
                <SelectItem value="step-by-step">{t('settings.responseStyles.stepByStep')}</SelectItem>
                <SelectItem value="narrative">{t('settings.responseStyles.narrative')}</SelectItem>
                <SelectItem value="dramatic">{t('settings.responseStyles.dramatic')}</SelectItem>
                <SelectItem value="immersive">{t('settings.responseStyles.immersive')}</SelectItem>
                <SelectItem value="action-packed">{t('settings.responseStyles.actionPacked')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t('settings.responseStyleDescription')}
            </p>
          </div>

          {/* Conversation Style */}
          <div className="space-y-2">
            <Label htmlFor="conversationStyle">{t('settings.conversationStyle')}</Label>
            <Select
              value={settings.conversationStyle}
              onValueChange={(value) => setSettings({ ...settings, conversationStyle: value as any })}
            >
              <SelectTrigger id="conversationStyle" data-testid="select-conversation-style">
                <SelectValue placeholder={t('settings.conversationStyle')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">{t('settings.conversationStyles.professional')}</SelectItem>
                <SelectItem value="casual">{t('settings.conversationStyles.casual')}</SelectItem>
                <SelectItem value="friendly">{t('settings.conversationStyles.friendly')}</SelectItem>
                <SelectItem value="technical">{t('settings.conversationStyles.technical')}</SelectItem>
                <SelectItem value="enthusiastic">{t('settings.conversationStyles.enthusiastic')}</SelectItem>
                <SelectItem value="witty">{t('settings.conversationStyles.witty')}</SelectItem>
                <SelectItem value="empathetic">{t('settings.conversationStyles.empathetic')}</SelectItem>
                <SelectItem value="academic">{t('settings.conversationStyles.academic')}</SelectItem>
                <SelectItem value="socratic">{t('settings.conversationStyles.socratic')}</SelectItem>
                <SelectItem value="playful">{t('settings.conversationStyles.playful')}</SelectItem>
                <SelectItem value="adventurous">{t('settings.conversationStyles.adventurous')}</SelectItem>
                <SelectItem value="sarcastic">{t('settings.conversationStyles.sarcastic')}</SelectItem>
                <SelectItem value="flirtatious">{t('settings.conversationStyles.flirtatious')}</SelectItem>
                <SelectItem value="mysterious">{t('settings.conversationStyles.mysterious')}</SelectItem>
                <SelectItem value="dramatic">{t('settings.conversationStyles.dramatic')}</SelectItem>
                <SelectItem value="comedic">{t('settings.conversationStyles.comedic')}</SelectItem>
                <SelectItem value="edgy">{t('settings.conversationStyles.edgy')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t('settings.conversationStyleDescription')}
            </p>
          </div>

          {/* Custom Personality */}
          <div className="space-y-2">
            <Label htmlFor="customPersonality">{t('settings.customPersonality')}</Label>
            <Textarea
              id="customPersonality"
              placeholder={t('settings.customPersonalityPlaceholder')}
              value={settings.customPersonality}
              onChange={(e) => setSettings({ ...settings, customPersonality: e.target.value })}
              rows={4}
              maxLength={10000}
              data-testid="textarea-custom-personality"
            />
            <p className="text-sm text-muted-foreground">
              {t('settings.customPersonalityDescription')} ({settings.customPersonality?.length || 0}/10000)
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={saveSettings}
          disabled={isSaving}
          data-testid="button-save-settings"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('worlds.saving')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t('settings.saveSettings')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
