import { VerificationRequestAdminEmail } from "./PPTBEmails";

export default function VerificationRequestAdminPreview() {
    return (
        <VerificationRequestAdminEmail
            toolName="Sample Power Platform Tool"
            description="A sample tool description for the verification review queue."
            submittedOn="August 29, 2026"
            submittedBy="Alex Developer (alex@example.com)"
        />
    );
}
