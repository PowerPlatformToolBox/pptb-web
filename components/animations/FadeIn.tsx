"use client";

import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

interface FadeInProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    direction?: "up" | "down" | "left" | "right";
    duration?: number;
}

const fadeInVariants: Variants = {
    hidden: (direction: string) => ({
        opacity: 0,
        y: direction === "up" ? 40 : direction === "down" ? -40 : 0,
        x: direction === "left" ? 40 : direction === "right" ? -40 : 0,
    }),
    visible: {
        opacity: 1,
        y: 0,
        x: 0,
    },
};

export function FadeIn({ children, className, delay = 0, direction = "up", duration = 0.5 }: FadeInProps) {
    return (
        <motion.div
            custom={direction}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration, delay }}
            variants={fadeInVariants}
            className={className}
        >
            {children}
        </motion.div>
    );
}
