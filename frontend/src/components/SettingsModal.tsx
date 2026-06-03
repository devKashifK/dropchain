import { useState } from "react";
import { Settings } from "lucide-react";
import { useApp, type ProviderType } from "../context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SettingsModal() {
  const { provider, setProvider, customApiKey, setCustomApiKey } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [localKey, setLocalKey] = useState(customApiKey);
  const [localProvider, setLocalProvider] = useState<ProviderType>(provider);

  const handleSave = () => {
    setProvider(localProvider);
    setCustomApiKey(localKey);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setLocalKey(customApiKey);
    setLocalProvider(provider);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button variant="outline" size="icon" className="rounded-full w-9 h-9  hover:bg-accent cursor-pointer">
          <Settings className="h-[1.2rem] w-[1.2rem] text-foreground" />
          <span className="sr-only">Open Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90%] max-w-sm sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Settings</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="provider">AI Provider</Label>
            <Select
              value={localProvider}
              onValueChange={(val) => { if (val) setLocalProvider(val as ProviderType); }}
            >
              <SelectTrigger id="provider" className="cursor-pointer">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini" className="cursor-pointer">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Note: Switching providers clears any currently ingested document due to dimension mismatch.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apikey">Custom API Key (Optional)</Label>
            <Input
              id="apikey"
              type="password"
              placeholder="Leave blank to use default server key"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your key is stored securely in your browser's local storage.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" onClick={handleCancel} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSave} className="cursor-pointer">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
