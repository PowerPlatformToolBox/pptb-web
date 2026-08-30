import type { ReactNode } from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.powerplatformtoolbox.com";

const styles = {
    body: { backgroundColor: "#f8fafc", color: "#1e293b", fontFamily: "'Segoe UI', Arial, sans-serif", margin: 0, padding: "32px 12px" },
    container: { backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", margin: "0 auto", maxWidth: "600px", overflow: "hidden" as const },
    accent: { backgroundColor: "#0078d4", height: "5px" },
    header: { padding: "28px 40px 12px" },
    brand: { color: "#0f172a", display: "inline-block", fontSize: "18px", fontWeight: 700, margin: "0 0 0 12px", verticalAlign: "middle" },
    logo: { borderRadius: "8px", display: "inline-block", verticalAlign: "middle" },
    content: { padding: "8px 40px 32px" },
    eyebrow: { color: "#0078d4", fontSize: "12px", fontWeight: 700, margin: "12px 0 8px", textTransform: "uppercase" as const },
    heading: { color: "#0f172a", fontSize: "28px", fontWeight: 700, lineHeight: "36px", margin: "0 0 20px" },
    text: { color: "#334155", fontSize: "16px", lineHeight: "25px", margin: "0 0 16px" },
    detail: { backgroundColor: "#f8fafc", borderLeft: "4px solid #8a3ffc", borderRadius: "4px", margin: "22px 0", padding: "16px 20px" },
    detailLabel: { color: "#64748b", fontSize: "12px", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase" as const },
    detailValue: { color: "#0f172a", fontSize: "15px", lineHeight: "23px", margin: "0 0 14px", whiteSpace: "pre-wrap" as const },
    list: { color: "#334155", fontSize: "15px", lineHeight: "24px", margin: "8px 0 18px", paddingLeft: "22px" },
    button: { backgroundColor: "#0078d4", borderRadius: "6px", color: "#ffffff", display: "inline-block", fontSize: "15px", fontWeight: 700, padding: "12px 20px", textDecoration: "none" },
    footer: { color: "#64748b", fontSize: "12px", lineHeight: "18px", margin: 0, padding: "0 40px 28px", textAlign: "center" as const },
    hr: { borderColor: "#e2e8f0", margin: "0 40px 20px" },
};

function EmailLayout({ preview, eyebrow, title, children }: { preview: string; eyebrow: string; title: string; children: ReactNode }) {
    return (
        <Html lang="en">
            <Head />
            <Preview>{preview}</Preview>
            <Body style={styles.body}>
                <Container style={styles.container}>
                    <Section style={styles.accent} />
                    <Section style={styles.header}>
                        <Img src={`${siteUrl}/logo.png`} width="44" height="44" alt="Power Platform ToolBox" style={styles.logo} />
                        <Text style={styles.brand}>Power Platform ToolBox</Text>
                    </Section>
                    <Section style={styles.content}>
                        <Text style={styles.eyebrow}>{eyebrow}</Text>
                        <Heading as="h1" style={styles.heading}>
                            {title}
                        </Heading>
                        {children}
                    </Section>
                    <Hr style={styles.hr} />
                    <Text style={styles.footer}>
                        Power Platform ToolBox ·{" "}
                        <Link href={siteUrl} style={{ color: "#0078d4" }}>
                            Visit the marketplace
                        </Link>
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

function Detail({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
    return (
        <>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={{ ...styles.detailValue, ...(last ? { marginBottom: 0 } : {}) }}>{children}</Text>
        </>
    );
}

function ErrorList({ errors }: { errors: string[] }) {
    return (
        <ul style={styles.list}>
            {errors.map((error) => (
                <li key={error}>{error}</li>
            ))}
        </ul>
    );
}

export function ToolSubmissionAdminEmail({ toolName, description, submissionDate, submittedBy }: { toolName: string; description: string; submissionDate: string; submittedBy: string }) {
    return (
        <EmailLayout preview={`New tool intake: ${toolName}`} eyebrow="Admin notification" title="New tool submitted">
            <Text style={styles.text}>A new tool intake is ready for review.</Text>
            <Section style={styles.detail}>
                <Detail label="Tool">{toolName}</Detail>
                <Detail label="Submitted">{submissionDate}</Detail>
                <Detail label="Submitted by">{submittedBy}</Detail>
                <Detail label="Description" last>
                    {description}
                </Detail>
            </Section>
            <Button href={`${siteUrl}/admin/tool-intakes`} style={styles.button}>
                Review tool intake
            </Button>
        </EmailLayout>
    );
}

export function ToolUpdateAdminEmail({ toolName, version, validationErrors, submittedBy }: { toolName: string; version: string; validationErrors: string[]; submittedBy: string }) {
    return (
        <EmailLayout preview={`${toolName} ${version} failed validation`} eyebrow="Admin notification" title="Tool update needs attention">
            <Text style={styles.text}>
                <strong>
                    {toolName} {version}
                </strong>{" "}
                failed automated validation.
            </Text>
            <Text style={styles.text}>
                Submitted by: <strong>{submittedBy}</strong>
            </Text>
            <ErrorList errors={validationErrors} />
        </EmailLayout>
    );
}

export function ToolUpdateDeveloperEmail({ toolName, version, validationErrors }: { toolName: string; version: string; validationErrors: string[] }) {
    return (
        <EmailLayout preview={`Action needed for ${toolName} ${version}`} eyebrow="Validation result" title="Your update failed validation">
            <Text style={styles.text}>
                The submitted update for{" "}
                <strong>
                    {toolName} {version}
                </strong>{" "}
                could not be accepted because:
            </Text>
            <ErrorList errors={validationErrors} />
            <Text style={styles.text}>Correct these issues and publish a new version when it is ready.</Text>
        </EmailLayout>
    );
}

export function ToolReviewChangeRequestEmail({ toolName, submittedOn, reviewComments }: { toolName: string; submittedOn: string; reviewComments: string }) {
    return (
        <EmailLayout preview={`Changes requested for ${toolName}`} eyebrow="Submission review" title="Changes requested">
            <Text style={styles.text}>
                The review of <strong>{toolName}</strong> needs your input before it can continue.
            </Text>
            <Section style={styles.detail}>
                <Detail label="Submitted">{submittedOn}</Detail>
                <Detail label="Reviewer comments" last>
                    {reviewComments}
                </Detail>
            </Section>
        </EmailLayout>
    );
}

export function ToolConversionSuccessEmail({ toolName, packageName, toolLink }: { toolName: string; packageName: string; toolLink: string }) {
    return (
        <EmailLayout preview={`${toolName} is now live on PPTB`} eyebrow="Marketplace update" title="Your tool is live">
            <Text style={styles.text}>
                <strong>{toolName}</strong> has been approved and published to the Power Platform ToolBox marketplace.
            </Text>
            <Section style={styles.detail}>
                <Detail label="Package" last>
                    {packageName}
                </Detail>
            </Section>
            <Button href={toolLink} style={styles.button}>
                View your tool
            </Button>
        </EmailLayout>
    );
}

export function VerificationRequestSubmittedEmail({ toolName }: { toolName: string }) {
    return (
        <EmailLayout preview={`Verification requested for ${toolName}`} eyebrow="Verification" title="Your request is in the queue">
            <Text style={styles.text}>
                Your verification request for <strong>{toolName}</strong> is in the review queue.
            </Text>
            <Text style={styles.text}>
                Reviews normally take 1–2 weeks. Publishing an update while the request is queued or in review will automatically cancel it so the review is not performed against an outdated version.
            </Text>
        </EmailLayout>
    );
}

export function VerificationRequestAdminEmail({ toolName, description, submittedOn, submittedBy }: { toolName: string; description: string; submittedOn: string; submittedBy: string }) {
    return (
        <EmailLayout preview={`Verification requested for ${toolName}`} eyebrow="Admin notification" title="Verification request submitted">
            <Text style={styles.text}>A new verification request is ready for review.</Text>
            <Section style={styles.detail}>
                <Detail label="Tool">{toolName}</Detail>
                <Detail label="Submitted on">{submittedOn}</Detail>
                <Detail label="Submitted by">{submittedBy}</Detail>
                <Detail label="Description" last>
                    {description}
                </Detail>
            </Section>
            <Button href={`${siteUrl}/admin/verification-requests`} style={styles.button}>
                Review verification request
            </Button>
        </EmailLayout>
    );
}

export function VerificationRequestCancelledEmail({ toolName }: { toolName: string }) {
    return (
        <EmailLayout preview={`Verification cancelled for ${toolName}`} eyebrow="Verification" title="Verification request cancelled">
            <Text style={styles.text}>
                The active verification request for <strong>{toolName}</strong> was automatically cancelled because the tool was updated while queued or in review.
            </Text>
            <Text style={styles.text}>You can submit a new request from My Tools. The new request will go through the full review.</Text>
        </EmailLayout>
    );
}

export function VerificationApprovedEmail({ toolName }: { toolName: string }) {
    return (
        <EmailLayout preview={`${toolName} is now verified`} eyebrow="Verification" title="Verification approved">
            <Text style={styles.text}>
                <strong>{toolName}</strong> passed every required verification criterion and is now Verified.
            </Text>
            <Text style={styles.text}>The Verified badge is now visible in the marketplace.</Text>
        </EmailLayout>
    );
}

export function VerificationRejectedEmail({ toolName, failedCriteria }: { toolName: string; failedCriteria: string[] }) {
    return (
        <EmailLayout preview={`${toolName} was not approved for verification`} eyebrow="Verification" title="Verification not approved">
            <Text style={styles.text}>
                <strong>{toolName}</strong> did not pass verification. These required criteria did not pass:
            </Text>
            <ErrorList errors={failedCriteria} />
            <Text style={styles.text}>After addressing these items, you can submit a new request for a full review.</Text>
        </EmailLayout>
    );
}
