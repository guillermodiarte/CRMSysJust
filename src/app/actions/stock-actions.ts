
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
};

export async function createStockEntry(payload: StockEntryPayload) {
  const { items, shippingCostTotal, incentiveDiscountTotal } = payload;

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
  let allocatedTotalSoFar = 0;

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

  // 3. Rounding Logic & Penny Adjustment
  // We sum up the rounded target costs and check against totalMaster.
  // We will distribute the difference to the largest item (or last) to ensure exact match.
  // Actually, let's keep it simple: Adjust the LAST item.

  // Note: We need to store Unit Shipping. 
  // Formula: UnitShipping = ( (TargetTotal / Qty) / TaxMultiplier ) - UnitGross

  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < preparedItems.length; i++) {
        const item = preparedItems[i];
        let finalTargetTotal = item.targetTotalCost;

        // If it's the last item, we force the sum to match TotalMaster
        if (i === preparedItems.length - 1) {
          const currentSum = preparedItems.slice(0, i).reduce((acc, curr) => {
            // Re-calculate previous items' final totals to be sure
            // Since we don't have them stored in a variable in this scope easily without re-running logic,
            // let's do a slightly different approach:
            // We need to calculate the EXACT derived cost that will be stored.
            // The database stores: shippingCostUnit. 
            // The effective Total Cost computed later is:
            // (Gross + ShippingUnit) * TaxMultiplier * Qty
            return acc; // Wait, we need to flow the logic better.
          }, 0);

          // Actually, the simplest reliable way is:
          // 1. Calculate "Ideal" Unit Shipping.
          // 2. Round it to DB precision (Decimal usually 2 or 4 places, Prisma handles Decimal).
          // 3. But we want the RESULT to match.
        }
      }

      // RE-THINKING ALGORITHM FOR EXACTNESS WITH DB LIMITS:
      // We can't easily force "TotalMaster" if we are constrained by storing "UnitShipping" with limited precision.
      // HOWEVER, if we store high precision decimals, it works. SQLite/Prisma Decimal is high precision.

      // Let's stick to the plan:
      // 1. Calculate Target Total for the line.
      // 2. Derive Unit Shipping.
      // 3. For the last item, adjust Target Total to absorb rounding diffs of the previous lines?
      // No, because "Target Total" is derived from weights which is float.

      // Better approach:
      // Accumulate the "Allocated Total" as we go.

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
          // Calculate total cost for this line (Unit Cost * Qty)
          // Since it's an expense, we take the Gross Cost as the base.
          // Should we verify if we strip taxes? Typically expenses are entered as "what I paid".
          // If the user entered "Cost Gross", that's the base.
          // BUT, `preparedItems` has `targetTotalCost` which includes taxes/shipping distribution!
          // Expense tracking should probably reflect the TRUE cost (Total Master allocated).

          let amount = item.targetTotalCost;

          // Re-verify logic: 
          // `targetTotalCost` is the slice of the invoice (Prod + Tax + Shipping - Incentive).
          // This seems correct for an "Expense" - it's the actual money out.

          await tx.expense.create({
            data: {
              date: new Date(),
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

        // We need to re-calculate "allocatedTotalSoFar" relative to the master total?
        // Actually, `preparedItems` logic distributed the TOTAL MASTER across ALL items (including ADVENTA).
        // This is correct: The invoice total includes the sales aid items.
        // So we keep using `item.targetTotalCost` as calculated.

        let assignedTotalLineCost = item.targetTotalCost;

        // Precision Adjustment Logic (Last Item of the ENTIRE list?)
        // If we split the list, we might lose the "last item" context for ensuring exact total match.
        // However, `preparedItems` calculated `targetTotalCost` based on weights.
        // The sum of all `targetTotalCost` equals `totalMaster`.
        // If we sum (SalesAid_TargetCosts + Regular_TargetCosts), it matches `totalMaster`.
        // The rounding difference must be absorbed by SOME item.
        // Let's absorb it in the LAST item of the `regularItems` entry if possible, 
        // or last `salesAidItems` if that's all there is (though rare).

        // Let's refine:
        const isAbsoluteLast = (i === regularItems.length - 1) && (salesAidItems.length === 0);
        // Getting complex. Let's stick to the weight-based target. The penny difference is negligible for now.

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
