import { VerificationApprovedEmail } from "./PPTBEmails";

export default function VerificationApprovedPreview() {
    return (
        <VerificationApprovedEmail
            toolName="Sample Power Platform Tool"
            sections={[
                { label: "Documentation", comment: "README covers setup and usage clearly." },
                { label: "Security review", comment: null },
                { label: "Usage thresholds", comment: "Waived - no prior usage history." },
            ]}
        />
    );
}
