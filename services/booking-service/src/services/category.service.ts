import { prisma } from "@lenda/database";
import { AppError } from "../middleware/errorHandler";

export async function getApprovedCategories(pillar?: string) {
  const categories = await prisma.category.findMany({
    where: {
      status: "APPROVED",
      ...(pillar ? { suggestedPillars: { has: pillar } } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      suggestedPillars: true,
    },
  });
  return categories;
}

export async function suggestCategory(
  name: string,
  suggestedPillars: string[],
  suggestedById: string,
) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const existing = await prisma.category.findFirst({
    where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }] },
  });

  if (existing) {
    if (existing.status === "APPROVED") {
      throw new AppError(409, "This category already exists.");
    }
    return existing;
  }

  return prisma.category.create({
    data: {
      name,
      slug,
      status: "PENDING",
      suggestedPillars,
      suggestedById,
    },
  });
}

export async function getAllCategoriesAdmin() {
  return prisma.category.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      suggestedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });
}

export async function reviewCategory(
  id: string,
  action: "APPROVED" | "REJECTED",
) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError(404, "Category not found.");
  return prisma.category.update({
    where: { id },
    data: { status: action },
  });
}
