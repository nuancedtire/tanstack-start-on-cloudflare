import * as React from "react"
import { Clock, CalendarPlus, AlertCircle, Check } from "lucide-react"
import { format, addDays, isBefore, isAfter, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SmartTimeInputProps {
    value?: string // Full ISO string
    arrivalDate: string // Full ISO string
    onChange: (isoString: string | undefined) => void
    label?: string
    className?: string
}

export function SmartTimeInput({ value, arrivalDate, onChange, label, className }: SmartTimeInputProps) {
    // Internal state for the HH:mm input
    const [timeStr, setTimeStr] = React.useState<string>("")
    const [isNextDay, setIsNextDay] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)

    // Sync internal state with props
    React.useEffect(() => {
        if (value) {
            const date = new Date(value)
            setTimeStr(format(date, "HH:mm"))

            // Check if it's the next day relative to arrival
            const arrival = new Date(arrivalDate)
            const valueDay = startOfDay(date)
            const arrivalDay = startOfDay(arrival)

            setIsNextDay(isAfter(valueDay, arrivalDay))
        } else {
            setTimeStr("")
            setIsNextDay(false)
        }
    }, [value, arrivalDate])

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value
        setTimeStr(newTime)
        updateIso(newTime, isNextDay)
    }

    const toggleNextDay = () => {
        const newNextDay = !isNextDay
        setIsNextDay(newNextDay)
        updateIso(timeStr, newNextDay)
    }

    const updateIso = (time: string, nextDay: boolean) => {
        if (!time) {
            onChange(undefined)
            return
        }

        try {
            const [hours, minutes] = time.split(":").map(Number)
            let date = new Date(arrivalDate)

            date.setHours(hours, minutes, 0, 0)

            if (nextDay) {
                date = addDays(date, 1)
            }
            // If not next day, it stays on arrival date. 
            // We do NOT auto-adjust here because the user might strictly mean "same calendar day" 
            // even if it looks like it's before (e.g. fixing a typo). 
            // The validation UI will warn them.

            onChange(date.toISOString())
        } catch (e) {
            console.error("Date construction error", e)
        }
    }

    // Validation status
    const getStatus = () => {
        if (!value) return "neutral"
        const current = new Date(value)
        const arrival = new Date(arrivalDate)

        // Allow a small buffer? No, strictly time shouldn't be before arrival.
        if (isBefore(current, arrival)) return "error"
        return "valid"
    }

    const status = getStatus()
    const isEmpty = !timeStr

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-end justify-between gap-2">
                {label && (
                    <Label className={cn("text-base font-semibold", status === "error" && "text-destructive")}>
                        {label}
                    </Label>
                )}
                <span className="text-xs text-muted-foreground/80 font-mono mb-0.5 text-right">
                    After: {format(new Date(arrivalDate), "HH:mm 'on' d MMM")}
                </span>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1 group">
                    {/* Placeholder Text Overlay - visible when empty and not focused */}
                    {isEmpty && !isFocused && (
                        <div className="absolute inset-0 flex items-center pl-12 pointer-events-none z-10">
                            <span className="text-muted-foreground/60 italic text-base font-medium">Not recorded</span>
                        </div>
                    )}

                    <Input
                        type="time"
                        value={timeStr}
                        onChange={handleTimeChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={cn(
                            "pl-12 pr-10 h-14 text-lg font-mono transition-all duration-200",
                            isEmpty && "border-dashed border-2 border-muted-foreground/25 bg-muted/5",
                            isEmpty && !isFocused && "text-transparent selection:text-transparent", // Hide native --:-- 

                            !isEmpty && "border-solid bg-background shadow-sm",
                            !isEmpty && status === "valid" && "border-input group-hover:border-primary/50 focus-visible:border-primary",

                            status === "error" && "border-destructive focus-visible:ring-destructive/30 bg-destructive/5 text-destructive",

                            isNextDay && "text-purple-600 font-bold dark:text-purple-400"
                        )}
                    />

                    <Clock className={cn(
                        "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200",
                        isEmpty ? "text-muted-foreground/40" : "text-muted-foreground",
                        isNextDay && "text-purple-500",
                        status === "error" && "text-destructive"
                    )} />

                    {!isEmpty && status !== "error" && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 animate-in fade-in zoom-in duration-200" />
                        </div>
                    )}
                    {!isEmpty && status === "error" && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <AlertCircle className="w-5 h-5 text-destructive animate-in fade-in zoom-in duration-200" />
                        </div>
                    )}
                </div>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant={isNextDay ? "default" : "outline"}
                                onClick={toggleNextDay}
                                className={cn(
                                    "h-14 px-3 min-w-[3.5rem] font-mono transition-all duration-200",
                                    isNextDay
                                        ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-md ring-2 ring-purple-600/20"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-muted-foreground/20 border-dashed hover:border-solid"
                                )}
                            >
                                <div className="flex flex-col items-center justify-center leading-none gap-0.5">
                                    <CalendarPlus className="w-4 h-4" />
                                    <span className="text-[10px] font-bold tracking-wider">+1d</span>
                                </div>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>Toggle next day (Overnight stay)</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {status === "error" && (
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 text-destructive animate-in slide-in-from-top-1 border border-destructive/10">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-sm font-medium">
                        Time cannot be before arrival ({format(new Date(arrivalDate), "HH:mm")})
                    </p>
                </div>
            )}
        </div>
    )
}
