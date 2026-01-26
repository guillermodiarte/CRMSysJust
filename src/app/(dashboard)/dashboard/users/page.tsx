
"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus, Users, Eye, EyeOff, Edit } from "lucide-react";
import { toast } from "sonner";
import { createUser, deleteUser, getUsers, updateUser } from "@/app/actions/user-actions";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const loadUsers = async () => {
    const data = await getUsers();
    setUsers(data);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    let res;
    if (editingUser) {
      res = await updateUser(editingUser.id, formData);
    } else {
      res = await createUser(formData);
    }

    if (res.success) {
      toast.success(editingUser ? "Usuario actualizado" : "Usuario creado");
      setIsOpen(false);
      setEditingUser(null);
      loadUsers();
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
    const res = await deleteUser(id);
    if (res.success) {
      toast.success("Usuario eliminado");
      loadUsers();
    } else {
      toast.error(res.error);
    }
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setIsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
        <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) setEditingUser(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingUser(null)}>
              <UserPlus className="mr-2 h-4 w-4" /> Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuario" : "Agregar Nuevo Usuario"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input name="name" required placeholder="Nombre Completo" defaultValue={editingUser?.name} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" required placeholder="correo@ejemplo.com" defaultValue={editingUser?.email} />
              </div>
              <div className="space-y-2">
                <Label>Contraseña {editingUser && "(Dejar en blanco para no cambiar)"}</Label>
                <div className="relative">
                  <Input name="password" type={showPassword ? "text" : "password"} required={!editingUser} className="pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full">{editingUser ? "Guardar Cambios" : "Crear Usuario"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="hidden md:block rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Fecha Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" /> {user.name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-xs uppercase bg-gray-100 px-2 py-1 rounded inline-block">{user.role}</TableCell>
                <TableCell>{format(new Date(user.createdAt), "dd/MM/yyyy")}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                    <Edit className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {users.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-lg border text-muted-foreground">
            No hay usuarios registrados.
          </div>
        ) : (
          users.map((user) => (
            <Card key={user.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      {user.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="text-xs uppercase bg-gray-100 px-2 py-1 rounded font-medium">
                    {user.role}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pb-3 text-sm">
                <div className="text-xs text-muted-foreground">
                  Creado: {format(new Date(user.createdAt), "dd/MM/yyyy")}
                </div>
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-3 border-t pt-3 bg-gray-50/50 rounded-b-lg">
                <Button variant="outline" size="sm" onClick={() => openEdit(user)} className="w-full">
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(user.id)} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
