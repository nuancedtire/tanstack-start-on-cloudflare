import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PinProtectionProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    title?: string;
    description?: string;
}

export function PinProtection({ open, onOpenChange, onSuccess, title = "Enter PIN", description = "This action requires authorization." }: PinProtectionProps) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);

    // Hardcoded simple PIN for now - in production this could be env var or server check
    // But user asked for "simple PIN auth"
    const CORRECT_PIN = "0000"; 

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (pin === CORRECT_PIN) {
            setError(false);
            setPin("");
            onSuccess();
            onOpenChange(false);
        } else {
            setError(true);
            setPin("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) setPin("");
            setError(false);
            onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-[350px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="Enter 4-digit PIN"
                            className="text-center text-2xl tracking-widest"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value);
                                setError(false);
                            }}
                            autoFocus
                        />
                        {error && <p className="text-xs text-red-500 text-center font-medium">Incorrect PIN</p>}
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="w-full">Verify</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
