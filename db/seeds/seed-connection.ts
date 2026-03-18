import { db } from "..";

import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { databaseConnections, users } from "../schema";
import { encryptPassword } from "@/lib/crypto";

async function main() {
  // Find your registered user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@gmail.com"))
    .limit(1);

  if (!user) {
    console.error(
      "User not found — register first via POST /api/auth/register",
    );
    process.exit(1);
  }

  // Update role to admin while we're here
  await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
  console.log(`✓ Set ${user.email} role to admin`);

  // Insert a test connection pointing at the same local MySQL
  const id = createId();
  await db.insert(databaseConnections).values({
    id,
    name: "Local MySQL (test)",
    description: "Seed connection for testing SQL Lab",
    dialect: "mysql",
    host: "localhost",
    port: 3306,
    databaseName: "superset_meta",
    username: "root",
    encryptedPassword: encryptPassword("root"),
    createdBy: user.id,
  });

  console.log(`✓ Created connection: ${id}`);
  console.log("Done — run GET /api/connections to verify");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
