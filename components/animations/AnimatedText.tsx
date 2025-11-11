"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

type AnimatedTextProps = HTMLMotionProps<"h1"> & {
    text: string;
    className?: string;
    delay?: number;
    staggerDelay?: number;
};

export function AnimatedText({ text, className, delay = 0, staggerDelay = 0.03, ...props }: AnimatedTextProps) {
    const words = text.split(" ");

    const container = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: staggerDelay, delayChildren: delay * i },
        }),
    };

    const child = {
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                damping: 12,
                stiffness: 100,
            },
        },
        hidden: {
            opacity: 0,
            y: 20,
        },
    };

    return (
        <motion.h1 className={className} variants={container} initial="hidden" whileInView="visible" viewport={{ once: true }} {...props}>
            {words.map((word, index) => (
                <motion.span variants={child} key={index} style={{ marginRight: "0.25em", display: "inline-block" }}>
                    {word}
                </motion.span>
            ))}
        </motion.h1>
    );
}
