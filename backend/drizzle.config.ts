import type { Config } from "drizzle-kit";

export default {
	schema: "./src/database/schema.ts",
	out: "./drizzle",
	driver: "d1",
	dbCredentials: {
		wranglerConfigPath: "./wrangler.toml",
		dbName: "d1-dex-database",
	},
} satisfies Config;
