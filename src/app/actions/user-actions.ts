
"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function getUsers() {
  return await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
}

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // In production, HASH this password!
  const bcrypt = require("bcryptjs");
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "El email ya existe" };
  }
}

export async function deleteUser(id: string) {
  try {
    // Prevent deleting last admin? 
    const count = await prisma.user.count();
    if (count <= 1) return { success: false, error: "No puedes eliminar al último usuario" };

    await prisma.user.delete({ where: { id } });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al eliminar" };
  }
}
export async function updateUser(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    // Check if email belongs to another user
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing && existing.id !== id) {
      return { success: false, error: "El email ya está en uso por otro usuario." };
    }

    const data: any = { name, email };
    if (password && password.trim() !== "") {
      const bcrypt = require("bcryptjs");
      data.password = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id },
      data,
    });

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al actualizar usuario" };
  }
}
