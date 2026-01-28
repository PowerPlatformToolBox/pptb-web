import Link from "next/link";

import { Container } from "@/components/Container";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import discordLogo from "@/images/logos/discord.png";
import githubLogo from "@/images/logos/github.png";
import linkedinLogo from "@/images/logos/linkedin.png";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="bg-slate-50">
            <Container>
                <div className="py-16">
                    <Logo className="mx-auto h-10 w-auto" alt="PPTB" />
                    <nav className="mt-10 text-sm" aria-label="quick links">
                        <div className="-my-1 flex justify-center gap-x-6">
                            <NavLink href="#features">Features</NavLink>
                            <NavLink href="#faq">FAQs</NavLink>
                            <NavLink href="/security">Security</NavLink>
                            <NavLink href="/policy/privacy">Privacy Policy</NavLink>
                            <NavLink href="/policy/terms">Terms of Service</NavLink>
                        </div>
                    </nav>
                </div>
                <div className="flex flex-col items-center border-t border-slate-400/10 py-10 sm:flex-row-reverse sm:justify-between">
                    <div className="flex gap-x-6">
                        <Link href="https://www.linkedin.com/company/power-platform-toolbox" target="_blank" rel="noopener noreferrer" className="group" aria-label="PPTB on LinkedIn">
                            <Image src={linkedinLogo} alt="LinkedIn Logo" width={24} height={24} className="h-6 w-6 fill-slate-500 group-hover:fill-slate-700" />
                        </Link>
                        <Link href="https://github.com/PowerPlatformToolBox" target="_blank" rel="noopener noreferrer" className="group" aria-label="PPTB on GitHub">
                            <Image src={githubLogo} alt="GitHub Logo" width={24} height={24} className="h-6 w-6 fill-slate-500 group-hover:fill-slate-700" />
                        </Link>
                        <Link href="https://discord.gg/efwAu9sXyJ" target="_blank" rel="noopener noreferrer" className="group" aria-label="PPTB on Discord">
                            <Image src={discordLogo} alt="Discord Logo" width={24} height={24} className="h-6 w-6 fill-slate-500 group-hover:fill-slate-700" />
                        </Link>
                    </div>
                    <p className="mt-6 text-sm text-slate-500 sm:mt-0">Copyright &copy; {new Date().getFullYear()} Power Platform ToolBox. All rights reserved.</p>
                </div>
            </Container>
        </footer>
    );
}
