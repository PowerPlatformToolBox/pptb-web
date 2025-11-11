"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface ScaleInProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
}

export function ScaleIn({ children, className, delay = 0, duration = 0.5 }: ScaleInProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
