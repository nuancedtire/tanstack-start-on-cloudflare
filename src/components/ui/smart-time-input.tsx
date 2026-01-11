
import * as React from "react"
import { Clock, CalendarPlus, AlertCircle } from "lucide-react"
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

    return (
        <div className={cn("space-y-2", className)}>
            {label && <Label className={cn(status === "error" && "text-destructive")}>{label}</Label>}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Input
                        type="time"
                        value={timeStr}
                        onChange={handleTimeChange}
                        className={cn(
                            "pl-9 font-mono text-base transition-colors",
                            status === "error" && "border-destructive focus-visible:ring-destructive/30",
                            isNextDay && "text-purple-600 font-bold dark:text-purple-400"
                        )}
                    />
                    <Clock className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
                        isNextDay && "text-purple-500"
                    )} />
                </div>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant={isNextDay ? "default" : "outline"}
                                onClick={toggleNextDay}
                                className={cn(
                                    "px-3 font-mono text-xs transition-all h-10",
                                    isNextDay 
                                        ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <CalendarPlus className="w-3 h-3 mr-1.5" />
                                +1d
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Toggle next day (Overnight stay)</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            
            {status === "error" && (
                <p className="text-[10px] text-destructive flex items-center gap-1 animate-in slide-in-from-left-1">
                    <AlertCircle className="w-3 h-3" />
                    Time cannot be before arrival ({format(new Date(arrivalDate), "HH:mm")})
                </p>
            )}
        </div>
    )
}
