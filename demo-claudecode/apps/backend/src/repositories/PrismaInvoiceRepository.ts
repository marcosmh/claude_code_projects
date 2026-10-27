import type { PrismaClient, Prisma } from "../generated/prisma/client";
import type {
  CreateInvoiceInput,
  FindAllInvoicesOptions,
  Invoice,
  InvoiceData,
  InvoiceStatsRow,
  InvoiceStatus,
  PaginatedInvoices,
  StatsRowsOptions,
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

function buildWhere(ownerId: number, options: FindAllInvoicesOptions): Prisma.InvoiceWhereInput {
  const { status, search } = options.filters ?? {};
  const term = search?.trim();
  return {
    ownerId,
    ...(status ? { status } : {}),
    ...(term
      ? { OR: [{ clientName: { contains: term } }, { number: { contains: term } }] }
      : {}),
  };
}

export class PrismaInvoiceRepository implements InvoiceRepository {
  constructor(private readonly db: PrismaClient) {}

  async findAll(ownerId: number, options: FindAllInvoicesOptions = {}): Promise<PaginatedInvoices> {
    const where = buildWhere(ownerId, options);
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

  async findStatsRows(ownerId: number, { issuedFrom }: StatsRowsOptions = {}): Promise<InvoiceStatsRow[]> {
    return this.db.invoice.findMany({
      where: { ownerId, ...(issuedFrom ? { issueDate: { gte: issuedFrom } } : {}) },
      select: {
        status: true,
        taxRate: true,
        issueDate: true,
        dueDate: true,
        items: { select: { quantity: true, unitPriceCents: true } },
      },
    });
  }

  async findById(ownerId: number, id: number): Promise<Invoice | null> {
    const row = await this.db.invoice.findFirst({ where: { id, ownerId }, include });
    return row ? toDomain(row) : null;
  }

  async create(ownerId: number, input: CreateInvoiceInput): Promise<Invoice> {
    const row = await this.db.invoice.create({
      data: { ...scalarData(input), ownerId, number: input.number, items: { create: input.items } },
      include,
    });
    return toDomain(row);
  }

  async createWithNumber(
    ownerId: number,
    input: Omit<CreateInvoiceInput, "number">,
    buildNumber: (id: number) => string,
  ): Promise<Invoice> {
    const row = await this.db.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          ...scalarData(input),
          ownerId,
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

  async update(ownerId: number, id: number, input: UpdateInvoiceInput): Promise<Invoice | null> {
    return this.db.$transaction(async (tx) => {
      const exists = await tx.invoice.findFirst({ where: { id, ownerId }, select: { id: true } });
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

  async updateStatus(ownerId: number, id: number, status: InvoiceStatus): Promise<Invoice | null> {
    // updateMany + findUnique instead of update(): a missing row is a normal outcome, not a P2025.
    const { count } = await this.db.invoice.updateMany({ where: { id, ownerId }, data: { status } });
    return count > 0 ? this.findById(ownerId, id) : null;
  }

  async delete(ownerId: number, id: number): Promise<boolean> {
    const { count } = await this.db.invoice.deleteMany({ where: { id, ownerId } });
    return count > 0;
  }
}
