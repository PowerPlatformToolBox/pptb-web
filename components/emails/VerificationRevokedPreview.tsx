import { VerificationRevokedEmail } from "./PPTBEmails";

export default function VerificationRevokedPreview() {
    return (
        <VerificationRevokedEmail
            toolName="Sample Power Platform Tool"
            variant="grace"
            reason="Bug health for your tool has fallen below the verification requirements."
            deadlineAt="2026-09-12"
            threshold="flag"
            openBugCount={6}
            longestResponseDays={11}
        />
    );
}
