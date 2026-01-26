"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function exportDatabase() {
  try {
    const users = await prisma.user.findMany();
    const systemConfig = await prisma.systemConfig.findFirst();
    const products = await prisma.productCatalog.findMany();
    const stockBatches = await prisma.stockBatch.findMany();
    const sales = await prisma.sale.findMany();
    const saleItems = await prisma.saleItem.findMany();
    const allocations = await prisma.saleItemBatchAllocation.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      models: {
        users,
        systemConfig,
        products,
        stockBatches,
        sales,
        saleItems,
        allocations,
      },
    };

    return { success: true, data: JSON.stringify(backupData, null, 2) };
  } catch (error) {
    console.error("Export error:", error);
    return { success: false, error: "Error al exportar la base de datos." };
  }
}

export async function importDatabase(jsonString: string) {
  try {
    const data = JSON.parse(jsonString);

    if (!data.models) {
      return { success: false, error: "Formato de archivo inválido." };
    }

    const {
      users,
      systemConfig,
      products,
      stockBatches,
      sales,
      saleItems,
      allocations,
    } = data.models;

    // Transactional Restore (Wipe & Recreate)
    await prisma.$transaction(async (tx) => {
      // 1. Wipe all data (Order matters for FK constraints)
      await tx.saleItemBatchAllocation.deleteMany();
      await tx.saleItem.deleteMany();
      await tx.sale.deleteMany();
      await tx.stockBatch.deleteMany();
      await tx.productCatalog.deleteMany();
      await tx.systemConfig.deleteMany();
      await tx.user.deleteMany(); // Caution: This might log out the user if they don't exist in backup

      // 2. Restore data (Order matters for FK constraints)
      if (users?.length) await tx.user.createMany({ data: users });
      if (systemConfig) await tx.systemConfig.create({ data: systemConfig }); // Singleton usually
      if (products?.length) await tx.productCatalog.createMany({ data: products });
      if (stockBatches?.length) await tx.stockBatch.createMany({ data: stockBatches });
      if (sales?.length) await tx.sale.createMany({ data: sales });
      if (saleItems?.length) await tx.saleItem.createMany({ data: saleItems });
      if (allocations?.length) await tx.saleItemBatchAllocation.createMany({ data: allocations });
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Import error:", error);
    return { success: false, error: "Error al restaurar base de datos. Verifique la integridad del archivo." };
  }
}
