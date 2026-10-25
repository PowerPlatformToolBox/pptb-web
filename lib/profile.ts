export interface EditableProfile {
    name: string;
    linkedin_profile_url: string;
    discord_handle: string;
}

export const PROFILE_UPDATED_EVENT = "profile-updated";

export function hasDisplayName(name: string | null | undefined): boolean {
    return !!name?.trim() && !name.includes("@");
}

export function validateProfile(value: unknown): { profile: EditableProfile } | { error: string } {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { error: "Profile fields are required." };
    }
    const fields = Object.keys(value);
    if (fields.some((key) => !["name", "linkedin_profile_url", "discord_handle"].includes(key))) {
        return { error: "Only display name, LinkedIn URL, and Discord handle can be updated." };
    }
    if (!("name" in value) || typeof value.name !== "string"
        || !("linkedin_profile_url" in value) || typeof value.linkedin_profile_url !== "string"
        || !("discord_handle" in value) || typeof value.discord_handle !== "string") {
        return { error: "Profile fields must be text." };
    }
    const profile = {
        name: value.name.trim(),
        linkedin_profile_url: value.linkedin_profile_url.trim(),
        discord_handle: value.discord_handle.trim(),
    };
    if (!hasDisplayName(profile.name) || profile.name.length > 100 || /[\u0000-\u001f\u007f]/.test(profile.name)) {
        return { error: "Enter a display name of 1 to 100 characters without an email address or control characters." };
    }
    const linkedInProfileRegex = /^https:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_%~-]+\/?(?:\?.*)?$/i;
    if (profile.linkedin_profile_url && (profile.linkedin_profile_url.length > 500 || !linkedInProfileRegex.test(profile.linkedin_profile_url))) {
        return { error: "Enter a valid HTTPS LinkedIn profile URL, or leave it blank." };
    }
    if (profile.discord_handle.length > 100 || /[\u0000-\u001f\u007f]/.test(profile.discord_handle)) {
        return { error: "Discord handle must be 100 characters or fewer without control characters." };
    }
    return { profile };
}
