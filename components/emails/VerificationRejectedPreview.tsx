import { VerificationRejectedEmail } from "./PPTBEmails";

export default function VerificationRejectedPreview() {
    return <VerificationRejectedEmail toolName="Sample Power Platform Tool" failedCriteria={["Documentation is incomplete", "The published package could not be verified"]} />;
}