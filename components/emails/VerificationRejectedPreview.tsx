import { VerificationRejectedEmail } from "./PPTBEmails";

export default function VerificationRejectedPreview() {
    return (
        <VerificationRejectedEmail
            toolName="Sample Power Platform Tool"
            failedCriteria={[
                { label: "Documentation is incomplete", comment: "README is missing setup instructions." },
                { label: "The published package could not be verified", comment: null },
            ]}
        />
    );
}
