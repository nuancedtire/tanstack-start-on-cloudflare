import * as React from "react";
import { motion, type Variants, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

// Animation variants for staggered children
export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
};

export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24,
        },
    },
};

// Fade animations
export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { duration: 0.5, ease: "easeOut" },
    },
};

export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
        },
    },
};

export const fadeInDown: Variants = {
    hidden: { opacity: 0, y: -20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
        },
    },
};

// Scale animations
export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: {
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 25,
        },
    },
};

// Interactive hover/tap animations
export const hoverScale = {
    scale: 1.005,
    transition: { type: "spring", stiffness: 400, damping: 20 },
};

export const tapScale = {
    scale: 0.995,
};

export const hoverLift = {
    y: -2,
    boxShadow: "0 10px 20px -10px rgba(0, 0, 0, 0.05)",
    transition: { type: "spring", stiffness: 400, damping: 20 },
};

// Motion components
interface MotionDivProps extends HTMLMotionProps<"div"> {
    className?: string;
    children?: React.ReactNode;
}

export function MotionDiv({ className, children, ...props }: MotionDivProps) {
    return (
        <motion.div className={cn(className)} {...props}>
            {children}
        </motion.div>
    );
}

// Animated container with stagger effect
interface AnimatedContainerProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export function AnimatedContainer({
    children,
    className,
    delay = 0,
}: AnimatedContainerProps) {
    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={{
                hidden: { opacity: 0 },
                show: {
                    opacity: 1,
                    transition: {
                        staggerChildren: 0.1,
                        delayChildren: delay,
                    },
                },
            }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
}

// Animated item for use within AnimatedContainer
interface AnimatedItemProps {
    children: React.ReactNode;
    className?: string;
}

export function AnimatedItem({ children, className }: AnimatedItemProps) {
    return (
        <motion.div variants={staggerItem} className={cn(className)}>
            {children}
        </motion.div>
    );
}

// Fade in on scroll/viewport
interface FadeInViewProps {
    children: React.ReactNode;
    className?: string;
    direction?: "up" | "down" | "left" | "right" | "none";
    delay?: number;
    duration?: number;
    once?: boolean;
}

export function FadeInView({
    children,
    className,
    direction = "up",
    delay = 0,
    duration = 0.5,
    once = true,
}: FadeInViewProps) {
    const directionValues = {
        up: { y: 20 },
        down: { y: -20 },
        left: { x: 20 },
        right: { x: -20 },
        none: {},
    };

    return (
        <motion.div
            initial={{ opacity: 0, ...directionValues[direction] }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once, margin: "-50px" }}
            transition={{
                duration,
                delay,
                ease: [0.25, 0.4, 0.25, 1],
            }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
}

// Hover card with premium hover effect
interface HoverCardProps {
    children: React.ReactNode;
    className?: string;
}

export function HoverCard({ children, className }: HoverCardProps) {
    return (
        <motion.div
            whileHover={hoverLift as any}
            whileTap={tapScale}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
}

// Animated counter for metrics
interface AnimatedCounterProps {
    value: number;
    suffix?: string;
    className?: string;
}

export function AnimatedCounter({
    value,
    suffix = "",
    className,
}: AnimatedCounterProps) {
    return (
        <motion.span
            className={cn(className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={value}
        >
            <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {value}
                {suffix}
            </motion.span>
        </motion.span>
    );
}

// Animated progress bar
interface AnimatedProgressProps {
    value: number;
    className?: string;
    indicatorClassName?: string;
}

export function AnimatedProgress({
    value,
    className,
    indicatorClassName,
}: AnimatedProgressProps) {
    return (
        <div
            className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
        >
            <motion.div
                className={cn("h-full rounded-full bg-primary", indicatorClassName)}
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1], delay: 0.2 }}
            />
        </div>
    );
}

// Pulsing dot indicator
interface PulsingDotProps {
    color?: "success" | "warning" | "error" | "info";
    className?: string;
}

export function PulsingDot({ color = "success", className }: PulsingDotProps) {
    const colors = {
        success: "bg-emerald-500",
        warning: "bg-amber-500",
        error: "bg-rose-500",
        info: "bg-blue-500",
    };

    return (
        <span className={cn("relative flex h-2 w-2", className)}>
            <motion.span
                animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                    colors[color]
                )}
            />
            <span
                className={cn("relative inline-flex h-2 w-2 rounded-full", colors[color])}
            />
        </span>
    );
}

// Floating element animation
interface FloatingElementProps {
    children: React.ReactNode;
    className?: string;
    duration?: number;
    distance?: number;
    delay?: number;
}

export function FloatingElement({
    children,
    className,
    duration = 6,
    distance = 10,
    delay = 0,
}: FloatingElementProps) {
    return (
        <motion.div
            animate={{ y: [0, -distance, 0] }}
            transition={{
                duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay,
            }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
}

