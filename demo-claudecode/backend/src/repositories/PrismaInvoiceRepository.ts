import type { PrismaClient, Prisma } from "../generated/prisma/client";
import type {
  CreateInvoiceInput,
  FindAllInvoicesOptions,
  Invoice,
  InvoiceData,
  InvoiceStatus,
  PaginatedInvoices,
  UpdateInvoiceInput,
} from "../types";
import type { InvoiceRepository } from "./InvoiceRepository";

const include = { items: { orderBy: { id: "asc" } } } satisfies Prisma.InvoiceInclude;
type InvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof include }>;

function toDomain(row: InvoiceRow): Invoice {
  return { ...row, status: row.status as InvoiceStatus };
}

function scalarData(input: InvoiceData) {
  return {
    clientName: input.clientName,
    clientEmail: input.clientEmail ?? null,
    clientAddress: input.clientAddress ?? null,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    status: input.status,
    taxRate: input.taxRate,
    notes: input.notes ?? null,
  };
}

function buildWhere(options: FindAllInvoicesOptions): Prisma.InvoiceWhereInput {
  const { status, search } = options.filters ?? {};
  const term = search?.trim();
  return {
    ...(status ? { status } : {}),
    ...(term
      ? { OR: [{ clientName: { contains: term } }, { number: { contains: term } }] }
      : {}),
  };
}

export class PrismaInvoiceRepository implements InvoiceRepository {
  constructor(private readonly db: PrismaClient) {}

  async findAll(options: FindAllInvoicesOptions = {}): Promise<PaginatedInvoices> {
    const where = buildWhere(options);
    const { pagination } = options;
    const [rows, total] = await this.db.$transaction([
      this.db.invoice.findMany({
        where,
        include,
        orderBy: [{ issueDate: "desc" }, { id: "desc" }],
        ...(pagination
          ? { skip: (pagination.page - 1) * pagination.pageSize, take: pagination.pageSize }
          : {}),
      }),
      this.db.invoice.count({ where }),
    ]);
    return { data: rows.map(toDomain), total };
  }

  async findById(id: number): Promise<Invoice | null> {
    const row = await this.db.invoice.findUnique({ where: { id }, include });
    return row ? toDomain(row) : null;
  }

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    const row = await this.db.invoice.create({
      data: { ...scalarData(input), number: input.number, items: { create: input.items } },
      include,
    });
    return toDomain(row);
  }

  async createWithNumber(
    input: Omit<CreateInvoiceInput, "number">,
    buildNumber: (id: number) => string,
  ): Promise<Invoice> {
    const row = await this.db.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          ...scalarData(input),
          number: `tmp-${crypto.randomUUID()}`,
          items: { create: input.items },
        },
      });
      return tx.invoice.update({
        where: { id: created.id },
        data: { number: buildNumber(created.id) },
        include,
      });
    });
    return toDomain(row);
  }

  async update(id: number, input: UpdateInvoiceInput): Promise<Invoice | null> {
    return this.db.$transaction(async (tx) => {
      const exists = await tx.invoice.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return null;
      const row = await tx.invoice.update({
        where: { id },
        data: {
          ...scalarData(input),
          items: { deleteMany: {}, create: input.items },
        },
        include,
      });
      return toDomain(row);
    });
  }

  async updateStatus(id: number, status: InvoiceStatus): Promise<Invoice | null> {
    // updateMany + findUnique instead of update(): a missing row is a normal outcome, not a P2025.
    const { count } = await this.db.invoice.updateMany({ where: { id }, data: { status } });
    return count > 0 ? this.findById(id) : null;
  }

  async delete(id: number): Promise<boolean> {
    const { count } = await this.db.invoice.deleteMany({ where: { id } });
    return count > 0;
  }
}
