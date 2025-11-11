"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface StaggerChildrenProps {
    children: ReactNode;
    className?: string;
    staggerDelay?: number;
}

export function StaggerChildren({ children, className, staggerDelay = 0.1 }: StaggerChildrenProps) {
    return (
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} transition={{ staggerChildren: staggerDelay }} className={className}>
            {children}
        </motion.div>
    );
}

export const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 },
    },
};
