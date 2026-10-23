import { ToolReviewResponseEmail } from "./PPTBEmails";

export default function ToolReviewResponsePreview() {
    return (
        <ToolReviewResponseEmail
            toolName="Sample Power Platform Tool"
            reply="Thank you for your feedback! We are glad the tool is helping your team manage solutions."
            reviewUrl="https://www.powerplatformtoolbox.com/tools/sample/reviews"
        />
    );
}
