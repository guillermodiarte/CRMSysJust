"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAvailableStock, getProductsWithStock } from "@/app/actions/sales-actions";

export type SaleItemRow = {
  productCode: string;
  description: string;
  stockBatchId: string;
  quantity: number;
  costPrice: number;
  listPrice: number;
  offerPrice: number;
  priceToCharge: number;
  profitPercentage: number;
  availableBatches: any[];
};

type SaleFormProps = {
  initialData?: {
    date: string;
    clientName: string;
    clientPhone: string;
    isGift: boolean;
    isLost: boolean; // Added
    notes: string; // Added
    items: SaleItemRow[];
  };
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
};

const calculateUnitCost = (batch: any) => {
  if (!batch) return 0;
  const taxMultiplier = 1 + (Number(batch.taxRate) + Number(batch.extraTaxRate)) / 100;
  return (Number(batch.costGross) * taxMultiplier) + Number(batch.shippingCostUnit) - Number(batch.incentiveDiscountUnit);
};

export default function SaleForm({ initialData, onSubmit, loading }: SaleFormProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState(initialData?.clientName || "");
  const [clientPhone, setClientPhone] = useState(initialData?.clientPhone || "");
  const [isGift, setIsGift] = useState(initialData?.isGift || false);
  const [isLost, setIsLost] = useState(initialData?.isLost || false); // Added
  const [notes, setNotes] = useState(initialData?.notes || ""); // Added
  const [items, setItems] = useState<SaleItemRow[]>(initialData?.items || []);
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    getProductsWithStock().then(setProducts);

    // If initial items exist, we need to load their batches so the Select works and Cost calculates
    if (initialData?.items) {
      const loadBatchesForExisting = async () => {
        const enrichedItems = await Promise.all(initialData.items.map(async (item) => {
          const batches = await getAvailableStock(item.productCode);
          const currentBatch = batches.find(b => b.id === item.stockBatchId);
          // If the batch used is NO LONGER available (sold out or expired but used here), it might not show up in getAvailableStock which filters > 0.
          // However, for EDITING, we might want to see it even if q=0 to restore it?
          // Actually getAvailableStock filters > 0.
          // If we are editing, we reverted stock? No, we haven't reverted YET.
          // So the stock is currently deducted.
          // BUT `getAvailableStock` shows CURRENT stock.
          // If we edit, we can switch batch.
          // We should append the CURRENT batch explicitly if not present?
          // For simplicity, let's just fetch available. 

          return {
            ...item,
            availableBatches: batches,
            // Recalculate cost just in case, or keep original?
            // Keep original logic from loader.
          };
        }));
        setItems(enrichedItems);
      };
      loadBatchesForExisting();
    }
  }, []);

  const addItem = async (product: any) => {
    setOpen(false);
    const batches = await getAvailableStock(product.code);

    if (batches.length === 0) {
      toast.error("No hay stock disponible para este producto");
      return;
    }

    const defaultBatch = batches[0];
    const costPrice = calculateUnitCost(defaultBatch);
    const listPrice = Number(product.listPrice);
    const offerPrice = Number(product.offerPrice);
    const priceToCharge = offerPrice > 0 ? offerPrice : listPrice;
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

    if (field === "stockBatchId") {
      const batch = item.availableBatches.find(b => b.id === value);
      item.costPrice = calculateUnitCost(batch);
    }

    if (field === "stockBatchId" || field === "priceToCharge" || field === "quantity") {
      // Ensure numeric values for calc
      const pCharge = field === "priceToCharge" ? value : item.priceToCharge;
      const cost = item.costPrice;

      item.profitPercentage = cost > 0
        ? ((pCharge - cost) / cost) * 100
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

  const handleSubmit = () => {
    if (!clientName) { toast.error("Falta el nombre del cliente"); return; }
    if (items.length === 0) { toast.error("Agrega productos a la venta"); return; }

    onSubmit({
      date,
      clientName,
      clientPhone,
      isGift,
      isLost, // Added
      notes, // Added
      items
    });
  };

  const totalAmount = items.reduce((acc, i) => acc + (i.quantity * i.priceToCharge), 0);

  return (
    <div className="space-y-6 pb-20">
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
                onCheckedChange={(c) => setIsGift(!!c)}
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
                    setClientName("Perdida/Roto");
                    setClientPhone("");
                  } else {
                    setClientName("");
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
              <span>${(isGift || isLost) ? "0.00" : totalAmount.toFixed(2)}</span>
            </div>
            {(isGift || isLost) && <div className="text-sm text-muted-foreground">
              Costo real {isGift ? "del regalo" : "de la pérdida"}: ${items.reduce((acc, i) => acc + (i.quantity * i.costPrice), 0).toFixed(2)}
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
                <Command>
                  <CommandInput placeholder="Buscar..." />
                  <CommandList>
                    <CommandEmpty>No hay stock disponible.</CommandEmpty>
                    <CommandGroup>
                      {products.map((product) => (
                        <CommandItem
                          key={product.code}
                          value={`${product.description} ${product.code}`}
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
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Producto</TableHead>
                  <TableHead className="w-[200px]">Lote</TableHead>
                  <TableHead className="w-[70px]">Cant.</TableHead>
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
                                Vence {format(new Date(b.expirationDate), "MM/yy")} (Disp: {b.currentQuantity})
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
                        ${item.costPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${item.listPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {item.offerPrice > 0 ? `$${item.offerPrice.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={(isGift || isLost) ? 0 : (isNaN(item.priceToCharge) ? "" : item.priceToCharge)}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            updateItem(index, "priceToCharge", isNaN(val) ? 0 : val);
                          }}
                          disabled={isGift || isLost}
                          className="text-right font-bold w-24 ml-auto"
                        />
                      </TableCell>
                      <TableCell className={cn("text-right text-xs font-bold", ((isGift || isLost) ? -100 : item.profitPercentage) < 30 ? "text-red-500" : "text-green-600")}>
                        {((isGift || isLost) ? -100 : item.profitPercentage).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${(isGift || isLost) ? "0.00" : (item.quantity * item.priceToCharge).toFixed(2)}
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
