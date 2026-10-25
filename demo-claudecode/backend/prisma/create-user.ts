import "dotenv/config";
import { createInterface } from "node:readline";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaAuthRepository } from "../src/repositories/PrismaAuthRepository";
import { AuthService } from "../src/services/AuthService";
import { AppError } from "../src/utils/errors";
import { newUserSchema } from "../src/validators/auth.validator";

// Usage: npm run user:create -- ana@example.com
// The password is read from the USER_PASSWORD env var or typed at a hidden prompt (never an argument:
// arguments end up in the shell history and in `ps`).

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    process.stdout.write(question);
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {};
    rl.question("", (answer) => {
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = write;
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npm run user:create -- <email>");
  const password = process.env.USER_PASSWORD ?? (await askHidden("Contraseña (mín. 12 caracteres): "));

  const input = newUserSchema.safeParse({ email, password });
  if (!input.success) throw new Error(input.error.issues.map((i) => i.message).join("; "));

  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  try {
    const { user, claimedInvoices } = await new AuthService(new PrismaAuthRepository(prisma)).createUser(
      input.data.email,
      input.data.password,
    );
    console.log(`Usuario creado: ${user.email} (id ${user.id})`);
    if (claimedInvoices > 0) console.log(`${claimedInvoices} facturas existentes asignadas a este usuario`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof AppError || error instanceof Error ? error.message : error);
  process.exit(1);
});
