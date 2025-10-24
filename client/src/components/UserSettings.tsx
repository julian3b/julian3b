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
import { Loader2, Save } from "lucide-react";
import type { UserSettings } from "@shared/schema";

type UserSettingsProps = {
  userEmail: string;
};

export function UserSettings({ userEmail }: UserSettingsProps) {
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
        title: "Error",
        description: "Failed to load your settings. Using defaults.",
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
        title: "Success",
        description: "Your settings have been saved!",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save your settings. Please try again.",
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
      <div>
        <h3 className="text-lg font-semibold mb-4">AI Settings</h3>
        
        {/* Model Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select
              value={settings.model}
              onValueChange={(value) => setSettings({ ...settings, model: value as any })}
            >
              <SelectTrigger id="model" data-testid="select-model">
                <SelectValue placeholder="Select model" />
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
              <Label htmlFor="temperature">Temperature</Label>
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
              Lower = more focused, Higher = more creative
            </p>
          </div>

          {/* Max Tokens Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxTokens">Max Response Length</Label>
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
              Maximum length of AI responses
            </p>
          </div>

          {/* Response Style */}
          <div className="space-y-2">
            <Label htmlFor="responseStyle">Response Style</Label>
            <Select
              value={settings.responseStyle}
              onValueChange={(value) => setSettings({ ...settings, responseStyle: value as any })}
            >
              <SelectTrigger id="responseStyle" data-testid="select-response-style">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise - Brief, to-the-point answers</SelectItem>
                <SelectItem value="balanced">Balanced - Clear, moderate length</SelectItem>
                <SelectItem value="detailed">Detailed - Thorough explanations</SelectItem>
                <SelectItem value="comprehensive">Comprehensive - In-depth with examples</SelectItem>
                <SelectItem value="bullet-points">Bullet Points - Organized lists</SelectItem>
                <SelectItem value="step-by-step">Step-by-Step - Sequential instructions</SelectItem>
                <SelectItem value="narrative">Narrative - Storytelling style</SelectItem>
                <SelectItem value="dramatic">Dramatic - Theatrical and intense</SelectItem>
                <SelectItem value="immersive">Immersive - Deep, detailed roleplay</SelectItem>
                <SelectItem value="action-packed">Action-Packed - Fast-paced and exciting</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How the AI structures and formats responses
            </p>
          </div>

          {/* Conversation Style */}
          <div className="space-y-2">
            <Label htmlFor="conversationStyle">Conversation Style</Label>
            <Select
              value={settings.conversationStyle}
              onValueChange={(value) => setSettings({ ...settings, conversationStyle: value as any })}
            >
              <SelectTrigger id="conversationStyle" data-testid="select-conversation-style">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional - Formal and polished</SelectItem>
                <SelectItem value="casual">Casual - Relaxed and conversational</SelectItem>
                <SelectItem value="friendly">Friendly - Warm and approachable</SelectItem>
                <SelectItem value="technical">Technical - Precise and specialized</SelectItem>
                <SelectItem value="enthusiastic">Enthusiastic - Upbeat and encouraging</SelectItem>
                <SelectItem value="witty">Witty - Humorous and clever</SelectItem>
                <SelectItem value="empathetic">Empathetic - Supportive and understanding</SelectItem>
                <SelectItem value="academic">Academic - Scholarly and formal</SelectItem>
                <SelectItem value="socratic">Socratic - Questioning and thought-provoking</SelectItem>
                <SelectItem value="playful">Playful - Fun and lighthearted</SelectItem>
                <SelectItem value="adventurous">Adventurous - Bold and exciting</SelectItem>
                <SelectItem value="sarcastic">Sarcastic - Witty with edge</SelectItem>
                <SelectItem value="flirtatious">Flirtatious - Charming and romantic</SelectItem>
                <SelectItem value="mysterious">Mysterious - Enigmatic and intriguing</SelectItem>
                <SelectItem value="dramatic">Dramatic - Theatrical and expressive</SelectItem>
                <SelectItem value="comedic">Comedic - Focused on humor</SelectItem>
                <SelectItem value="edgy">Edgy - Bold and mature themes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The tone and personality of the AI
            </p>
          </div>

          {/* Custom Personality */}
          <div className="space-y-2">
            <Label htmlFor="customPersonality">Custom Personality / Instructions</Label>
            <Textarea
              id="customPersonality"
              placeholder="e.g., You are a helpful coding assistant who explains concepts with examples..."
              value={settings.customPersonality}
              onChange={(e) => setSettings({ ...settings, customPersonality: e.target.value })}
              rows={4}
              maxLength={5000}
              data-testid="textarea-custom-personality"
            />
            <p className="text-sm text-muted-foreground">
              Custom instructions to guide the AI's behavior ({settings.customPersonality?.length || 0}/5000)
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
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
