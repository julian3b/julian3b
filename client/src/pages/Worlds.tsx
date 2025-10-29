import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Settings, Edit, Sparkles } from "lucide-react";
import type { World, InsertWorld } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

type WorldsProps = {
  userId: string;
  userEmail: string;
  onWorldClick?: (worldId: string) => void;
};

export default function Worlds({ userId, userEmail, onWorldClick }: WorldsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorld, setEditingWorld] = useState<World | null>(null);
  const [worldSummaries, setWorldSummaries] = useState<Record<string, { lastSummary: string | null }>>({});
  const [formData, setFormData] = useState<Partial<InsertWorld>>({
    userId,
    name: "",
    description: "",
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 2000,
    responseStyle: "balanced",
    conversationStyle: "friendly",
    customPersonality: "",
    characters: "",
    events: "",
    scenario: "",
    places: "",
    additionalSettings: "",
  });

  // Fetch worlds
  const { data: worldsData, isLoading } = useQuery<{ ok: boolean; worlds: World[] }>({
    queryKey: ["/api/worlds", userId],
    queryFn: async () => {
      const response = await fetch(`/api/worlds?userId=${userId}&email=${encodeURIComponent(userEmail)}`);
      if (!response.ok) throw new Error("Failed to fetch worlds");
      return response.json();
    },
  });

  // Create world mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertWorld) => {
      return apiRequest("POST", "/api/worlds", { ...data, email: userEmail });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/worlds", userId] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: t("common.success"),
        description: t("worlds.createSuccess"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("worlds.createSuccess"),
        variant: "destructive",
      });
    },
  });

  // Update world mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<World> }) => {
      return apiRequest("PUT", `/api/worlds/${id}`, { ...data, userId, email: userEmail });
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/worlds", userId] });
      
      // Snapshot previous value
      const previousWorlds = queryClient.getQueryData(["/api/worlds", userId]);
      
      // Optimistically update the cache
      queryClient.setQueryData(["/api/worlds", userId], (old: any) => {
        if (!old?.worlds) return old;
        return {
          ...old,
          worlds: old.worlds.map((w: World) =>
            w.id === id ? { ...w, ...data } : w
          ),
        };
      });
      
      return { previousWorlds };
    },
    onSuccess: () => {
      // Invalidate to refetch in background (will confirm the optimistic update)
      queryClient.invalidateQueries({ queryKey: ["/api/worlds", userId] });
      setEditingWorld(null);
      resetForm();
      toast({
        title: t("common.success"),
        description: t("worlds.updateSuccess"),
      });
    },
    onError: (error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousWorlds) {
        queryClient.setQueryData(["/api/worlds", userId], context.previousWorlds);
      }
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("worlds.updateSuccess"),
        variant: "destructive",
      });
    },
  });

  // Delete world mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/worlds/${id}?email=${encodeURIComponent(userEmail)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/worlds", userId] });
      toast({
        title: t("common.success"),
        description: t("worlds.deleteSuccess"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("worlds.deleteSuccess"),
        variant: "destructive",
      });
    },
  });

  // Create summary mutation
  const createSummaryMutation = useMutation({
    mutationFn: async (worldId: string) => {
      const response = await fetch(`/api/worlds/${worldId}/summaries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });
      if (!response.ok) throw new Error("Failed to create summary");
      return response.json();
    },
    onSuccess: (data, worldId) => {
      toast({
        title: t("common.success"),
        description: t("worlds.summarySuccess"),
      });
      // Delay refetch to allow Azure to process
      setTimeout(() => {
        fetchWorldSummaries(worldId);
      }, 500);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("worlds.summaryError"),
        variant: "destructive",
      });
    },
  });

  // Fetch summaries for a specific world
  const fetchWorldSummaries = async (worldId: string) => {
    try {
      const response = await fetch(`/api/worlds/${worldId}/summaries?email=${encodeURIComponent(userEmail)}`);
      if (!response.ok) {
        console.error(`Failed to fetch summaries for world ${worldId}`);
        return;
      }
      const data = await response.json();
      
      // Extract last summary date from the response
      // Assuming the response has a 'summaries' array with items that have a 'createdUtc' field
      let lastSummary = null;
      if (data.summaries && data.summaries.length > 0) {
        // Sort by date and get the most recent
        const sortedSummaries = [...data.summaries].sort((a, b) => 
          new Date(b.createdUtc || 0).getTime() - new Date(a.createdUtc || 0).getTime()
        );
        lastSummary = sortedSummaries[0].createdUtc;
      }
      
      setWorldSummaries(prev => ({
        ...prev,
        [worldId]: { lastSummary }
      }));
    } catch (error) {
      console.error(`Error fetching summaries for world ${worldId}:`, error);
    }
  };

  // Fetch summaries for all worlds when they're loaded
  useEffect(() => {
    const worldsList = worldsData?.worlds || [];
    if (worldsList.length > 0) {
      worldsList.forEach(world => {
        fetchWorldSummaries(world.id);
      });
    }
  }, [worldsData?.worlds?.length]); // Only refetch when the number of worlds changes

  const resetForm = () => {
    setFormData({
      userId,
      name: "",
      description: "",
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 2000,
      responseStyle: "balanced",
      conversationStyle: "friendly",
      customPersonality: "",
      characters: "",
      events: "",
      scenario: "",
      places: "",
      additionalSettings: "",
    });
  };

  const handleCreate = () => {
    if (!formData.name) {
      toast({
        title: t("common.error"),
        description: t("worlds.worldNameRequired"),
        variant: "destructive",
      });
      return;
    }

    // Validate world name - only letters, numbers, dash, underscore, and spaces allowed
    const validNamePattern = /^[a-zA-Z0-9_\- ]+$/;
    if (!validNamePattern.test(formData.name)) {
      toast({
        title: t("common.error"),
        description: t("worlds.worldNameInvalid"),
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate world name
    const duplicateName = worlds.some(
      (world) => world.name.toLowerCase() === formData.name!.toLowerCase()
    );

    if (duplicateName) {
      toast({
        title: t("common.error"),
        description: t("worlds.worldNameInvalid"),
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData as InsertWorld);
  };

  const handleUpdate = () => {
    if (!editingWorld) return;

    if (!formData.name) {
      toast({
        title: t("common.error"),
        description: t("worlds.worldNameRequired"),
        variant: "destructive",
      });
      return;
    }

    // Validate world name - only letters, numbers, dash, underscore, and spaces allowed
    const validNamePattern = /^[a-zA-Z0-9_\- ]+$/;
    if (!validNamePattern.test(formData.name)) {
      toast({
        title: t("common.error"),
        description: t("worlds.worldNameInvalid"),
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate world name (excluding the current world being edited)
    const duplicateName = worlds.some(
      (world) => 
        world.id !== editingWorld.id && 
        world.name.toLowerCase() === formData.name!.toLowerCase()
    );

    if (duplicateName) {
      toast({
        title: t("common.error"),
        description: t("worlds.worldNameInvalid"),
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      id: editingWorld.id,
      data: formData,
    });
  };

  const handleEdit = (world: World) => {
    setEditingWorld(world);
    setFormData({
      userId: world.userId,
      name: world.name,
      description: world.description,
      model: world.model,
      temperature: world.temperature,
      maxTokens: world.maxTokens,
      responseStyle: world.responseStyle,
      conversationStyle: world.conversationStyle,
      customPersonality: world.customPersonality,
      characters: world.characters,
      events: world.events,
      scenario: world.scenario,
      places: world.places,
      additionalSettings: world.additionalSettings,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm(t("worlds.deleteConfirm"))) {
      deleteMutation.mutate(id);
    }
  };

  const worlds = worldsData?.worlds || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("worlds.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("worlds.subtitle")}
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            data-testid="button-create-world"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("worlds.createWorld")}
          </Button>
        </div>

        {worlds.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("worlds.noWorlds")}</h3>
              <p className="text-muted-foreground text-center mb-4">
                {t("worlds.noWorldsDescription")}
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("worlds.createWorld")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {worlds.map((world) => (
              <Card key={world.id} data-testid={`card-world-${world.id}`}>
                <CardHeader 
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => onWorldClick?.(world.id)}
                  data-testid={`header-world-${world.id}`}
                >
                  <CardTitle className="flex items-center justify-between">
                    <span>{world.name}</span>
                  </CardTitle>
                  {world.description && (
                    <CardDescription>{world.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("worlds.model")}:</span>
                    <span className="font-medium">{world.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("worlds.temperature")}:</span>
                    <span className="font-medium">{world.temperature.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("worlds.responseStyle")}:</span>
                    <span className="font-medium capitalize">{world.responseStyle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("worlds.conversationStyle")}:</span>
                    <span className="font-medium capitalize">{world.conversationStyle}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground text-xs">{t("worlds.lastSummary")}:</span>
                    <span className="font-medium text-xs" data-testid={`text-last-summary-${world.id}`}>
                      {worldSummaries[world.id]?.lastSummary 
                        ? new Date(worldSummaries[world.id].lastSummary!).toLocaleDateString()
                        : t("worlds.never")}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(world)}
                    data-testid={`button-edit-world-${world.id}`}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {t("worlds.edit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => createSummaryMutation.mutate(world.id)}
                    disabled={createSummaryMutation.isPending}
                    data-testid={`button-summarize-world-${world.id}`}
                  >
                    {createSummaryMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {t("worlds.summarize")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(world.id)}
                    data-testid={`button-delete-world-${world.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog
          open={isCreateOpen || editingWorld !== null}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditingWorld(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWorld ? t("worlds.editWorld") : t("worlds.createWorld")}
              </DialogTitle>
              <DialogDescription>
                {t("worlds.subtitle")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("worlds.worldName")} *</Label>
                <Input
                  id="name"
                  placeholder={t("worlds.worldNamePlaceholder")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-world-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("worlds.description")}</Label>
                <Textarea
                  id="description"
                  placeholder={t("worlds.descriptionPlaceholder")}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  data-testid="textarea-world-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">{t("worlds.model")}</Label>
                <Select
                  value={formData.model}
                  onValueChange={(value) => setFormData({ ...formData, model: value as any })}
                >
                  <SelectTrigger id="model" data-testid="select-world-model">
                    <SelectValue />
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
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">{t("worlds.temperature")}</Label>
                  <span className="text-sm text-muted-foreground">{formData.temperature?.toFixed(1)}</span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[formData.temperature || 0.7]}
                  onValueChange={(value) => setFormData({ ...formData, temperature: value[0] })}
                  data-testid="slider-world-temperature"
                />
                <p className="text-sm text-muted-foreground">
                  {t("settings.temperatureDescription")}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="maxTokens">{t("worlds.maxTokens")}</Label>
                  <span className="text-sm text-muted-foreground">{formData.maxTokens} tokens</span>
                </div>
                <Slider
                  id="maxTokens"
                  min={100}
                  max={4000}
                  step={100}
                  value={[formData.maxTokens || 2000]}
                  onValueChange={(value) => setFormData({ ...formData, maxTokens: value[0] })}
                  data-testid="slider-world-maxtokens"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responseStyle">{t("worlds.responseStyle")}</Label>
                <Select
                  value={formData.responseStyle}
                  onValueChange={(value) => setFormData({ ...formData, responseStyle: value as any })}
                >
                  <SelectTrigger id="responseStyle" data-testid="select-world-response-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">{t('worlds.responseStyles.concise')}</SelectItem>
                    <SelectItem value="balanced">{t('worlds.responseStyles.balanced')}</SelectItem>
                    <SelectItem value="detailed">{t('worlds.responseStyles.detailed')}</SelectItem>
                    <SelectItem value="comprehensive">{t('worlds.responseStyles.comprehensive')}</SelectItem>
                    <SelectItem value="bullet-points">{t('worlds.responseStyles.bulletPoints')}</SelectItem>
                    <SelectItem value="step-by-step">{t('worlds.responseStyles.stepByStep')}</SelectItem>
                    <SelectItem value="narrative">{t('worlds.responseStyles.narrative')}</SelectItem>
                    <SelectItem value="dramatic">{t('worlds.responseStyles.dramatic')}</SelectItem>
                    <SelectItem value="immersive">{t('worlds.responseStyles.immersive')}</SelectItem>
                    <SelectItem value="action-packed">{t('worlds.responseStyles.actionPacked')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conversationStyle">{t("worlds.conversationStyle")}</Label>
                <Select
                  value={formData.conversationStyle}
                  onValueChange={(value) => setFormData({ ...formData, conversationStyle: value as any })}
                >
                  <SelectTrigger id="conversationStyle" data-testid="select-world-conversation-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">{t('worlds.conversationStyles.professional')}</SelectItem>
                    <SelectItem value="casual">{t('worlds.conversationStyles.casual')}</SelectItem>
                    <SelectItem value="friendly">{t('worlds.conversationStyles.friendly')}</SelectItem>
                    <SelectItem value="technical">{t('worlds.conversationStyles.technical')}</SelectItem>
                    <SelectItem value="enthusiastic">{t('worlds.conversationStyles.enthusiastic')}</SelectItem>
                    <SelectItem value="witty">{t('worlds.conversationStyles.witty')}</SelectItem>
                    <SelectItem value="empathetic">{t('worlds.conversationStyles.empathetic')}</SelectItem>
                    <SelectItem value="academic">{t('worlds.conversationStyles.academic')}</SelectItem>
                    <SelectItem value="socratic">{t('worlds.conversationStyles.socratic')}</SelectItem>
                    <SelectItem value="playful">{t('worlds.conversationStyles.playful')}</SelectItem>
                    <SelectItem value="adventurous">{t('worlds.conversationStyles.adventurous')}</SelectItem>
                    <SelectItem value="sarcastic">{t('worlds.conversationStyles.sarcastic')}</SelectItem>
                    <SelectItem value="flirtatious">{t('worlds.conversationStyles.flirtatious')}</SelectItem>
                    <SelectItem value="mysterious">{t('worlds.conversationStyles.mysterious')}</SelectItem>
                    <SelectItem value="dramatic">{t('worlds.conversationStyles.dramatic')}</SelectItem>
                    <SelectItem value="comedic">{t('worlds.conversationStyles.comedic')}</SelectItem>
                    <SelectItem value="edgy">{t('worlds.conversationStyles.edgy')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customPersonality">{t("worlds.customPersonality")}</Label>
                <Textarea
                  id="customPersonality"
                  placeholder={t("worlds.customPersonalityPlaceholder")}
                  value={formData.customPersonality}
                  onChange={(e) => setFormData({ ...formData, customPersonality: e.target.value })}
                  rows={4}
                  maxLength={5000}
                  data-testid="textarea-world-custom-personality"
                />
                <p className="text-sm text-muted-foreground">
                  {formData.customPersonality?.length || 0}/5000
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="characters">{t("worlds.characters")}</Label>
                <Textarea
                  id="characters"
                  placeholder={t("worlds.charactersPlaceholder")}
                  value={formData.characters}
                  onChange={(e) => setFormData({ ...formData, characters: e.target.value })}
                  rows={3}
                  maxLength={5000}
                  data-testid="textarea-world-characters"
                />
                <p className="text-sm text-muted-foreground">
                  {formData.characters?.length || 0}/5000
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="events">{t("worlds.events")}</Label>
                <Textarea
                  id="events"
                  placeholder={t("worlds.eventsPlaceholder")}
                  value={formData.events}
                  onChange={(e) => setFormData({ ...formData, events: e.target.value })}
                  rows={3}
                  maxLength={5000}
                  data-testid="textarea-world-events"
                />
                <p className="text-sm text-muted-foreground">
                  {formData.events?.length || 0}/5000
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scenario">{t("worlds.scenario")}</Label>
                <Textarea
                  id="scenario"
                  placeholder={t("worlds.scenarioPlaceholder")}
                  value={formData.scenario}
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                  rows={3}
                  maxLength={5000}
                  data-testid="textarea-world-scenario"
                />
                <p className="text-sm text-muted-foreground">
                  {formData.scenario?.length || 0}/5000
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="places">{t("worlds.places")}</Label>
                <Textarea
                  id="places"
                  placeholder={t("worlds.placesPlaceholder")}
                  value={formData.places}
                  onChange={(e) => setFormData({ ...formData, places: e.target.value })}
                  rows={3}
                  maxLength={5000}
                  data-testid="textarea-world-places"
                />
                <p className="text-sm text-muted-foreground">
                  {formData.places?.length || 0}/5000
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalSettings">{t("worlds.additionalSettings")}</Label>
                <Textarea
                  id="additionalSettings"
                  placeholder={t("worlds.additionalSettingsPlaceholder")}
                  value={formData.additionalSettings}
                  onChange={(e) => setFormData({ ...formData, additionalSettings: e.target.value })}
                  rows={3}
                  maxLength={5000}
                  data-testid="textarea-world-additional-settings"
                />
                <p className="text-sm text-muted-foreground">
                  {formData.additionalSettings?.length || 0}/5000
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingWorld(null);
                  resetForm();
                }}
                data-testid="button-cancel-world"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={editingWorld ? handleUpdate : handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-world"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("worlds.saving")}
                  </>
                ) : (
                  editingWorld ? t("common.save") : t("worlds.createWorld")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
