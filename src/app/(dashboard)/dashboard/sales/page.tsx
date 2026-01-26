
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Gift, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { getSales, deleteSale } from "@/app/actions/sales-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

import { getSystemConfig } from "@/app/actions/config-actions";

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>(String(currentYear));
  const [search, setSearch] = useState("");
  const [onlyGifts, setOnlyGifts] = useState(false);
  const [yearRange, setYearRange] = useState<number[]>([currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4]);

  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);

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
    const data = await getSales(Number(month), Number(year), search, onlyGifts);
    setSales(data);
  };

  const confirmDelete = async () => {
    if (!deleteSaleId) return;

    const res = await deleteSale(deleteSaleId);
    if (res.success) {
      toast.success("Venta eliminada y stock restaurado");
      loadData();
    } else {
      toast.error(res.error);
    }
    setDeleteSaleId(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [month, year, search, onlyGifts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
        <Link href="/dashboard/sales/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nueva Venta
          </Button>
        </Link>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-lg border shadow-sm flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 border-l pl-4 border-r pr-4">
          <Checkbox
            id="gift-filter"
            checked={onlyGifts}
            onCheckedChange={(c) => setOnlyGifts(!!c)}
          />
          <Label htmlFor="gift-filter" className="cursor-pointer">Solo Regalos</Label>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${onlyGifts ? "text-muted-foreground" : ""}`}>Periodo:</span>
          <Select value={month} onValueChange={setMonth} disabled={onlyGifts}>
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
          <Select value={year} onValueChange={setYear} disabled={onlyGifts}>
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

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead className="text-right">Total Venta</TableHead>
              <TableHead className="text-right">Costo Total</TableHead>
              <TableHead className="text-right">Ganancia $</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-center w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">No hay ventas registradas.</TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => {
                const totalCost = sale.items.reduce((acc: number, item: any) => acc + Number(item.totalCostBasis), 0);
                const totalSale = Number(sale.totalAmount);
                const profit = totalSale - totalCost;
                const profitPercent = totalSale > 0 ? (profit / totalSale) * 100 : 0;

                return (
                  <TableRow key={sale.id} className={sale.isGift ? "bg-purple-50" : ""}>
                    <TableCell>{format(new Date(sale.date), "dd/MM/yy")}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{sale.clientName}</span>
                        <span className="text-xs text-muted-foreground">{sale.clientPhone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sale.items.map((item: any) => (
                        <div key={item.id} className="text-sm">
                          {item.quantity}x {item.product.description}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {sale.isGift ? (
                        <div className="flex items-center justify-end text-purple-600">
                          <Gift className="w-4 h-4 mr-1" /> REGALO
                        </div>
                      ) : (
                        `$${totalSale.toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      ${totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell className={cn("text-right font-medium", profit < 0 ? "text-red-600" : "text-green-600")}>
                      ${profit.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {sale.isGift ? "0%" : `${profitPercent.toFixed(1)}%`}
                    </TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Link href={`/dashboard/sales/${sale.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteSaleId(sale.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {sales.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-lg border text-muted-foreground">
            No hay ventas registradas.
          </div>
        ) : (
          sales.map((sale) => {
            const totalCost = sale.items.reduce((acc: number, item: any) => acc + Number(item.totalCostBasis), 0);
            const totalSale = Number(sale.totalAmount);
            const profit = totalSale - totalCost;
            const profitPercent = totalSale > 0 ? (profit / totalSale) * 100 : 0;

            return (
              <Card key={sale.id} className={cn("shadow-sm", sale.isGift ? "bg-purple-50" : "")}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold">{sale.clientName}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">
                        {format(new Date(sale.date), "dd/MM/yy")}
                      </p>
                    </div>
                    {sale.isGift && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Gift className="w-3 h-3 mr-1" /> REGALO
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pb-3 text-sm space-y-3">
                  {/* Products */}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">Productos:</span>
                    {sale.items.map((item: any) => (
                      <div key={item.id} className="text-sm pl-2 border-l-2 border-gray-200">
                        {item.quantity}x {item.product.description}
                      </div>
                    ))}
                  </div>

                  {/* Financials in Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    {/* Total Sale */}
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Total Venta</span>
                      <span className="font-bold text-lg">
                        {sale.isGift ? "$0.00" : `$${totalSale.toFixed(2)}`}
                      </span>
                    </div>

                    {/* Profit */}
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground">Ganancia</span>
                      <div className="flex items-center">
                        <span className={cn("font-medium", profit < 0 ? "text-red-600" : "text-green-600")}>
                          ${profit.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({sale.isGift ? "0%" : `${profitPercent.toFixed(1)}%`})
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-3 border-t pt-3 bg-gray-50/50 rounded-b-lg">
                  <Link href={`/dashboard/sales/${sale.id}/edit`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="h-4 w-4 mr-2" /> Editar
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteSaleId(sale.id)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog open={!!deleteSaleId} onOpenChange={(val: boolean) => { if (!val) setDeleteSaleId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la venta y restaurará el stock de los productos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
