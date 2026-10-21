import { permanentRedirect } from "next/navigation";

export default function LegacyToolIdeasPage() {
    permanentRedirect("/ideas");
}
