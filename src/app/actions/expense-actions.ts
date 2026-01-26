"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function getExpenses(month?: number, year?: number) {
  try {
    const where: any = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: {
        date: "desc",
      },
    });

    return expenses;
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

export async function createExpense(data: { description: string; amount: number; date: Date }) {
  try {
    const newExpense = await prisma.expense.create({
      data: {
        description: data.description,
        amount: data.amount,
        date: data.date,
      },
    });
    revalidatePath("/dashboard/sales-help");
    return { success: true, expense: newExpense };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { success: false, error: "Error al crear el gasto" };
  }
}

export async function deleteExpense(id: string) {
  try {
    await prisma.expense.delete({
      where: { id },
    });
    revalidatePath("/dashboard/sales-help");
    return { success: true };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error: "Error al eliminar el gasto" };
  }
}
