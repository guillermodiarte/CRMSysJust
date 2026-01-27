
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, AlertTriangle, Trash2, Pencil, MoreHorizontal, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { getStockBatches, deleteStockBatch, updateStockBatch } from "@/app/actions/stock-actions";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

import { getSystemConfig } from "@/app/actions/config-actions";

export default function StockPaged() {
  const [batches, setBatches] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [config, setConfig] = useState({ expiryAlertMonths: 3 });

  // State for Dialogs
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    currentQuantity: 0,
    offerPrice: 0,
    expirationDate: ""
  });

  const loadData = async () => {
    const data = await getStockBatches(search);
    setBatches(data);
  };

  useEffect(() => {
    getSystemConfig().then(c => setConfig({ expiryAlertMonths: c.expiryAlertMonths }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEditClick = (batch: any) => {
    setSelectedBatch(batch);
    setEditForm({
      currentQuantity: batch.currentQuantity,
      offerPrice: Number(batch.offerPrice),
      expirationDate: new Date(batch.expirationDate).toISOString().split('T')[0]
    });
    setIsEditOpen(true);
  };

  const handleDeleteClick = (batch: any) => {
    setSelectedBatch(batch);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedBatch) return;
    const res = await deleteStockBatch(selectedBatch.id);
    if (res.success) {
      toast.success("Lote eliminado correctamente");
      loadData();
      setIsDeleteOpen(false);
    } else {
      toast.error(res.error);
    }
  };

  const confirmEdit = async () => {
    if (!selectedBatch) return;
    if (editForm.currentQuantity < 1) {
      toast.error("La cantidad debe ser mayor o igual a 1");
      return;
    }
    const res = await updateStockBatch(selectedBatch.id, {
      currentQuantity: Number(editForm.currentQuantity),
      offerPrice: Number(editForm.offerPrice),
      expirationDate: editForm.expirationDate
    });

    if (res.success) {
      toast.success("Lote actualizado");
      loadData();
      setIsEditOpen(false);
    } else {
      toast.error(res.error);
    }
  };

  const getExpiryStatus = (dateStr: Date) => {
    const today = new Date();
    const expiry = new Date(dateStr);
    const monthsDiff = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsDiff < 0) return { color: "text-red-600 font-bold", label: "VENCIDO" };
    if (monthsDiff < (config.expiryAlertMonths || 3)) return { color: "text-orange-500 font-bold", label: "Próximo a Vencer" };
    return { color: "text-green-600", label: "OK" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Stock Disponible</h1>
        <Link href="/dashboard/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Ingreso
          </Button>
        </Link>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o nombre..."
            className="pl-8"

            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowDetails(!showDetails)}
          title={showDetails ? "Ocultar Detalles" : "Ver Detalles"}
        >
          {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showDetails ? "Menos Info" : "Más Info"}
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingreso</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Costo Bruto</TableHead>
              {showDetails && (
                <>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Impuesto Extra</TableHead>
                  <TableHead className="text-right">Envío</TableHead>
                </>
              )}
              <TableHead className="text-right font-bold bg-gray-50">Costo Total</TableHead>
              <TableHead className="text-right">Precio Lista</TableHead>
              <TableHead className="text-right">Precio Oferta</TableHead>
              <TableHead className="text-right">Vencimiento</TableHead>
              <TableHead className="text-right sticky right-0 bg-white z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showDetails ? 13 : 9} className="h-24 text-center">No hay stock disponible.</TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => {
                const status = getExpiryStatus(batch.expirationDate);
                const gross = Number(batch.costGross);
                const taxMultiplier = 1 + (Number(batch.taxRate) + Number(batch.extraTaxRate)) / 100;
                const taxAmt = gross * (Number(batch.taxRate) + Number(batch.extraTaxRate)) / 100;
                const totalUnitCost = (gross + Number(batch.shippingCostUnit) - Number(batch.incentiveDiscountUnit)) * taxMultiplier;

                return (
                  <TableRow key={batch.id}>
                    <TableCell>{format(new Date(batch.entryDate), "dd/MM/yy")}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{batch.product.description}</span>
                        <span className="text-xs text-muted-foreground">{batch.productCode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">{batch.currentQuantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(gross)}</TableCell>
                    {showDetails && (
                      <>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          +{formatCurrency(gross * Number(batch.taxRate) / 100)}
                          <br />({Number(batch.taxRate)}%)
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          +{formatCurrency(gross * Number(batch.extraTaxRate) / 100)}
                          <br />({Number(batch.extraTaxRate)}%)
                        </TableCell>
                        <TableCell className="text-right text-xs text-orange-600">+{formatCurrency(Number(batch.shippingCostUnit))}</TableCell>
                      </>
                    )}
                    <TableCell className="text-right font-bold bg-gray-50">{formatCurrency(totalUnitCost)}</TableCell>
                    <TableCell className="text-right">
                      <span className={Number(batch.product.offerPrice) > 0 ? "line-through text-gray-400" : ""}>
                        {formatCurrency(Number(batch.product.listPrice))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {Number(batch.product.offerPrice) > 0 ? formatCurrency(Number(batch.product.offerPrice)) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={cn("flex flex-col items-end", status.color)}>
                        <span>{format(new Date(batch.expirationDate), "MM/yy")}</span>
                        {status.label !== "OK" && (
                          <span className="text-[10px] flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> {status.label}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="sticky right-0 bg-white z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(batch)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteClick(batch)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
        {batches.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-lg border text-muted-foreground">
            No hay stock disponible.
          </div>
        ) : (
          batches.map((batch) => {
            const status = getExpiryStatus(batch.expirationDate);
            const gross = Number(batch.costGross);
            const taxMultiplier = 1 + (Number(batch.taxRate) + Number(batch.extraTaxRate)) / 100;
            const totalUnitCost = (gross + Number(batch.shippingCostUnit) - Number(batch.incentiveDiscountUnit)) * taxMultiplier;

            return (
              <Card key={batch.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold">{batch.product.description}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{batch.productCode}</p>
                    </div>
                    <div className={cn("text-xs font-bold px-2 py-1 rounded-full text-center flex items-center justify-center h-fit",
                      status.label === "OK" ? "bg-green-100 text-green-700" :
                        status.label === "VENCIDO" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {status.label === "OK" ? format(new Date(batch.expirationDate), "MM/yy") : status.label}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Cantidad</span>
                      <span className="font-bold text-lg">{batch.currentQuantity}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground">Costo Total Unit.</span>
                      <span className="font-bold text-base bg-gray-100 px-2 rounded">{formatCurrency(totalUnitCost)}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Precio Lista</span>
                      <span className={cn("font-medium", Number(batch.product.offerPrice) > 0 && "line-through text-gray-400")}>
                        {formatCurrency(Number(batch.product.listPrice))}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground">Precio Oferta</span>
                      <span className="font-bold text-green-600">
                        {Number(batch.product.offerPrice) > 0 ? formatCurrency(Number(batch.product.offerPrice)) : "-"}
                      </span>
                    </div>
                  </div>

                  {showDetails && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Costo Bruto</span>
                        {formatCurrency(gross)}
                      </div>
                      <div className="text-center">
                        <span className="text-muted-foreground block">Impuestos</span>
                        {Number(batch.taxRate) + Number(batch.extraTaxRate)}%
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground block text-orange-600">Envío</span>
                        +{formatCurrency(Number(batch.shippingCostUnit))}
                      </div>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                    Ingreso: {format(new Date(batch.entryDate), "dd/MM/yy")}
                  </div>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-3 border-t pt-3 bg-gray-50/50 rounded-b-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(batch)}
                    className="w-full"
                  >
                    <Pencil className="h-4 w-4 mr-2" /> Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDeleteClick(batch)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar Lote de Stock?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Solo es posible eliminar lotes que NO tengan ventas asociadas.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">
              Estás eliminando el ingreso de <strong>{selectedBatch?.product?.description}</strong> del {selectedBatch && format(new Date(selectedBatch.entryDate), "dd/MM/yyyy")}.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Lote</DialogTitle>
            <DialogDescription>
              Modifica los detalles del lote. Ten cuidado al cambiar cantidades si ya hubo movimientos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="qty" className="text-right">
                Cantidad
              </Label>
              <Input
                id="qty"
                type="number"
                min="1"
                className="col-span-3"
                value={editForm.currentQuantity}
                onChange={(e) => setEditForm({ ...editForm, currentQuantity: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="exp" className="text-right">
                Vencimiento
              </Label>
              <Input
                id="exp"
                type="date"
                className="col-span-3"
                value={editForm.expirationDate}
                onChange={(e) => setEditForm({ ...editForm, expirationDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={confirmEdit}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
