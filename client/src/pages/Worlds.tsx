import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Loader2, Plus, Trash2, Settings, Edit } from "lucide-react";
import type { World, InsertWorld } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

type WorldsProps = {
  userId: string;
  userEmail: string;
};

export default function Worlds({ userId, userEmail }: WorldsProps) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorld, setEditingWorld] = useState<World | null>(null);
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
        title: "Success",
        description: "World created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create world",
        variant: "destructive",
      });
    },
  });

  // Update world mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<World> }) => {
      return apiRequest("PUT", `/api/worlds/${id}`, { ...data, userId, email: userEmail });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/worlds", userId] });
      setEditingWorld(null);
      resetForm();
      toast({
        title: "Success",
        description: "World updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update world",
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
        title: "Success",
        description: "World deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete world",
        variant: "destructive",
      });
    },
  });

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
        title: "Error",
        description: "World name is required",
        variant: "destructive",
      });
      return;
    }

    // Validate world name - only letters, numbers, dash, underscore, and spaces allowed
    const validNamePattern = /^[a-zA-Z0-9_\- ]+$/;
    if (!validNamePattern.test(formData.name)) {
      toast({
        title: "Error",
        description: "World name can only contain letters, numbers, dashes, underscores, and spaces",
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
        title: "Error",
        description: "A world with this name already exists. Please choose a different name.",
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
        title: "Error",
        description: "World name is required",
        variant: "destructive",
      });
      return;
    }

    // Validate world name - only letters, numbers, dash, underscore, and spaces allowed
    const validNamePattern = /^[a-zA-Z0-9_\- ]+$/;
    if (!validNamePattern.test(formData.name)) {
      toast({
        title: "Error",
        description: "World name can only contain letters, numbers, dashes, underscores, and spaces",
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
        title: "Error",
        description: "A world with this name already exists. Please choose a different name.",
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
    if (confirm("Are you sure you want to delete this world? This cannot be undone.")) {
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
            <h1 className="text-3xl font-bold">Worlds</h1>
            <p className="text-muted-foreground mt-1">
              Create separate chat contexts with unique AI personalities and settings
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            data-testid="button-create-world"
          >
            <Plus className="w-4 h-4 mr-2" />
            New World
          </Button>
        </div>

        {worlds.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No worlds yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first world to get started with custom AI personalities
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create World
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {worlds.map((world) => (
              <Card key={world.id} data-testid={`card-world-${world.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{world.name}</span>
                  </CardTitle>
                  {world.description && (
                    <CardDescription>{world.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-medium">{world.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temperature:</span>
                    <span className="font-medium">{world.temperature.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Response Style:</span>
                    <span className="font-medium capitalize">{world.responseStyle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conversation Style:</span>
                    <span className="font-medium capitalize">{world.conversationStyle}</span>
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
                    Edit
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
                {editingWorld ? "Edit World" : "Create New World"}
              </DialogTitle>
              <DialogDescription>
                Configure the AI personality and behavior for this world
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">World Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Coding Assistant, Creative Writer, Math Tutor"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-world-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What makes this world unique?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  data-testid="textarea-world-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">AI Model</Label>
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
                  <Label htmlFor="temperature">Temperature</Label>
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
                  Lower = more focused, Higher = more creative
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="maxTokens">Max Response Length</Label>
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
                <Label htmlFor="responseStyle">Response Style</Label>
                <Select
                  value={formData.responseStyle}
                  onValueChange={(value) => setFormData({ ...formData, responseStyle: value as any })}
                >
                  <SelectTrigger id="responseStyle" data-testid="select-world-response-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise - Brief, to-the-point</SelectItem>
                    <SelectItem value="balanced">Balanced - Clear, moderate</SelectItem>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="conversationStyle">Conversation Style</Label>
                <Select
                  value={formData.conversationStyle}
                  onValueChange={(value) => setFormData({ ...formData, conversationStyle: value as any })}
                >
                  <SelectTrigger id="conversationStyle" data-testid="select-world-conversation-style">
                    <SelectValue />
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="customPersonality">Custom Personality / Instructions</Label>
                <Textarea
                  id="customPersonality"
                  placeholder="e.g., You are a helpful coding assistant who explains concepts with examples..."
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
                <Label htmlFor="characters">Characters</Label>
                <Textarea
                  id="characters"
                  placeholder="Describe the characters in this world..."
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
                <Label htmlFor="events">Events</Label>
                <Textarea
                  id="events"
                  placeholder="Describe important events or timeline..."
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
                <Label htmlFor="scenario">Scenario</Label>
                <Textarea
                  id="scenario"
                  placeholder="Describe the scenario or context..."
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
                <Label htmlFor="places">Places</Label>
                <Textarea
                  id="places"
                  placeholder="Describe locations and settings..."
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
                <Label htmlFor="additionalSettings">Additional Settings</Label>
                <Textarea
                  id="additionalSettings"
                  placeholder="Any other settings or notes..."
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
                Cancel
              </Button>
              <Button
                onClick={editingWorld ? handleUpdate : handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-world"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingWorld ? "Update World" : "Create World"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
