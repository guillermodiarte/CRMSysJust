
"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function getProducts(query?: string) {
  const conditions: any[] = [
    { description: { contains: query } },
    { code: { contains: query } },
  ];

  const cleanQuery = query ? query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

  // Fuzzy match for "Ayuda de Venta"
  // If the query is a substring of "ayuda de venta" (min 2 chars), e.g. "ay", "ve", "vent"
  // OR if it matches "adventa"
  if (query && (
    ("ayuda de venta".includes(cleanQuery) && cleanQuery.length >= 2) ||
    cleanQuery.includes("adventa")
  )) {
    conditions.push({ code: { contains: "ADVENTA" } });
  }

  // Fuzzy match for "Edición Limitada"
  if (query && (
    ("edicion limitada".includes(cleanQuery) && cleanQuery.length >= 2) ||
    cleanQuery.includes("elimitada")
  )) {
    conditions.push({ code: { contains: "ELIMITADA" } });
  }

  const products = await prisma.productCatalog.findMany({
    where: query
      ? {
        OR: conditions,
      }
      : undefined,
    orderBy: { description: "asc" },
  });
  return products.map(p => ({
    ...p,
    listPrice: Number(p.listPrice),
    offerPrice: Number(p.offerPrice),
  }));
}

export async function createProduct(formData: FormData) {
  const code = formData.get("code") as string;
  const description = formData.get("description") as string;
  const listPrice = parseFloat(formData.get("listPrice") as string);
  const offerPrice = parseFloat(formData.get("offerPrice") as string) || 0;

  try {
    await prisma.productCatalog.create({
      data: {
        code,
        description,
        listPrice,
        offerPrice,
      },
    });
    revalidatePath("/dashboard/prices");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating product:", error);
    if (error.code === 'P2002' && error.meta?.target?.includes('code')) {
      return { success: false, error: `Ya existe un producto con el código '${code}'.` };
    }
    return { success: false, error: "Error al crear producto." };
  }
}

export async function deleteProduct(code: string) {
  try {
    await prisma.productCatalog.delete({
      where: { code },
    });
    revalidatePath("/dashboard/prices");
    return { success: true };
  } catch (error) {
    return { success: false, error: "No se puede eliminar. Puede tener stock o ventas asociadas." };
  }
}

export async function updateProduct(oldCode: string, formData: FormData) {
  const newCode = formData.get("code") as string;
  const description = formData.get("description") as string;
  const listPrice = parseFloat(parseFloat(formData.get("listPrice") as string).toFixed(2));
  const offerPrice = parseFloat((parseFloat(formData.get("offerPrice") as string) || 0).toFixed(2));

  try {
    // Simplified update leveraging ON UPDATE CASCADE
    await prisma.productCatalog.update({
      where: { code: oldCode },
      data: {
        code: newCode, // If different, DB cascades to Stock/Sales
        description,
        listPrice,
        offerPrice,
      },
    });

    revalidatePath("/dashboard/prices");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating product:", error);
    if (error.code === 'P2002' && error.meta?.target?.includes('code')) {
      return { success: false, error: `Ya existe otro producto con el código '${newCode}'.` };
    }
    return { success: false, error: "Error al actualizar producto." };
  }
}

export async function importProductsBulk(products: { code: string; description: string; listPrice: number; offerPrice?: number }[]) {
  try {
    await prisma.$transaction(
      products.map((p) =>
        prisma.productCatalog.upsert({
          where: { code: p.code },
          update: {
            description: p.description,
            listPrice: p.listPrice,
            offerPrice: p.offerPrice ?? 0,
          },
          create: {
            code: p.code,
            description: p.description,
            listPrice: p.listPrice,
            offerPrice: p.offerPrice ?? 0,
          },
        })
      )
    );
    revalidatePath("/dashboard/prices");
    return { success: true, count: products.length };
  } catch (error) {
    console.error("Bulk import error:", error);
    return { success: false, error: "Error al importar productos. Verifique el formato." };
  }
}

export async function updatePricesByPercentage(percentage: number) {
  try {
    const multiplier = 1 + (percentage / 100);
    // SQLite uses real/numeric storage. We can use parameterized raw query.
    // Important: ensure multiplier is a standard number.
    // We use ROUND(..., 0) to ensure we don't store decimal values, only integers.
    const result = await prisma.$executeRaw`UPDATE ProductCatalog SET listPrice = ROUND(listPrice * ${multiplier}, 0)`;

    revalidatePath("/dashboard/prices");
    return { success: true, count: Number(result) };
  } catch (error) {
    console.error("Error updating prices by percentage:", error);
    return { success: false, error: "Error al actualizar precios masivamente." };
  }
}
