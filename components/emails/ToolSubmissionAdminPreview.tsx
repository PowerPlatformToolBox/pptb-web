import { ToolSubmissionAdminEmail } from "./PPTBEmails";

export default function ToolSubmissionAdminPreview() {
    return (
        <ToolSubmissionAdminEmail
            toolName="Sample Power Platform Tool"
            description="A sample tool submission for previewing the PPTB email theme."
            submissionDate="August 29, 2026"
            submittedBy="Alex Developer (alex@example.com)"
        />
    );
}
