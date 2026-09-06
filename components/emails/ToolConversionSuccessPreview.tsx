import { ToolConversionSuccessEmail } from "./PPTBEmails";

export default function ToolConversionSuccessPreview() {
    return <ToolConversionSuccessEmail toolName="Sample Power Platform Tool" packageName="sample.tool" toolLink="https://www.powerplatformtoolbox.com/tools/sample" />;
}