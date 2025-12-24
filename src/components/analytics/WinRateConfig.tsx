
import React from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export interface WinRateSettings {
    includeFees: boolean;
    minPnlThreshold: number; // In USD, e.g. 1.0 means ignore trades with +/- $1 PnL
}

interface WinRateConfigProps {
    settings: WinRateSettings;
    onSettingsChange: (settings: WinRateSettings) => void;
}

export function WinRateConfig({ settings, onSettingsChange }: WinRateConfigProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                    <Settings2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Configure Win Rate</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Win Rate Configuration</h4>
                        <p className="text-sm text-muted-foreground">
                            Adjust how your win rate is calculated to filter out noise.
                        </p>
                    </div>

                    <div className="grid gap-4">
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="include-fees" className="flex flex-col gap-1">
                                <span>Include Fees</span>
                                <span className="font-normal text-xs text-muted-foreground">Count fees & funding in PnL</span>
                            </Label>
                            <Switch
                                id="include-fees"
                                checked={settings.includeFees}
                                onCheckedChange={(checked) => onSettingsChange({ ...settings, includeFees: checked })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="threshold">Dust Threshold ($)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="threshold"
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    className="h-8"
                                    value={settings.minPnlThreshold}
                                    onChange={(e) => onSettingsChange({ ...settings, minPnlThreshold: parseFloat(e.target.value) || 0 })}
                                />
                                <span className="text-xs text-muted-foreground">
                                    Ignore trades smaller than this amount (helps remove noise).
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
