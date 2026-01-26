
"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getFinanceMetrics(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // 1. Total Revenue (Ventas)
  const sales = await prisma.sale.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: { items: true }
  });

  const revenue = sales.reduce((acc, sale) => acc + Number(sale.totalAmount), 0);

  // 2. Total Expenses (Compras de Stock) -> Cash Flow View
  const batches = await prisma.stockBatch.findMany({
    where: { entryDate: { gte: startDate, lte: endDate } }
  });

  let expenses = 0;
  for (const batch of batches) {
    const gross = Number(batch.costGross);
    const taxMultiplier = 1 + (Number(batch.taxRate) + Number(batch.extraTaxRate)) / 100;
    const unitCostTotal = (gross + Number(batch.shippingCostUnit) - Number(batch.incentiveDiscountUnit)) * taxMultiplier;
    expenses += unitCostTotal * batch.initialQuantity;
  }



  // 3. Sales Cost vs Gift Cost
  let salesCost = 0;
  let giftCost = 0;

  for (const sale of sales) {
    const saleCost = sale.items.reduce((acc, item) => acc + Number(item.totalCostBasis), 0);

    if (sale.isGift) {
      giftCost += saleCost;
    } else {
      salesCost += saleCost;
    }
  }

  // 4. Sales Profit (Pure profit from non-gift sales)
  const salesProfit = revenue - salesCost;

  // 5. Net Profit (Cash Flow: Revenue - Stock Purchases)
  // User might confusing "Net Profit" with "Cash Flow".
  // Let's keep "netProfit" as Cash Flow (Revenue - Expenses) as defined before, 
  // or maybe "Overall Net" = Sales Profit - Gift Cost? 
  // No, the existing dashboard defines "Ganancia Neta" as "Flujo de Caja (Ventas - Compras)".
  // We will preserve that variable name for the existing card, but maybe clarify label.
  const netProfit = revenue - expenses;

  return {
    revenue,
    expenses,
    netProfit, // Cash Flow
    giftCost,
    salesCost,
    salesProfit, // New Metric
  };
}

export async function getAnnualFinanceMetrics(year: number) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  // 1. Fetch all sales for the year
  const sales = await prisma.sale.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: { items: true }
  });

  // 2. Fetch all expenses (stock) for the year
  const batches = await prisma.stockBatch.findMany({
    where: { entryDate: { gte: startDate, lte: endDate } }
  });

  // 3. Aggregate by month
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    name: new Date(year, i, 1).toLocaleString('es-ES', { month: 'short' }), // Ene, Feb, etc.
    revenue: 0,
    expenses: 0,
    netProfit: 0,
    salesProfit: 0
  }));

  // Process Sales (Revenue & Sales Profit)
  for (const sale of sales) {
    const monthIndex = sale.date.getMonth(); // 0-11
    const amount = Number(sale.totalAmount);

    // Calculate cost for this sale
    const saleCost = sale.items.reduce((acc, item) => acc + Number(item.totalCostBasis), 0);
    const profit = amount - saleCost;

    monthlyData[monthIndex].revenue += amount;
    if (!sale.isGift) {
      monthlyData[monthIndex].salesProfit += profit;
    }
  }

  // Process Expenses
  for (const batch of batches) {
    const monthIndex = batch.entryDate.getMonth();
    const gross = Number(batch.costGross);
    const taxMultiplier = 1 + (Number(batch.taxRate) + Number(batch.extraTaxRate)) / 100;
    const unitCostTotal = (gross + Number(batch.shippingCostUnit) - Number(batch.incentiveDiscountUnit)) * taxMultiplier;
    const totalExpense = unitCostTotal * batch.initialQuantity;

    monthlyData[monthIndex].expenses += totalExpense;
  }

  // Calculate Net Profit (Cash Flow) for each month
  monthlyData.forEach(m => {
    m.netProfit = m.revenue - m.expenses;
  });

  return monthlyData;
}
