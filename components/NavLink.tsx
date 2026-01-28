import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

type NavLinkProps = {
    href: string;
    children: ReactNode;
    className?: string;
};

export function NavLink({ href, children, className }: NavLinkProps) {
    return (
        <Link
            href={href}
            className={clsx("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100/80 hover:text-slate-900", className)}
        >
            {children}
        </Link>
    );
}
