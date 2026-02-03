
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
import { Check, Plus, Trash2 } from "lucide-react";
import { cn, formatCurrency, normalizeText } from "@/lib/utils";
import { toast } from "sonner";
import { createSale, getProductsWithStock, getAvailableStock } from "@/app/actions/sales-actions";
import { format } from "date-fns";

type SaleItemRow = {
  productCode: string;
  description: string;
  stockBatchId: string;
  quantity: number;

  // Prices
  costPrice: number;    // Calculated from batch
  listPrice: number;    // From catalog
  offerPrice: number;   // From catalog
  priceToCharge: number; // Editable (Unit Price Sold)

  // Computed
  profitPercentage: number;

  availableBatches: any[];
};

const calculateUnitCost = (batch: any) => {
  if (!batch) return 0;
  const taxMultiplier = 1 + (Number(batch.taxRate) + Number(batch.extraTaxRate)) / 100;
  return (Number(batch.costGross) * taxMultiplier) + Number(batch.shippingCostUnit) - Number(batch.incentiveDiscountUnit);
};

export default function NewSalePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Header Data
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [isLost, setIsLost] = useState(false);

  // Items
  const [items, setItems] = useState<SaleItemRow[]>([]);

  // Product Search
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    getProductsWithStock().then(setProducts);
  }, []);

  const addItem = async (product: any) => {
    setOpen(false);
    // Fetch batches for this product
    const batches = await getAvailableStock(product.code);

    if (batches.length === 0) {
      toast.error("No hay stock disponible para este producto");
      return;
    }

    // Default to first batch (FIFO)
    const defaultBatch = batches[0];
    const costPrice = calculateUnitCost(defaultBatch);
    const listPrice = Number(product.listPrice);
    const offerPrice = Number(product.offerPrice);

    // Default Price to Charge: Offer if exists, else List
    const priceToCharge = offerPrice > 0 ? offerPrice : listPrice;

    // Initial Profit %
    const profitPercentage = costPrice > 0 ? ((priceToCharge - costPrice) / costPrice) * 100 : 0;

    setItems([...items, {
      productCode: product.code,
      description: product.description,
      stockBatchId: defaultBatch.id,
      quantity: 1,

      costPrice,
      listPrice,
      offerPrice,
      priceToCharge,
      profitPercentage,

      availableBatches: batches,
    }]);
  };

  const updateItem = (index: number, field: keyof SaleItemRow, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    // Recalculate if Batch changes
    if (field === "stockBatchId") {
      const batch = item.availableBatches.find(b => b.id === value);
      item.costPrice = calculateUnitCost(batch);
    }

    // Recalculate Profit if Cost or PriceToCharge changes (or Batch implied cost change)
    if (field === "stockBatchId" || field === "priceToCharge") {
      const safePrice = isNaN(item.priceToCharge) ? 0 : item.priceToCharge;
      item.profitPercentage = item.costPrice > 0
        ? ((safePrice - item.costPrice) / item.costPrice) * 100
        : 0;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const confirmRemove = () => {
    if (deleteIndex !== null) {
      setItems(items.filter((_, i) => i !== deleteIndex));
      setDeleteIndex(null);
    }
  };

  const handleSubmit = async () => {
    if (!clientName) { toast.error("Falta el nombre del cliente"); return; }
    if (items.length === 0) { toast.error("Agrega productos a la venta"); return; }

    // Calculate total here or ensure valid ref? 
    // totalAmount is calculated below for render, but not needed for submit.

    setLoading(true);
    const res = await createSale({
      date,
      clientName,
      clientPhone,
      notes,
      isGift,
      isLost,
      items: items.map(i => ({
        productCode: i.productCode,
        stockBatchId: i.stockBatchId,
        quantity: i.quantity,
        unitPriceSold: (isGift || isLost) ? 0 : i.priceToCharge // Map to backend field
      }))
    });

    if (res.success) {
      toast.success("Venta registrada");
      router.push("/dashboard/sales");
      router.refresh();
    } else {
      toast.error(res.error);
      setLoading(false);
    }
  };

  const totalAmount = items.reduce((acc, i) => acc + (i.quantity * (isNaN(i.priceToCharge) ? 0 : i.priceToCharge)), 0);

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-3xl font-bold tracking-tight">Nueva Venta</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                placeholder="Nombre y Apellido"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                disabled={isLost}
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                placeholder="Opcional"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                disabled={isLost}
              />
            </div>
            <div className="space-y-2">
              <Label>Observaciones / Anotaciones</Label>
              <Input
                placeholder="Detalles relevantes de la venta..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="isGift"
                checked={isGift}
                disabled={isLost}
                onCheckedChange={(c) => {
                  const checked = !!c;
                  setIsGift(checked);
                }}
              />
              <Label htmlFor="isGift" className="font-bold">¿Es un Regalo?</Label>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="isLost"
                checked={isLost}
                disabled={isGift}
                onCheckedChange={(c) => {
                  const checked = !!c;
                  setIsLost(checked);
                  if (checked) {
                    setClientName("Perdida/Roto"); // Auto-fill
                    setClientPhone(""); // Clear phone
                  } else {
                    setClientName(""); // Clear
                  }
                }}
              />
              <Label htmlFor="isLost" className="font-bold text-red-600">Stock Perdido/Roto</Label>
            </div>
            {(isGift || isLost) && <p className="text-sm text-purple-600">El precio de venta de los productos será $0.00</p>}


          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total a Cobrar:</span>
              <span>{(isGift || isLost) ? "$0.00" : formatCurrency(totalAmount)}</span>
            </div>
            {(isGift || isLost) && <div className="text-sm text-muted-foreground">
              Costo real {isGift ? "del regalo" : "de la pérdida"}: {formatCurrency(items.reduce((acc, i) => acc + (i.quantity * i.costPrice), 0))}
            </div>}
            <Button className="w-full mt-4" size="lg" onClick={handleSubmit} disabled={loading}>
              {loading ? "Procesando..." : (isLost ? "Confirmar Pérdida" : (isGift ? "Confirmar Regalo" : "Confirmar Venta"))}
            </Button>
            <Button className="w-full mt-2" variant="outline" onClick={() => router.push("/dashboard/sales")}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Productos</CardTitle>
          {mounted ? (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-[300px] justify-between">
                  {open ? "Selecciona un producto..." : "Buscar Producto Stock..."} <Plus className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command filter={(value, search) => {
                  if (value.includes(normalizeText(search))) return 1;
                  return 0;
                }}>
                  <CommandInput placeholder="Buscar..." />
                  <CommandList>
                    <CommandEmpty>No hay stock disponible.</CommandEmpty>
                    <CommandGroup>
                      {products.map((product) => (
                        <CommandItem
                          key={product.code}
                          value={`${product.description} ${product.code} ${normalizeText(product.description)} ${product.code.startsWith("ADVENTA") || product.code.startsWith("AYUDA") ? "ayuda de venta adventa" : ""} ${product.code.startsWith("ELIMITADA") ? "edicion limitada elimitada" : ""}`}
                          onSelect={() => addItem(product)}
                        >
                          <Check className={cn("mr-2 h-4 w-4", items.some(i => i.productCode === product.code) ? "opacity-100" : "opacity-0")} />
                          {product.description}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <Button variant="outline" className="w-[300px] justify-between" disabled>
              Cargando... <Plus className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto hidden 2xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Producto</TableHead>
                  <TableHead className="w-[200px]">Lote</TableHead>
                  <TableHead className="w-[130px]">Cant.</TableHead>
                  <TableHead className="w-[100px] text-right">Costo</TableHead>
                  <TableHead className="w-[100px] text-right">Lista</TableHead>
                  <TableHead className="w-[100px] text-right">Oferta</TableHead>
                  <TableHead className="w-[120px]">A Cobrar</TableHead>
                  <TableHead className="w-[80px] text-right">% Gan.</TableHead>
                  <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                      Selecciona productos para vender
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <span className="font-medium">{item.description}</span><br />
                        <span className="text-xs text-muted-foreground">{item.productCode}</span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.stockBatchId}
                          onValueChange={(val) => updateItem(index, "stockBatchId", val)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {item.availableBatches.map(b => (
                              <SelectItem key={b.id} value={b.id}>
                                Vence {format(new Date(b.expirationDate), "MM/yyyy")} (Disp: {b.currentQuantity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          max={item.availableBatches.find(b => b.id === item.stockBatchId)?.currentQuantity || 1}
                          value={item.quantity || ""}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            updateItem(index, "quantity", isNaN(val) ? 0 : val);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.costPrice)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.listPrice)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {item.offerPrice > 0 ? formatCurrency(item.offerPrice) : "-"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={(isGift || isLost) ? 0 : (isNaN(item.priceToCharge) ? "" : item.priceToCharge)}
                          onChange={e => updateItem(index, "priceToCharge", parseFloat(e.target.value))}
                          disabled={isGift || isLost}
                          className="text-right font-bold w-24 ml-auto"
                        />
                      </TableCell>
                      <TableCell className={cn("text-right text-xs font-bold", ((isGift || isLost) ? -100 : item.profitPercentage) < 30 ? "text-red-500" : "text-green-600")}>
                        {((isGift || isLost) ? -100 : item.profitPercentage).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {(isGift || isLost) ? "$0.00" : formatCurrency(item.quantity * item.priceToCharge)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteIndex(index);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 2xl:hidden">
            {items.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-lg border text-muted-foreground">
                Selecciona productos para vender
              </div>
            ) : (
              items.map((item, index) => (
                <Card key={index} className="shadow-sm border">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base font-bold">{item.description}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteIndex(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{item.productCode}</p>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3">
                    {/* Batch Selection */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Lote</Label>
                      <Select
                        value={item.stockBatchId}
                        onValueChange={(val) => updateItem(index, "stockBatchId", val)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {item.availableBatches.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              Vence {format(new Date(b.expirationDate), "MM/yyyy")} (Disp: {b.currentQuantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Quantity */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          max={item.availableBatches.find(b => b.id === item.stockBatchId)?.currentQuantity || 1}
                          value={item.quantity || ""}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            updateItem(index, "quantity", isNaN(val) ? 0 : val);
                          }}
                          className="h-9"
                        />
                      </div>

                      {/* Price to Charge */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">A cobrar (Unit)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={(isGift || isLost) ? 0 : (isNaN(item.priceToCharge) ? "" : item.priceToCharge)}
                          onChange={e => updateItem(index, "priceToCharge", parseFloat(e.target.value))}
                          disabled={isGift || isLost}
                          className="h-9 text-right font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t">
                      {/* Left Column: Prices Info */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lista:</span>
                          <span>{formatCurrency(item.listPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Oferta:</span>
                          <span className={cn(item.offerPrice > 0 ? "text-green-600 font-bold" : "")}>
                            {item.offerPrice > 0 ? formatCurrency(item.offerPrice) : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Costo:</span>
                          <span>{formatCurrency(item.costPrice)}</span>
                        </div>
                      </div>

                      {/* Right Column: Profit & Subtotal */}
                      <div className="space-y-1 border-l pl-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Ganancia:</span>
                          <span className={cn("font-bold px-1 rounded", item.profitPercentage < 30 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600")}>
                            {item.profitPercentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-bold text-base">Total:</span>
                          <span className="font-bold text-base">{(isGift || isLost) ? "$0.00" : formatCurrency(item.quantity * item.priceToCharge)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteIndex !== null} onOpenChange={(val) => { if (!val) setDeleteIndex(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas quitar este producto de la venta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
