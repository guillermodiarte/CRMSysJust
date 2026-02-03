
"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// Types for the Entry Form
export type StockEntryItem = {
  code: string;
  quantity: number;
  costGross: number;
  expirationDate: string; // ISO Date
};

export type StockEntryPayload = {
  items: StockEntryItem[];
  shippingCostTotal: number;
  incentiveDiscountTotal: number;
  entryDate?: string; // Optional override date
};

export async function createStockEntry(payload: StockEntryPayload) {
  const { items, shippingCostTotal, incentiveDiscountTotal, entryDate } = payload;

  // Use provided date or default to now
  const actualEntryDate = entryDate ? new Date(entryDate) : new Date();

  if (items.length === 0) return { success: false, error: "No hay productos en el ingreso" };

  // Get config for Tax rates (Assuming latest/default)
  const config = await prisma.systemConfig.findFirst() || { ivaPercentage: 21, extraTaxPercentage: 3 };
  const taxMultiplier = 1 + (Number(config.ivaPercentage) + Number(config.extraTaxPercentage)) / 100;

  // 1. Calculate Master Total (Total Lote Maestro)
  // SumGross + Shipping - Incentive
  const sumGrossCost = items.reduce((acc, item) => acc + (item.quantity * item.costGross), 0);
  const subtotalGlobal = sumGrossCost + shippingCostTotal - incentiveDiscountTotal;
  const taxesGlobal = subtotalGlobal * ((Number(config.ivaPercentage) + Number(config.extraTaxPercentage)) / 100);
  const totalMaster = Math.round(subtotalGlobal + taxesGlobal);

  // 2. Prepare Distribution
  // We need to distribute 'totalMaster' among items based on their gross cost weight.

  // Create a temporary array to hold calculated values
  const preparedItems = items.map(item => {
    const itemGrossTotal = item.quantity * item.costGross;
    const weight = sumGrossCost > 0 ? itemGrossTotal / sumGrossCost : 0;

    // Target Total for this line (including taxes, shipping, etc)
    const targetTotalCost = totalMaster * weight;

    return {
      ...item,
      targetTotalCost,
      itemGrossTotal
    };
  });

  try {
    await prisma.$transaction(async (tx) => {
      // --- Filter Items: Separate ADVENTA items from regular Stock Items ---
      const salesAidItems = preparedItems.filter(i => i.code.startsWith("ADVENTA-"));
      const regularItems = preparedItems.filter(i => !i.code.startsWith("ADVENTA-"));

      // 1. Process Sales Aid Items (Create Expenses)
      if (salesAidItems.length > 0) {
        // We need product descriptions. Fetch them first.
        const productCodes = salesAidItems.map(i => i.code);
        const products = await tx.productCatalog.findMany({
          where: { code: { in: productCodes } },
          select: { code: true, description: true }
        });

        const productMap = new Map(products.map(p => [p.code, p.description]));

        for (const item of salesAidItems) {
          let amount = item.targetTotalCost;

          await tx.expense.create({
            data: {
              date: actualEntryDate,
              description: `${productMap.get(item.code) || item.code} (x${item.quantity})`,
              amount: amount,
              code: item.code,
              quantity: item.quantity
            }
          });
        }
      }

      // 2. Process Regular Items (Create StockBatches)
      for (let i = 0; i < regularItems.length; i++) {
        const item = regularItems[i];
        let assignedTotalLineCost = item.targetTotalCost;

        // Reverse engineer Unit Shipping for StockBatch
        const unitTotalUntaxed = (assignedTotalLineCost / item.quantity) / taxMultiplier;
        const shippingCostUnit = unitTotalUntaxed - item.costGross;

        // Store StockBatch
        await tx.stockBatch.create({
          data: {
            productCode: item.code,
            initialQuantity: item.quantity,
            currentQuantity: item.quantity,
            costGross: item.costGross,
            taxRate: config.ivaPercentage,
            extraTaxRate: config.extraTaxPercentage,
            offerPrice: 0,
            expirationDate: new Date(item.expirationDate),
            entryDate: actualEntryDate,
            shippingCostUnit,
            incentiveDiscountUnit: 0,
          }
        });
      }
    });

    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/finance");
    return { success: true };
  } catch (error) {
    console.error("Error creating stock entry:", error);
    return { success: false, error: "Error al guardar el ingreso de stock." };
  }
}



import { addMonths, isBefore } from "date-fns";

import { normalizeText } from "@/lib/utils";

export async function getStockBatches(searchParam?: string) {
  const search = searchParam ? normalizeText(searchParam) : undefined;

  // Get config for Expiry Alert
  const config = await prisma.systemConfig.findFirst() || { expiryAlertMonths: 3 };
  const expiryThreshold = addMonths(new Date(), config.expiryAlertMonths);

  // Fetch all available stock first
  const allBatches = await prisma.stockBatch.findMany({
    where: {
      currentQuantity: { gt: 0 },
    },
    include: {
      product: true,
    },
    orderBy: {
      expirationDate: 'asc',
    }
  });

  // Filter in memory for accent-insensitive search
  const res = search
    ? allBatches.filter(batch => {
      const desc = normalizeText(batch.product.description);
      const code = normalizeText(batch.productCode);
      return desc.includes(search) || code.includes(search);
    })
    : allBatches;

  const sorted = res.sort((a, b) => {
    const isAExpiring = isBefore(new Date(a.expirationDate), expiryThreshold);
    const isBExpiring = isBefore(new Date(b.expirationDate), expiryThreshold);

    if (isAExpiring && isBExpiring) {
      // Both expiring: Sort by Expiration Date ASC (closest to expire first)
      return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
    }

    if (isAExpiring) return -1; // A is expiring, B is not -> A first
    if (isBExpiring) return 1;  // B is expiring, A is not -> B first

    // Neither expiring: Sort by Entry Date DESC (Newest arrivals first)
    // Using DESC since user likely wants to see recent stock movements for healthy items
    return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
  });

  return sorted.map(b => ({
    ...b,
    costGross: Number(b.costGross),
    taxRate: Number(b.taxRate),
    extraTaxRate: Number(b.extraTaxRate),
    shippingCostUnit: Number(b.shippingCostUnit),
    incentiveDiscountUnit: Number(b.incentiveDiscountUnit),
    offerPrice: Number(b.offerPrice),
    product: {
      ...b.product,
      listPrice: Number(b.product.listPrice),
      offerPrice: Number(b.product.offerPrice)
    }
  }));
}

export async function deleteStockBatch(id: string) {
  try {
    // Check if batch has any sales allocated
    const batch = await prisma.stockBatch.findUnique({
      where: { id },
      include: { saleAllocations: true }
    });

    if (!batch) return { success: false, error: "Lote no encontrado" };

    // ...
    if (batch.saleAllocations.length > 0) {
      return { success: false, error: "No se puede eliminar: Este lote ya tiene ventas asociadas." };
    }

    await prisma.stockBatch.delete({ where: { id } });
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/finance");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al eliminar el lote" };
  }
}

export async function updateStockBatch(id: string, data: { expirationDate: string, currentQuantity: number, offerPrice: number }) {
  try {
    await prisma.stockBatch.update({
      where: { id },
      data: {
        expirationDate: new Date(data.expirationDate),
        currentQuantity: data.currentQuantity,
        offerPrice: data.offerPrice
      }
    });
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/finance");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al actualizar el lote" };
  }
}
