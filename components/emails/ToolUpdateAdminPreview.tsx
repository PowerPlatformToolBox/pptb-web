import { ToolUpdateAdminEmail } from "./PPTBEmails";

export default function ToolUpdateAdminPreview() {
    return (
        <ToolUpdateAdminEmail
            toolName="Sample Power Platform Tool"
            version="1.2.0"
            validationErrors={["Manifest is missing a publisher", "Package contains an invalid icon"]}
            submittedBy="Alex Developer (alex@example.com)"
        />
    );
}
