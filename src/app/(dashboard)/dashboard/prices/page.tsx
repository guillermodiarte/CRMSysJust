
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Trash2, Edit, Download, Upload, MoreVertical, RefreshCw } from "lucide-react";
import { createProduct, deleteProduct, getProducts, updateProduct, updatePricesByPercentage } from "@/app/actions/product-actions";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ... existing code ...

export default function PriceListPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Special Product & Sales Aid & Limited Edition State
  const [isSpecial, setIsSpecial] = useState(false);
  const [isSalesAid, setIsSalesAid] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const [codeValue, setCodeValue] = useState("");

  // Effect to reset/set code when dialog opens or mode changes
  useEffect(() => {
    if (editingProduct) {
      // If editing, check if it's already a special product or sales aid or limited
      const isSpecialCode = editingProduct.code.startsWith("ESPECIAL-");
      const isSalesAidCode = editingProduct.code.startsWith("ADVENTA-");
      const isLimitedCode = editingProduct.code.startsWith("ELIMITADA-");

      setIsSpecial(isSpecialCode);
      setIsSalesAid(isSalesAidCode);
      setIsLimited(isLimitedCode);
      setCodeValue(editingProduct.code);
    } else {
      // New product: reset flags
      if (!isOpen) {
        // Only reset if dialog is closed/ing
        setIsSpecial(false);
        setIsSalesAid(false);
        setIsLimited(false);
        setCodeValue("");
      }
    }
  }, [editingProduct, isOpen]);

  // Handler for Special Checkbox
  const handleSpecialChange = (checked: boolean) => {
    setIsSpecial(checked);
    if (checked) {
      setIsSalesAid(false);
      setIsLimited(false);
      if (editingProduct && editingProduct.code.startsWith("ESPECIAL-")) {
        setCodeValue(editingProduct.code);
      } else {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        setCodeValue(`ESPECIAL-${randomSuffix}`);
      }
    }
  };

  // Handler for Sales Aid Checkbox
  const handleSalesAidChange = (checked: boolean) => {
    setIsSalesAid(checked);
    if (checked) {
      setIsSpecial(false);
      setIsLimited(false);
      if (editingProduct && editingProduct.code.startsWith("ADVENTA-")) {
        setCodeValue(editingProduct.code);
      } else {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        setCodeValue(`ADVENTA-${randomSuffix}`);
      }
    }
  };

  // Handler for Limited Checkbox
  const handleLimitedChange = (checked: boolean) => {
    setIsLimited(checked);
    if (checked) {
      setIsSpecial(false);
      setIsSalesAid(false);
      if (editingProduct && editingProduct.code.startsWith("ELIMITADA-")) {
        setCodeValue(editingProduct.code);
      } else {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        setCodeValue(`ELIMITADA-${randomSuffix}`);
      }
    }
  };

  // Bulk Update State
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [updatePercentage, setUpdatePercentage] = useState<string>("");

  // Preview State
  const [importPreview, setImportPreview] = useState<{
    code: string;
    description: string;
    currentListPrice: number | null;
    newListPrice: number;
    currentOfferPrice: number | null;
    newOfferPrice: number;
    status: 'new' | 'update' | 'unchanged';
  }[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Delete Modal State
  const [deleteProductCode, setDeleteProductCode] = useState<string | null>(null);

  const loadProducts = async () => {
    const data = await getProducts(search);
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const listPrice = parseFloat(formData.get("listPrice") as string);
    const offerPriceStr = formData.get("offerPrice") as string;
    const offerPrice = offerPriceStr ? parseFloat(offerPriceStr) : 0;

    if (listPrice < 0) {
      toast.error("El precio de lista no puede ser negativo");
      return;
    }
    if (offerPrice < 0) {
      toast.error("El precio de oferta no puede ser negativo");
      return;
    }

    let res;
    if (editingProduct) {
      res = await updateProduct(editingProduct.code, formData);
    } else {
      res = await createProduct(formData);
    }

    if (res.success) {
      toast.success(editingProduct ? "Producto actualizado" : "Producto creado");
      setIsOpen(false);
      setEditingProduct(null);
      loadProducts();
    } else {
      toast.error(res.error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteProductCode) return;

    const res = await deleteProduct(deleteProductCode);
    if (res.success) {
      toast.success("Producto eliminado");
      loadProducts();
    } else {
      toast.error(res.error);
    }
    setDeleteProductCode(null);
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setIsOpen(true);
  }

  const handleBulkUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const percent = parseFloat(updatePercentage);
    if (isNaN(percent) || percent === 0) {
      toast.error("Ingresa un porcentaje válido");
      return;
    }

    const res = await updatePricesByPercentage(percent);
    if (res.success) {
      toast.success(`Precios actualizados correctamente (${percent}%)`);
      setIsBulkUpdateOpen(false);
      setUpdatePercentage("");
      loadProducts();
    } else {
      toast.error(res.error);
    }
  };

  const handleExport = () => {
    const headers = ["Codigo", "Descripcion", "Precio Lista", "Precio Oferta"];
    const rows = products.map(p => {
      const desc = p.description.includes(",") ? `"${p.description}"` : p.description;
      const listPrice = Number(Number(p.listPrice).toFixed(2));
      const offerPrice = Number(Number(p.offerPrice || 0).toFixed(2));
      return `${p.code},${desc},${listPrice},${offerPrice}`;
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lista_precios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      const parsedProducts: any[] = [];

      let startIdx = 0;
      if (lines[0].toLowerCase().includes("codigo") || lines[0].toLowerCase().includes("code")) {
        startIdx = 1;
      }

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(",");

        if (parts.length >= 3) {
          const code = parts[0].trim();
          let listPrice = 0;
          let offerPrice = 0;
          let description = "";

          if (parts.length >= 4) {
            const offerStr = parts[parts.length - 1].trim();
            const listStr = parts[parts.length - 2].trim();
            offerPrice = parseFloat(offerStr);
            listPrice = parseFloat(listStr);
            description = parts.slice(1, parts.length - 2).join(",").replace(/^"|"$/g, '').trim();
          } else {
            const listStr = parts[parts.length - 1].trim();
            listPrice = parseFloat(listStr);
            description = parts.slice(1, parts.length - 1).join(",").replace(/^"|"$/g, '').trim();
          }

          if (code && !isNaN(listPrice)) {
            parsedProducts.push({
              code,
              description,
              listPrice: Number(listPrice.toFixed(2)),
              offerPrice: isNaN(offerPrice) ? 0 : Number(offerPrice.toFixed(2))
            });
          }
        }
      }

      if (parsedProducts.length > 0) {
        // Generate Preview Diff
        const preview = parsedProducts.map(p => {
          const existing = products.find(ex => ex.code === p.code);
          let status: 'new' | 'update' | 'unchanged' = 'new';

          if (existing) {
            const priceChanged = Number(existing.listPrice) !== p.listPrice;
            const offerChanged = Number(existing.offerPrice) !== p.offerPrice;
            if (priceChanged || offerChanged) {
              status = 'update';
            } else {
              status = 'unchanged';
            }
          }

          return {
            code: p.code,
            description: p.description,
            currentListPrice: existing ? Number(existing.listPrice) : null,
            newListPrice: p.listPrice,
            currentOfferPrice: existing ? Number(existing.offerPrice) : null,
            newOfferPrice: p.offerPrice,
            status
          };
        });

        const sortedPreview = preview.sort((a, b) => {
          const rank = { 'update': 1, 'new': 2, 'unchanged': 3 };
          return rank[a.status] - rank[b.status];
        });

        setImportPreview(sortedPreview);
        setIsPreviewOpen(true);
      } else {
        toast.error("No se encontraron productos válidos en el archivo CSV");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    const productsToImport = importPreview.map(p => ({
      code: p.code,
      description: p.description,
      listPrice: p.newListPrice,
      offerPrice: p.newOfferPrice
    }));

    const loadingToast = toast.loading("Importando productos...");
    const { importProductsBulk } = await import("@/app/actions/product-actions");
    const res = await importProductsBulk(productsToImport);
    toast.dismiss(loadingToast);

    if (res.success) {
      toast.success(`Se importaron ${res.count} productos correctamente`);
      setIsPreviewOpen(false);
      setImportPreview([]);
      loadProducts();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Precio de Lista</h1>
        <div className="flex flex-wrap gap-2">

          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle className="text-xl">Vista Previa de Importación</DialogTitle>
                <DialogDescription>
                  Revisa los cambios detectados antes de confirmar la actualización.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/50">
                {/* Summary Stats & Filters */}
                <div className="p-4 grid gap-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total</span>
                      <span className="text-2xl font-bold">{importPreview.length}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col items-center justify-center border-l-4 border-l-blue-500">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider text-blue-600">Nuevos</span>
                      <span className="text-2xl font-bold text-blue-700">{importPreview.filter(i => i.status === 'new').length}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col items-center justify-center border-l-4 border-l-amber-500">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider text-amber-600">Actualizar</span>
                      <span className="text-2xl font-bold text-amber-700">{importPreview.filter(i => i.status === 'update').length}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col items-center justify-center border-l-4 border-l-gray-300">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sin Cambios</span>
                      <span className="text-2xl font-bold text-gray-500">{importPreview.filter(i => i.status === 'unchanged').length}</span>
                    </div>
                  </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-auto border-t bg-white relative">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[100px]">Estado</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead className="min-w-[300px]">Descripción</TableHead>
                        <TableHead className="text-right whitespace-nowrap bg-red-50/30">Precio Lista (Old)</TableHead>
                        <TableHead className="text-right whitespace-nowrap bg-green-50/30 font-bold">Precio Lista (New)</TableHead>
                        <TableHead className="text-right whitespace-nowrap bg-red-50/30">Oferta (Old)</TableHead>
                        <TableHead className="text-right whitespace-nowrap bg-green-50/30 font-bold">Oferta (New)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((item) => (
                        <TableRow key={item.code} className={item.status === 'unchanged' ? 'opacity-40 hover:opacity-100 transition-opacity bg-gray-50' : 'hover:bg-blue-50/30'}>
                          <TableCell>
                            {item.status === 'new' && (
                              <span className="inline-flex items-center justify-center rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                NUEVO
                              </span>
                            )}
                            {item.status === 'update' && (
                              <span className="inline-flex items-center justify-center rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                UPDATE
                              </span>
                            )}
                            {item.status === 'unchanged' && (
                              <span className="inline-flex items-center justify-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                IGUAL
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm font-medium text-muted-foreground">
                            {item.code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.description}
                          </TableCell>

                          {/* List Prices */}
                          <TableCell className="text-right text-muted-foreground bg-red-50/10 font-mono text-xs">
                            {item.currentListPrice !== null ? formatCurrency(item.currentListPrice) : "-"}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono text-sm bg-green-50/10", item.status === 'update' && item.currentListPrice !== item.newListPrice ? 'font-bold text-green-700' : '')}>
                            {formatCurrency(item.newListPrice)}
                          </TableCell>

                          {/* Offer Prices */}
                          <TableCell className="text-right text-muted-foreground bg-red-50/10 font-mono text-xs">
                            {item.currentOfferPrice !== null && item.currentOfferPrice > 0 ? formatCurrency(item.currentOfferPrice) : "-"}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono text-sm bg-green-50/10", item.status === 'update' && item.currentOfferPrice !== item.newOfferPrice ? 'font-bold text-green-700' : '')}>
                            {item.newOfferPrice > 0 ? formatCurrency(item.newOfferPrice) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Los productos marcados como "NUEVO" se crearán. Los "UPDATE" actualizarán precios. "IGUAL" se ignorarán.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Cancelar</Button>
                  <Button onClick={confirmImport} className="bg-blue-600 hover:bg-blue-700">
                    Confirmar Importación ({importPreview.filter(i => i.status !== 'unchanged').length} cambios)
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkUpdateOpen} onOpenChange={setIsBulkUpdateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Actualizar Precios
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Actualización Masiva de Precios</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBulkUpdatePrice} className="space-y-4">
                <div className="space-y-2">
                  <Label>Porcentaje de Ajuste (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 5 para +5%, -3.5 para -3.5%"
                    value={updatePercentage}
                    onChange={(e) => setUpdatePercentage(e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Ingresa un valor positivo para aumentar y negativo para disminuir los precios de lista de TODOS los productos.
                  </p>
                </div>
                <Button type="submit" className="w-full">Aplicar Actualización</Button>
              </form>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="mr-2 h-4 w-4" /> Importar / Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="relative">
                <Input
                  type="file"
                  accept=".csv"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                  onChange={handleImport}
                  onClick={(e) => (e.target as any).value = null}
                />
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Upload className="mr-2 h-4 w-4" /> Importar CSV
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => { setEditingProduct(null); setIsSpecial(false); setIsOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </Button>

          <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) { setEditingProduct(null); setIsSpecial(false); } }}>
            {/* DialogTrigger removed to avoid hydration ID mismatch */}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="special"
                      checked={isSpecial}
                      onCheckedChange={(checked) => handleSpecialChange(checked as boolean)}
                      disabled={isSalesAid || isLimited}
                    />
                    <Label htmlFor="special" className="cursor-pointer">Producto Especial (Código autogenerado)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sales_aid"
                      checked={isSalesAid}
                      onCheckedChange={(checked) => handleSalesAidChange(checked as boolean)}
                      disabled={isSpecial || isLimited}
                    />
                    <Label htmlFor="sales_aid" className="cursor-pointer">Ayuda de Venta (Código autogenerado)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="limited"
                      checked={isLimited}
                      onCheckedChange={(checked) => handleLimitedChange(checked as boolean)}
                      disabled={isSpecial || isSalesAid}
                    />
                    <Label htmlFor="limited" className="cursor-pointer">Edición Limitada (Código autogenerado)</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Código</Label>
                  <Input
                    name={(isSpecial || isSalesAid || isLimited) ? "code_display" : "code"}
                    id="code"
                    required
                    value={isSpecial ? "ESPECIAL" : isSalesAid ? "AYUDA DE VENTA" : isLimited ? "EDICION LIMITADA" : codeValue}
                    onChange={(e) => setCodeValue(e.target.value)}
                    readOnly={isSpecial || isSalesAid || isLimited}
                    className={(isSpecial || isSalesAid || isLimited) ? "bg-muted font-mono" : ""}
                    placeholder="Ej: OLEO31"
                  />
                  {(isSpecial || isSalesAid || isLimited) && <input type="hidden" name="code" value={codeValue} />}
                  {isSpecial && <p className="text-xs text-muted-foreground">El código interno es único ({codeValue}), pero se mostrará como ESPECIAL.</p>}
                  {isSalesAid && <p className="text-xs text-muted-foreground">El código interno es único ({codeValue}), pero se mostrará como AYUDA DE VENTA.</p>}
                  {isLimited && <p className="text-xs text-muted-foreground">El código interno es único ({codeValue}), pero se mostrará como Edición Limitada.</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input name="description" id="description" required defaultValue={editingProduct?.description} placeholder="Ej: Oleo 31 Hierbas" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listPrice">Precio de Lista</Label>
                  <Input
                    name="listPrice"
                    id="listPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={editingProduct && !isNaN(Number(editingProduct.listPrice)) ? Number(editingProduct.listPrice).toString() : ""}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerPrice">Precio Oferta (Opcional)</Label>
                  <Input
                    name="offerPrice"
                    id="offerPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingProduct && !isNaN(Number(editingProduct.offerPrice)) ? Number(editingProduct.offerPrice).toString() : ""}
                    placeholder="0.00"
                    disabled={isSalesAid || codeValue.startsWith("ADVENTA-")}
                  />
                  <p className="text-xs text-muted-foreground">Si se establece mayor a 0, se mostrará como el precio actual.</p>
                </div>
                <Button type="submit" className="w-full">{editingProduct ? "Guardar Cambios" : "Crear"}</Button>
              </form>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!deleteProductCode} onOpenChange={(val: boolean) => { if (!val) setDeleteProductCode(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente el producto
                  {products.find(p => p.code === deleteProductCode) ? ` "${products.find(p => p.code === deleteProductCode)?.description}"` : ""}
                  y todos sus datos asociados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o descripción..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="hidden md:block rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Precio Lista</TableHead>
              <TableHead className="text-right">Precio Oferta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No hay productos.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.code}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>
                        {product.code.startsWith("ESPECIAL-") ? "ESPECIAL" : product.code.startsWith("ADVENTA-") ? "AYUDA DE VENTA" : product.code.startsWith("ELIMITADA-") ? "EDICIÓN LIMITADA" : product.code}
                      </span>
                      {(product.code.startsWith("ESPECIAL-") || product.code.startsWith("ADVENTA-") || product.code.startsWith("ELIMITADA-")) && (
                        <span className="text-[10px] text-muted-foreground font-mono leading-tight">
                          {product.code}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{product.description}</TableCell>
                  <TableCell className="text-right">
                    <span className={Number(product.offerPrice) > 0 ? "line-through text-gray-400" : ""}>
                      {formatCurrency(Number(product.listPrice))}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {Number(product.offerPrice) > 0 ? formatCurrency(Number(product.offerPrice)) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                      <Edit className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteProductCode(product.code)}>
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
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {products.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-lg border text-muted-foreground">
            No hay productos.
          </div>
        ) : (
          products.map((product) => (
            <Card key={product.code} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold">{product.description}</CardTitle>
                    <div className="flex flex-col">
                      <p className="text-xs text-muted-foreground font-bold">
                        {product.code.startsWith("ESPECIAL-") ? "ESPECIAL" : product.code.startsWith("ADVENTA-") ? "AYUDA DE VENTA" : product.code.startsWith("ELIMITADA-") ? "EDICIÓN LIMITADA" : product.code}
                      </p>
                      {(product.code.startsWith("ESPECIAL-") || product.code.startsWith("ADVENTA-") || product.code.startsWith("ELIMITADA-")) && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {product.code}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3 text-sm">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Precio Lista</span>
                    <span className={cn("font-medium", Number(product.offerPrice) > 0 && "line-through text-gray-400")}>
                      {formatCurrency(Number(product.listPrice))}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground">Precio Oferta</span>
                    <span className="font-bold text-lg text-green-600">
                      {Number(product.offerPrice) > 0 ? formatCurrency(Number(product.offerPrice)) : "-"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-3 border-t pt-3 bg-gray-50/50 rounded-b-lg">
                <Button variant="outline" size="sm" onClick={() => openEdit(product)} className="w-full">
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteProductCode(product.code)} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div >
  );
}
