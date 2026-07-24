import nextJest from "next/jest.js";

const createJestConfig = nextJest({
    dir: "./",
});

const config = {
    testEnvironment: "node",
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
    },
    testPathIgnorePatterns: ["<rootDir>/e2e/", "<rootDir>/.next/"],
};

export default createJestConfig(config);
