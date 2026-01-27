"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Briefcase, Calendar } from "lucide-react";
import { getExpenses, createExpense, deleteExpense } from "@/app/actions/expense-actions";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import { getSystemConfig } from "@/app/actions/config-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SalesHelpPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>(String(currentYear));
  const [yearRange, setYearRange] = useState<number[]>([currentYear]);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    quantity: "1"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    // Load config for year range
    getSystemConfig().then(config => {
      const min = config.filterMinYear || 2020;
      const max = config.filterMaxYear || 2050;
      const years = [];
      for (let y = max; y >= min; y--) {
        years.push(y);
      }
      setYearRange(years);
    });
  }, []);

  const loadData = async () => {
    const data = await getExpenses(Number(month), Number(year));
    setExpenses(data);
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  const handleCreate = async () => {
    if (!newExpense.description || !newExpense.amount) {
      toast.error("Complete todos los campos");
      return;
    }

    setIsSubmitting(true);
    const res = await createExpense({
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      date: new Date(newExpense.date + "T12:00:00"), // Fix timezone issue simply
      quantity: parseInt(newExpense.quantity) || 1
    });

    if (res.success) {
      toast.success("Gasto registrado");
      setNewExpense({ description: "", amount: "", date: format(new Date(), "yyyy-MM-dd"), quantity: "1" });
      setIsNewOpen(false);
      loadData();
    } else {
      toast.error(res.error);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await deleteExpense(deleteId);
    if (res.success) {
      toast.success("Gasto eliminado");
      loadData();
    } else {
      toast.error(res.error);
    }
    setDeleteId(null);
  };

  const totalAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Ayuda de Venta</h1>
        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Gasto Operativo</DialogTitle>
              <DialogDescription>
                Bolsas, folletería, muestras, etc.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  className="col-span-3"
                  value={newExpense.quantity}
                  onChange={(e) => setNewExpense({ ...newExpense, quantity: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  className="col-span-3"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="desc" className="text-right">Descripción</Label>
                <Input
                  id="desc"
                  placeholder="Ej: Bolsas de regalo"
                  className="col-span-3"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Monto Total</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="col-span-3"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-full text-blue-600">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Gastos (Periodo)</p>
            <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {format(new Date(2000, i, 1), "MMMM", { locale: es }).charAt(0).toUpperCase() + format(new Date(2000, i, 1), "MMMM", { locale: es }).slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {yearRange.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="hidden md:block rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Código</TableHead>
              <TableHead className="w-[80px]">Cant.</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">No hay gastos en este periodo.</TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{expense.code || "-"}</TableCell>
                  <TableCell className="text-center">{expense.quantity}</TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    -{formatCurrency(Number(expense.amount))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(expense.id)}>
                      <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {expenses.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-lg border text-muted-foreground">
            No hay gastos en este periodo.
          </div>
        ) : (
          expenses.map((expense) => (
            <Card key={expense.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold">{expense.description}</CardTitle>
                    <div className="flex gap-2 text-xs text-muted-foreground font-mono">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(expense.date), "dd/MM/yyyy")}
                      </span>
                      {expense.code && <span>| {expense.code}</span>}
                      <span>| x{expense.quantity}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3 text-sm flex justify-end">
                <span className="font-bold text-lg text-red-600">-{formatCurrency(Number(expense.amount))}</span>
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-3 bg-gray-50/50 rounded-b-lg">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteId(expense.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
