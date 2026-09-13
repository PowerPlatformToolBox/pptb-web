import { redirect } from "next/navigation";

// Alumni content now lives on the dedicated Team page; keep this route alive for old links.
export default function ProjectAlumniRedirectPage() {
    redirect("/team#alumni");
}
