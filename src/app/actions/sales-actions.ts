
"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { normalizeText } from "@/lib/utils";

const prisma = new PrismaClient();

// Payload for creating a sale
export type SaleItemPayload = {
  productCode: string;
  stockBatchId: string; // User selected batch (or auto-selected FIFO)
  quantity: number;
  unitPriceSold: number;
};

export type SalePayload = {
  date: string;
  clientName: string;
  clientPhone?: string;
  notes?: string;
  isGift: boolean;
  isLost?: boolean;
  items: SaleItemPayload[];
};

export async function createSale(payload: SalePayload) {
  const { date, clientName, clientPhone, notes, isGift, isLost = false, items } = payload;

  // Calculate total amount
  const totalAmount = (isGift || isLost) ? 0 : items.reduce((acc, item) => acc + (item.unitPriceSold * item.quantity), 0);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create Sale Header
      const sale = await tx.sale.create({
        data: {
          date: new Date(date),
          clientName,
          clientPhone,
          notes: notes || "",
          totalAmount,
          isGift,
          isLost,
        }
      });

      // 2. Process Items
      for (const item of items) {
        // Get the batch to verify and get costs
        const batch = await tx.stockBatch.findUnique({
          where: { id: item.stockBatchId }
        });

        if (!batch) throw new Error(`Lote no encontrado: ${item.stockBatchId}`);
        if (batch.currentQuantity < item.quantity) throw new Error(`Stock insuficiente en lote ${item.stockBatchId}`);

        // Calculate Cost Basis for this item
        // Cost Basis = (Gross * (1+Taxes) + Shipping - Incentive) * Quantity
        const taxMultiplier = 1 + (Number(batch.taxRate) + Number(batch.extraTaxRate)) / 100;
        const unitCostReal = (Number(batch.costGross) * taxMultiplier) + Number(batch.shippingCostUnit) - Number(batch.incentiveDiscountUnit);
        const totalCostBasis = unitCostReal * item.quantity;

        // Create SaleItem
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productCode: item.productCode,
            quantity: item.quantity,
            unitPriceSold: (isGift || isLost) ? 0 : item.unitPriceSold,
            totalCostBasis: totalCostBasis,
          }
        });

        // Allocate Batch (Trazabilidad)
        await tx.saleItemBatchAllocation.create({
          data: {
            saleItemId: saleItem.id,
            stockBatchId: batch.id,
            quantity: item.quantity,
            unitCostAtTime: unitCostReal,
          }
        });

        // Decrement Stock
        await tx.stockBatch.update({
          where: { id: batch.id },
          data: { currentQuantity: { decrement: item.quantity } }
        });
      }
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/products"); // Update stock view
    return { success: true };
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return { success: false, error: error.message || "Error al procesar la venta" };
  }
}

export async function getSales(month: number, year: number, query?: string, isGift?: boolean, isLost?: boolean) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const whereClause: any = {};

  if (isGift && isLost) {
    whereClause.OR = [
      { isGift: true },
      { isLost: true }
    ];
    // Date filter skipped
  } else if (isGift) {
    whereClause.isGift = true;
  } else if (isLost) {
    whereClause.isLost = true;
  } else {
    // Normal behavior: Filter by Month/Year
    whereClause.date = {
      gte: startDate,
      lte: endDate,
    };
  }



  const sales = await prisma.sale.findMany({
    where: whereClause,
    include: {
      items: {
        include: {
          product: true, // to get description
        }
      }
    },
    orderBy: { date: 'desc' }
  });

  // In-memory filter for generic accent-insensitive search on Client Name
  const filteredSales = query
    ? sales.filter(s => normalizeText(s.clientName).includes(normalizeText(query)))
    : sales;

  return filteredSales.map(s => ({
    ...s,
    totalAmount: Number(s.totalAmount),
    items: s.items.map(i => ({
      ...i,
      unitPriceSold: Number(i.unitPriceSold),
      totalCostBasis: Number(i.totalCostBasis),
      product: {
        ...i.product,
        listPrice: Number(i.product.listPrice),
        offerPrice: Number(i.product.offerPrice),
      }
    }))
  }));
}

export async function getAvailableStock(productCode: string) {
  const batches = await prisma.stockBatch.findMany({
    where: {
      productCode,
      currentQuantity: { gt: 0 }
    },
    orderBy: { expirationDate: 'asc' } // FIFO default
  });

  return batches.map(b => ({
    id: b.id,
    productCode: b.productCode,
    initialQuantity: b.initialQuantity,
    currentQuantity: b.currentQuantity,
    costGross: Number(b.costGross),
    taxRate: Number(b.taxRate),
    extraTaxRate: Number(b.extraTaxRate),
    shippingCostUnit: Number(b.shippingCostUnit),
    incentiveDiscountUnit: Number(b.incentiveDiscountUnit),
    expirationDate: b.expirationDate,
    entryDate: b.entryDate,
    offerPrice: Number(b.offerPrice),
  }));
}

// For initial load of product options in dropdown
export async function getProductsWithStock() {
  const stock = await prisma.stockBatch.groupBy({
    by: ['productCode'],
    where: { // Add extra ADVENTA safety filter even though they shouldn't have stock
      productCode: { not: { startsWith: "ADVENTA-" } }
    },
    _sum: { currentQuantity: true },
    having: {
      currentQuantity: { _sum: { gt: 0 } }
    }
  });

  const codes = stock.map(s => s.productCode);

  const products = await prisma.productCatalog.findMany({
    where: { code: { in: codes } }
  });

  return products.map(p => ({
    code: p.code,
    description: p.description,
    listPrice: Number(p.listPrice),
    offerPrice: Number(p.offerPrice),
    imageUrl: p.imageUrl,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

export async function getSaleById(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
          allocations: true
        }
      }
    }
  });

  if (!sale) return null;

  return {
    ...sale,
    totalAmount: Number(sale.totalAmount),
    items: sale.items.map(i => ({
      ...i,
      unitPriceSold: Number(i.unitPriceSold),
      totalCostBasis: Number(i.totalCostBasis),
      product: {
        ...i.product,
        listPrice: Number(i.product.listPrice),
        offerPrice: Number(i.product.offerPrice),
      },
      allocations: i.allocations.map(a => ({
        ...a,
        unitCostAtTime: Number(a.unitCostAtTime)
      }))
    }))
  };
}

export async function deleteSale(saleId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Get Sale Items and Allocations
      const saleItems = await tx.saleItem.findMany({
        where: { saleId },
        include: { allocations: true },
      });

      // 2. Restore Stock
      for (const item of saleItems) {
        for (const allocation of item.allocations) {
          await tx.stockBatch.update({
            where: { id: allocation.stockBatchId },
            data: { currentQuantity: { increment: allocation.quantity } },
          });
        }
      }

      // 3. Delete Sale (Cascades items and allocations usually, but manual cleanup is safer if no cascade)
      // Assuming Cascade Delete is configured in Schema. If not, delete allocs then items.
      // Let's delete explicitely to be safe or rely on Cascade. 
      // Checking schema would be best but for now standard Prisma Cascade:
      // If we delete Sale, Items go. 
      // But let's check if we need to manually delete allocations if they point to StockBatch (which is not deleted).

      // Let's rely on Sale deletion cascading to Items.
      // Allocations should cascade from SaleItem.

      await tx.sale.delete({
        where: { id: saleId },
      });
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (error) {
    console.error("Error deleting sale:", error);
    return { success: false, error: "Error al eliminar la venta." };
  }
}

export async function updateSale(saleId: string, payload: SalePayload) {
  const { date, clientName, clientPhone, notes, isGift, isLost = false, items } = payload;
  const totalAmount = (isGift || isLost) ? 0 : items.reduce((acc, item) => acc + (item.unitPriceSold * item.quantity), 0);

  try {
    await prisma.$transaction(async (tx) => {
      // ... (revert stock and delete items logic unchanged) ...

      // 1. REVERT STOCK from existing sale items
      const oldItems = await tx.saleItem.findMany({
        where: { saleId },
        include: { allocations: true },
      });

      for (const item of oldItems) {
        for (const allocation of item.allocations) {
          await tx.stockBatch.update({
            where: { id: allocation.stockBatchId },
            data: { currentQuantity: { increment: allocation.quantity } },
          });
        }
      }

      // 2. DELETE old items (Allocations cascade delete)
      await tx.saleItem.deleteMany({
        where: { saleId }
      });

      // 3. UPDATE Sale Header
      await tx.sale.update({
        where: { id: saleId },
        data: {
          date: new Date(date),
          clientName,
          clientPhone,
          notes: notes || "",
          totalAmount,
          isGift,
          isLost,
        }
      });

      // 4. CREATE new items (with stock deduction logic copied from createSale)
      for (const item of items) {
        const batch = await tx.stockBatch.findUnique({
          where: { id: item.stockBatchId }
        });

        if (!batch) throw new Error(`Lote no encontrado: ${item.stockBatchId}`);
        if (batch.currentQuantity < item.quantity) throw new Error(`Stock insuficiente en lote ${item.stockBatchId}`);

        const taxMultiplier = 1 + (Number(batch.taxRate) + Number(batch.extraTaxRate)) / 100;
        const unitCostReal = (Number(batch.costGross) * taxMultiplier) + Number(batch.shippingCostUnit) - Number(batch.incentiveDiscountUnit);
        const totalCostBasis = unitCostReal * item.quantity;

        const saleItem = await tx.saleItem.create({
          data: {
            saleId: saleId,
            productCode: item.productCode,
            quantity: item.quantity,
            unitPriceSold: (isGift || isLost) ? 0 : item.unitPriceSold,
            totalCostBasis: totalCostBasis,
          }
        });

        await tx.saleItemBatchAllocation.create({
          data: {
            saleItemId: saleItem.id,
            stockBatchId: batch.id,
            quantity: item.quantity,
            unitCostAtTime: unitCostReal,
          }
        });

        await tx.stockBatch.update({
          where: { id: batch.id },
          data: { currentQuantity: { decrement: item.quantity } }
        });
      }
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating sale:", error);
    return { success: false, error: error.message || "Error al actualizar la venta" };
  }
}
