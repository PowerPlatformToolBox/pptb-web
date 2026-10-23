import { ToolReviewSubmittedEmail } from "./PPTBEmails";

export default function ToolReviewSubmittedPreview() {
    return (
        <ToolReviewSubmittedEmail
            toolName="Sample Power Platform Tool"
            rating={5}
            comment="This tool makes managing our solutions so much easier. Thanks for building it!"
            reviewUrl="https://www.powerplatformtoolbox.com/tools/sample/reviews"
        />
    );
}
