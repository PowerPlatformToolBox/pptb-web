"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { Container } from "@/components/Container";
import { FadeIn, staggerItem } from "@/components/animations";
import backgroundImage from "@/images/background-faqs.jpg";

const faqs = [
    [
        {
            question: "What is Power Platform Tool Box (PPTB)?",
            answer: "PPTB is a modern, secure, and open-source toolbox for Power Platform makers, admins, and developers. It allows you to discover, run, and manage tools in a streamlined, isolated environment.",
        },
        {
            question: "Is PPTB free to use?",
            answer: "Yes! PPTB is completely free for everyone — no hidden fees or trial limits.",
        },
        {
            question: "Which platforms does PPTB support?",
            answer: "PPTB works seamlessly on Windows and macOS, with plans to expand further.",
        },
    ],
    [
        {
            question: "How do I connect PPTB to my Power Platform environment?",
            answer: "Connecting is simple using the interactive login prompt as the recommended approach. PPTB supports hassle-free connections, even with MFA enabled, so you can start using your tools immediately.",
        },
        {
            question: "Are my tools and data secure?",
            answer: "Absolutely. Each tool runs in isolation, ensuring that one plugin cannot affect another or access your sensitive data. Security is built-in from the ground up.",
        },
        {
            question: "How do I install or update tools?",
            answer: "Installation and updates are managed automatically within the PPTB environment, ensuring you always have the latest features and security patches.",
        },
    ],
    [
        {
            question: "Can PPTB handle large environments or multiple tenants?",
            answer: "Yes! PPTB is designed to work with any Power Platform environment, from small personal projects to large enterprise tenants.",
        },
        {
            question: "Can I export data from PPTB tools?",
            answer: "While PPTB focuses on running tools efficiently, most plugins provide their own export options like Excel, CSV, or Power BI compatibility depending on the tool.",
        },
        {
            question: "Where can I get support or report issues?",
            answer: "You can join our community Discord, check our GitHub repository, or contact our team directly for help and updates.",
        },
    ],
];

export function Faqs() {
    return (
        <section id="faq" aria-labelledby="faq-title" className="relative overflow-hidden bg-slate-50 py-20 sm:py-32">
            <Image className="absolute top-0 left-1/2 max-w-none translate-x-[-30%] -translate-y-1/4" src={backgroundImage} alt="" width={1558} height={946} unoptimized />
            <Container className="relative">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto max-w-2xl lg:mx-0">
                        <h2 id="faq-title" className="font-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
                            Frequently asked questions
                        </h2>
                        <p className="mt-4 text-lg tracking-tight text-slate-700">Can&apos;t find what you need? Head over to our GitHub Discussions — our community and team are there to help.</p>
                    </div>
                </FadeIn>
                <motion.ul
                    role="list"
                    className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={{
                        visible: {
                            transition: {
                                staggerChildren: 0.1,
                            },
                        },
                    }}
                >
                    {faqs.map((column, columnIndex) => (
                        <li key={columnIndex}>
                            <ul role="list" className="flex flex-col gap-y-8">
                                {column.map((faq, faqIndex) => (
                                    <motion.li key={faqIndex} variants={staggerItem}>
                                        <h3 className="font-display text-lg/7 text-slate-900">{faq.question}</h3>
                                        <p className="mt-4 text-sm text-slate-700">{faq.answer}</p>
                                    </motion.li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </motion.ul>
            </Container>
        </section>
    );
}
