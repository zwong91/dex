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
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			reportsDirectory: './coverage',
			include: [
				'src/**/*.{ts,js}',
			],
			exclude: [
				'node_modules/**',
				'dist/**',
				'test/**',
				'**/*.d.ts',
				'**/*.config.{ts,js}',
				'**/wrangler.*.toml',
			],
			all: true,
			lines: 80,
			functions: 80,
			branches: 70,
			statements: 80,
		},
	},
});
