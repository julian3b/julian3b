import { FileQuestion } from "lucide-react";

export function PlaceholderTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12">
      <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Custom Tab
      </h3>
      <p className="text-muted-foreground text-center max-w-md">
        This tab is ready for your content. You can add any features or information you need here.
      </p>
    </div>
  );
}
