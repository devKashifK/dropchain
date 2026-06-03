import { useApp } from "../context/AppContext";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function ApiErrorDialog() {
  const { authError, clearAuthError, revertToDefaultKey } = useApp();

  const handleRevert = () => {
    revertToDefaultKey();
  };

  return (
    <Dialog open={!!authError} onOpenChange={(open) => !open && clearAuthError()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-full text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl text-destructive">Authentication Failed</DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="text-sm mt-4 text-foreground leading-relaxed">
          The API provider rejected the request. This usually happens if your custom API key is invalid, expired, or doesn't have the required permissions.
        </DialogDescription>
        
        <div className="mt-4 p-3 bg-muted rounded-md text-xs font-mono text-muted-foreground break-words border border-border">
          {authError}
        </div>

        <DialogFooter className="mt-6 sm:justify-between flex-row">
          <Button variant="outline" onClick={clearAuthError} className="cursor-pointer">
            Dismiss
          </Button>
          <Button variant="default" onClick={handleRevert} className="cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground">
            Use Default Server Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
