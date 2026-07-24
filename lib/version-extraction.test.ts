import { isValidSemver } from "@/lib/version-extraction";

describe("isValidSemver", () => {
    it("accepts valid semver versions", () => {
        expect(isValidSemver("1.0.0")).toBe(true);
        expect(isValidSemver("2.1.3-beta.1")).toBe(true);
        expect(isValidSemver("3.0.0+build.5")).toBe(true);
    });

    it("rejects invalid semver versions", () => {
        expect(isValidSemver("1.0")).toBe(false);
        expect(isValidSemver("v1.0.0")).toBe(false);
        expect(isValidSemver("latest")).toBe(false);
    });
});
