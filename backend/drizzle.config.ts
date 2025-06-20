import type { Config } from "drizzle-kit";

export default {
	schema: "./src/database/schema.ts",
	out: "./drizzle",
	dialect: "sqlite",
	driver: "d1-http",
	dbCredentials: {
		databaseId: "d1-dex-database",
		accountId: "placeholder", // This will be set from environment
		token: "placeholder", // This will be set from environment
	},
} satisfies Config;
