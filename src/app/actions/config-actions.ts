"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function getSystemConfig() {
  let config = await prisma.systemConfig.findFirst({
    where: { id: 1 },
  });

  if (!config) {
    config = await prisma.systemConfig.create({
      data: {
        id: 1,
        ivaPercentage: 21.0,
        extraTaxPercentage: 3.0,
        expiryAlertMonths: 3,
        filterMinYear: 2020,
        filterMaxYear: 2050,
      },
    });
  }

  // Explicitly return a POJO with numbers to avoid "Decimal" serialization issues
  return {
    id: config.id,
    ivaPercentage: Number(config.ivaPercentage),
    extraTaxPercentage: Number(config.extraTaxPercentage),
    expiryAlertMonths: config.expiryAlertMonths,
    filterMinYear: config.filterMinYear,
    filterMaxYear: config.filterMaxYear,
    updatedAt: config.updatedAt,
  };
}

export async function updateSystemConfig(data: {
  ivaPercentage: number;
  extraTaxPercentage: number;
  expiryAlertMonths: number;
  filterMinYear: number;
  filterMaxYear: number;
}) {
  try {
    const config = await prisma.systemConfig.upsert({
      where: { id: 1 },
      update: {
        ivaPercentage: data.ivaPercentage,
        extraTaxPercentage: data.extraTaxPercentage,
        expiryAlertMonths: data.expiryAlertMonths,
        filterMinYear: data.filterMinYear,
        filterMaxYear: data.filterMaxYear,
      },
      create: {
        id: 1,
        ivaPercentage: data.ivaPercentage,
        extraTaxPercentage: data.extraTaxPercentage,
        expiryAlertMonths: data.expiryAlertMonths,
        filterMinYear: data.filterMinYear,
        filterMaxYear: data.filterMaxYear,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/products/new"); // Affects stock entry calculations

    // Return serialized data
    return {
      success: true,
      data: {
        id: config.id,
        ivaPercentage: Number(config.ivaPercentage),
        extraTaxPercentage: Number(config.extraTaxPercentage),
        expiryAlertMonths: config.expiryAlertMonths,
        filterMinYear: config.filterMinYear,
        filterMaxYear: config.filterMaxYear,
        updatedAt: config.updatedAt,
      }
    };
  } catch (error) {
    console.error("Error updating system config:", error);
    return { success: false, error: "Error al actualizar la configuración." };
  }
}
