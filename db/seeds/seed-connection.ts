import { db } from "..";

import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { databaseConnections, users } from "../schema";
import { encryptPassword } from "@/lib/crypto";
import bcrypt from "bcryptjs";

const SEED_EMAIL = "admin@gmail.com";
const SEED_PASSWORD = "password";
const SEED_NAME = "Admin Seed";

async function main() {
  // ── 1. Upsert admin user ──────────────────────────────────────────────────
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, SEED_EMAIL))
    .limit(1);

  if (!user) {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
    const id = createId();
    await db.insert(users).values({
      id,
      email: SEED_EMAIL,
      name: SEED_NAME,
      passwordHash,
      role: "admin",
    });
    [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, SEED_EMAIL))
      .limit(1);
    console.log(`✓ Created user: ${SEED_EMAIL} (admin)`);
  } else {
    // Ensure they are admin regardless
    await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
    console.log(`✓ User already exists — ensured role is admin: ${SEED_EMAIL}`);
  }

  // ── 2. Upsert test connection ─────────────────────────────────────────────
  const [existing] = await db
    .select()
    .from(databaseConnections)
    .where(eq(databaseConnections.name, "Local MySQL (test)"))
    .limit(1);

  if (!existing) {
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
      encryptedPassword: encryptPassword("secret"),
      createdBy: user.id,
    });
    console.log(`✓ Created connection: Local MySQL (test)`);
  } else {
    console.log(`✓ Connection already exists — skipped: Local MySQL (test)`);
  }

  console.log("\nDone. Login with:");
  console.log(`  Email:    ${SEED_EMAIL}`);
  console.log(`  Password: ${SEED_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
