import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const policy = await readFile(new URL("../app/(public)/policy/marketplace/page.tsx", import.meta.url), "utf8");
const footer = await readFile(new URL("../components/Footer.tsx", import.meta.url), "utf8");
const registryReadme = await readFile(new URL("../public/registry/README.md", import.meta.url), "utf8");

test("Marketplace Policy covers lifecycle states, publisher requests, and user expectations", () => {
    for (const requiredContent of [
        "<strong>Active:</strong>",
        "<strong>Deprecated:</strong>",
        "<strong>Retired:</strong>",
        "deprecation reason",
        "effective date",
        "replacement link",
        "expected retirement date",
        "Marketplace team reviews requests",
        "https://github.com/PowerPlatformToolBox/pptb-web/issues/new/choose",
        "new installations",
        "future updates are not guaranteed",
        "do not guarantee an individual notification",
        "Tool Maturity Model",
        "does not by itself retire a Marketplace tool",
    ]) {
        assert.ok(policy.includes(requiredContent), `Marketplace Policy should include "${requiredContent}"`);
    }

    assert.match(footer, /href="\/policy\/marketplace">Marketplace Policy/);
    assert.match(registryReadme, /\[Marketplace Policy\]\(https:\/\/powerplatformtoolbox\.com\/policy\/marketplace\)/);
});
