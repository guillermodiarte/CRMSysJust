
"use server";

import { PrismaClient } from "@prisma/client";
import { getFinanceMetrics } from "./finance-actions";
import { addMonths } from "date-fns";

const prisma = new PrismaClient();

export async function getDashboardMetrics() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // 1. Finance Metrics for this month
  const finance = await getFinanceMetrics(currentMonth, currentYear);

  // 2. Total Stock Count
  const stockBatches = await prisma.stockBatch.findMany({
    where: { currentQuantity: { gt: 0 } },
    select: { currentQuantity: true }
  });
  const totalStock = stockBatches.reduce((acc, b) => acc + b.currentQuantity, 0);

  // 3. Ventas Realizadas Count
  const salesCount = await prisma.sale.count({
    where: {
      date: {
        gte: new Date(currentYear, currentMonth - 1, 1),
        lte: new Date(currentYear, currentMonth, 0, 23, 59, 59)
      }
    }
  });

  // 4. Users Count
  const usersCount = await prisma.user.count();

  // 5. Expiring Soon (Stocks expiring within Configured months)
  const config = await prisma.systemConfig.findFirst({ where: { id: 1 } });
  const expiryMonths = config?.expiryAlertMonths || 3;
  const expiryThreshold = addMonths(today, expiryMonths);

  const expiringSoonCount = await prisma.stockBatch.count({
    where: {
      currentQuantity: { gt: 0 },
      expirationDate: {
        lte: expiryThreshold,
        gte: today
      }
    }
  });

  // 6. Recent Sales (Limit 5)
  const recentSales = await prisma.sale.findMany({
    take: 5,
    orderBy: { date: 'desc' },
    include: { items: { include: { product: true } } } // Lightweight include
  });

  const recentSalesMapped = recentSales.map(s => ({
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

  return {
    finance,
    totalStock,
    salesCount,
    usersCount,
    expiringSoonCount,
    expiryAlertMonths: expiryMonths,
    recentSales: recentSalesMapped
  };
}
