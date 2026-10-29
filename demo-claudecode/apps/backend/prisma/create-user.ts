import "dotenv/config";
import { createInterface } from "node:readline";
import { createPrismaClient } from "../src/lib/prisma";
import { PrismaAuthRepository } from "../src/repositories/PrismaAuthRepository";
import { AuthService } from "../src/services/AuthService";
import { AppError } from "../src/utils/errors";
import { newUserSchema } from "../src/validators/auth.validator";

// Usage: npm run user:create -- ana@example.com [--role USER|ADMIN]   (default role: USER)
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

/** Splits `<email> [--role X]` / `--role=X` in any order. */
function parseArgs(args: string[]): { email?: string; role?: string } {
  let email: string | undefined;
  let role: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--role") role = args[++i];
    else if (arg.startsWith("--role=")) role = arg.slice("--role=".length);
    else if (!arg.startsWith("--") && email === undefined) email = arg;
    else throw new Error(`Argumento no reconocido: ${arg}`);
  }
  return { email, role };
}

async function main() {
  const { email, role } = parseArgs(process.argv.slice(2));
  if (!email) throw new Error("Usage: npm run user:create -- <email> [--role USER|ADMIN]");
  const password = process.env.USER_PASSWORD ?? (await askHidden("Contraseña (mín. 12 caracteres): "));

  const input = newUserSchema.safeParse({ email, password, role });
  if (!input.success) throw new Error(input.error.issues.map((i) => i.message).join("; "));

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const prisma = createPrismaClient(url);
  try {
    // Creating an account never signs tokens, so the JWT configuration is not needed here.
    const noJwt = () => {
      throw new Error("create-user no emite tokens");
    };
    const { user, claimedInvoices } = await new AuthService(new PrismaAuthRepository(prisma), noJwt).createUser(
      input.data.email,
      input.data.password,
      input.data.role,
    );
    console.log(`Usuario creado: ${user.email} (id ${user.id}, rol ${user.role})`);
    if (claimedInvoices > 0) console.log(`${claimedInvoices} facturas existentes asignadas a este usuario`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof AppError || error instanceof Error ? error.message : error);
  process.exit(1);
});
