
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Trash2, Plus } from "lucide-react";
import { cn, formatCurrency, normalizeText } from "@/lib/utils";
import { toast } from "sonner";
import { createStockEntry, StockEntryItem } from "@/app/actions/stock-actions";
import { getSystemConfig } from "@/app/actions/config-actions";
import { getProducts } from "@/app/actions/product-actions";

type ProductOption = {
  code: string;
  description: string;
  listPrice: number;
};

export default function NewStockEntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Global costs
  const [shippingCostTotal, setShippingCostTotal] = useState<number>(0);
  const [incentiveDiscountTotal, setIncentiveDiscountTotal] = useState<number>(0);

  // Items
  const [items, setItems] = useState<StockEntryItem[]>([]);

  // System Config
  const [config, setConfig] = useState({ ivaPercentage: 21, extraTaxPercentage: 3 });

  // Product Search State
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);

  useEffect(() => {
    getProducts().then(setProducts); // Load all for search (optimize later if many)
    getSystemConfig().then(c => setConfig(c));
  }, []);

  const addItem = (product: ProductOption) => {
    setItems([...items, {
      code: product.code,
      quantity: 1,
      costGross: product.code.startsWith("ADVENTA-") ? product.listPrice : 0,
      expirationDate: product.code.startsWith("ADVENTA-") ? "2125-01" : "",
    }]);
    setOpen(false);
  };

  const updateItem = (index: number, field: keyof StockEntryItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    // Validate
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) { toast.error("Cantidad inválida"); return; }
      if (item.costGross < 0 || item.costGross === undefined) { toast.error("Costo inválido"); return; }
      if (!item.expirationDate) { toast.error("Falta fecha de vencimiento"); return; }
    }

    setLoading(true);
    const res = await createStockEntry({
      items,
      shippingCostTotal,
      incentiveDiscountTotal
    });

    if (res.success) {
      toast.success("Ingreso registrado correctamente");
      router.push("/dashboard/products");
      router.refresh();
    } else {
      toast.error(res.error || "Error al registrar");
      setLoading(false);
    }
  };

  // Calculations for preview
  const totalProductCost = items.reduce((acc, i) => acc + (i.quantity * i.costGross), 0);

  // Logic as defined:
  // Subtotal Base = Suma Costos Producto + Costo Envío - Incentivo
  // IVA & Extra Tax are calculated ON this Subtotal.

  const subtotalBase = totalProductCost + shippingCostTotal - incentiveDiscountTotal;

  const totalIva = subtotalBase * (config.ivaPercentage / 100);
  const totalExtraTax = subtotalBase * (config.extraTaxPercentage / 100);

  const totalExact = subtotalBase + totalIva + totalExtraTax;
  const totalInvoice = Math.round(totalExact); // Redondeo final
  const roundingDiff = totalInvoice - totalExact;

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-3xl font-bold tracking-tight">Nuevo Ingreso de Mercadería (Lote)</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Costos Globales del Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Costo de Envío (Incluye Impuestos)</Label>
              <Input
                type="number" step="0.01"
                value={shippingCostTotal || ""}
                onChange={e => setShippingCostTotal(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Se suma al subtotal antes de impuestos.</p>
            </div>
            <div className="space-y-2">
              <Label>Descuento Incentivo (Incluye Impuestos)</Label>
              <Input
                type="number" step="0.01"
                value={incentiveDiscountTotal || ""}
                onChange={e => setIncentiveDiscountTotal(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Valor que RESTA al subtotal antes de impuestos.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen Previo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Suma Costos Producto:</span>
              <span className="font-bold">{formatCurrency(totalProductCost)}</span>
            </div>
            <div className="flex justify-between text-orange-600">
              <span>+ Costo de Envío:</span>
              <span>{formatCurrency(shippingCostTotal)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>- Descuento Incentivo:</span>
              <span>{formatCurrency(incentiveDiscountTotal)}</span>
            </div>
            <div className="border-t my-2 pt-2 flex justify-between font-semibold">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotalBase)}</span>
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>+ IVA ({config.ivaPercentage}%):</span>
              <span>{formatCurrency(totalIva)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>+ Impuesto Extra ({config.extraTaxPercentage}%):</span>
              <span>{formatCurrency(totalExtraTax)}</span>
            </div>

            <div className="flex justify-between text-xs text-gray-400">
              <span>Redondeo:</span>
              <span>{formatCurrency(roundingDiff)}</span>
            </div>

            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg bg-gray-50 p-2 rounded">
              <span>Total Final:</span>
              <span>{formatCurrency(totalInvoice)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Productos</CardTitle>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={open} className="w-[250px] justify-between">
                <Plus className="mr-2 h-4 w-4" /> Agregar Producto...
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command filter={(value, search) => {
                if (value.includes(normalizeText(search))) return 1;
                return 0;
              }}>
                <CommandInput placeholder="Buscar producto..." />
                <CommandList>
                  <CommandEmpty>No encontrado.</CommandEmpty>
                  <CommandGroup>
                    {products.map((product) => (
                      <CommandItem
                        key={product.code}
                        value={`${product.description} ${product.code} ${normalizeText(product.description)} ${product.code.startsWith("ADVENTA") || product.code.startsWith("AYUDA") ? "ayuda de venta adventa" : ""} ${product.code.startsWith("ELIMITADA") ? "edicion limitada elimitada" : ""}`}
                        onSelect={() => addItem(product)}
                      >
                        <Check className={cn("mr-2 h-4 w-4 opacity-0")} />
                        {product.code} - {product.description}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto hidden 2xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Producto</TableHead>
                  <TableHead className="w-[100px]">Cant.</TableHead>
                  <TableHead className="w-[120px]">Costo Bruto por Unidad</TableHead>
                  <TableHead className="w-[150px]">Vencimiento</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      Agrega productos a la lista
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const prod = products.find(p => p.code === item.code);
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {prod?.description} <br />
                          <span className="text-xs text-gray-500">{item.code}</span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={isNaN(item.quantity) ? "" : item.quantity}
                            onChange={e => updateItem(index, "quantity", parseInt(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={isNaN(item.costGross) ? "" : item.costGross}
                            onChange={e => updateItem(index, "costGross", parseFloat(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          {item.code.startsWith("ADVENTA-") ? (
                            <span className="text-xs text-muted-foreground italic pl-2">No Vence</span>
                          ) : (
                            <Input type="month" value={item.expirationDate} onChange={e => updateItem(index, "expirationDate", e.target.value)} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
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
          <div className="grid grid-cols-1 gap-4 2xl:hidden">
            {items.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-lg border text-muted-foreground">
                Agrega productos a la lista
              </div>
            ) : (
              items.map((item, index) => {
                const prod = products.find(p => p.code === item.code);
                return (
                  <Card key={index} className="shadow-sm border">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base font-bold">{prod?.description}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Cantidad</Label>
                          <Input
                            type="number"
                            min="1"
                            value={isNaN(item.quantity) ? "" : item.quantity}
                            onChange={e => updateItem(index, "quantity", parseInt(e.target.value))}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Costo Bruto</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={isNaN(item.costGross) ? "" : item.costGross}
                            onChange={e => updateItem(index, "costGross", parseFloat(e.target.value))}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Vencimiento</Label>
                        {item.code.startsWith("ADVENTA-") ? (
                          <div className="h-9 flex items-center text-sm text-muted-foreground italic">No Vence</div>
                        ) : (
                          <Input
                            type="month"
                            value={item.expirationDate}
                            onChange={e => updateItem(index, "expirationDate", e.target.value)}
                            className="h-9"
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={loading} className="w-full md:w-auto">
          {loading ? "Registrando..." : "Confirmar Ingreso de Stock"}
        </Button>
      </div>
    </div>
  );
}
