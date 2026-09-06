import { ToolUpdateDeveloperEmail } from "./PPTBEmails";

export default function ToolUpdateDeveloperPreview() {
    return <ToolUpdateDeveloperEmail toolName="Sample Power Platform Tool" version="1.2.0" validationErrors={["Manifest is missing a publisher", "Package contains an invalid icon"]} />;
}