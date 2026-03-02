"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface SlideInProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    direction?: "left" | "right" | "up" | "down";
    duration?: number;
    disabled?: boolean;
}

export function SlideIn({ children, className, delay = 0, direction = "left", duration = 0.5, disabled = false }: SlideInProps) {
    const initialPosition = {
        left: { x: -100, opacity: 0 },
        right: { x: 100, opacity: 0 },
        up: { y: -100, opacity: 0 },
        down: { y: 100, opacity: 0 },
    };

    return (
        <motion.div
            initial={disabled ? false : initialPosition[direction]}
            animate={disabled ? { x: 0, y: 0, opacity: 1 } : undefined}
            whileInView={disabled ? undefined : { x: 0, y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
