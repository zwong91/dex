import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		testTimeout: 30000, // 30 seconds for integration tests
		hookTimeout: 10000, // 10 seconds for setup/teardown
		reporter: ["verbose"],
		include: ["test/**/*.spec.ts"],
		exclude: ["node_modules/**", "dist/**"],
	},
});
