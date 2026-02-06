module.exports = {
    extends: ["prettier"],
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
    },
    rules: {
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
            },
        ],
        "no-console": ["warn", { allow: ["warn", "error"] }],
    },
    ignorePatterns: ["dist", ".turbo", "node_modules"],
};
