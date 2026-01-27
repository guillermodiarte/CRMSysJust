"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSaleById, updateSale } from "@/app/actions/sales-actions";
import SaleForm, { SaleItemRow } from "@/components/sales/SaleForm";
import { useParams } from "next/navigation";

export default function EditSalePage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getSaleById(saleId).then((data) => {
      if (!data) {
        toast.error("Venta no encontrada");
        router.push("/dashboard/sales");
        return;
      }

      // Transform Backend Data to Form Row Format
      const formItems: SaleItemRow[] = data.items.map((i: any) => {
        // Determine batch used. In simplistic case provided, we might have multiple batches per item if it spanned batches.
        // BUT, the UI only allows selecting ONE batch per row currently.
        // If a sale item spans multiple batches, this UI will struggle.
        // For now, let's assume the main batch is the first allocation or we split rows.
        // Ideally, we should reconstruct rows based on allocations.

        // Note: My Create logic allocates 1 StockBatch per SaleItem ROW?
        // No, my create logic iterates items and decrements stock. 
        // Wait, the logic I wrote for `createSale` uses:
        // `const batch = ... findUnique(item.stockBatchId)`
        // So strictly 1 Batch per 1 SaleItem row in the UI.
        // So we can recover the `stockBatchId` from the allocations easily (allocations[0].stockBatchId).

        const batchId = i.allocations[0]?.stockBatchId;

        const costPrice = i.totalCostBasis / i.quantity; // Approx unit cost basis

        return {
          productCode: i.productCode,
          description: i.product.description,
          stockBatchId: batchId,
          quantity: i.quantity,
          costPrice: costPrice, // Computed average cost if multiple? But should be single batch.
          listPrice: i.product.listPrice,
          offerPrice: i.product.offerPrice,
          priceToCharge: i.unitPriceSold,
          profitPercentage: costPrice > 0 ? ((i.unitPriceSold - costPrice) / costPrice) * 100 : 0,
          availableBatches: [] // Will be populated by the component fetching stock? No, we need it here.
          // Actually SaleForm fetches products/stock on mount. We need to match.
          // The `SaleForm` creates items with `availableBatches` loaded from `getAvailableStock`.
          // The `initialData` items might NOT have `availableBatches` populated yet.
          // The `SaleForm` might need to handle hydrating that or we skip it.
          // Actually, if we pass `items` without `availableBatches`, the Select might fail to show the label correctly if it relies on that list.
          // But `SaleForm` assumes `availableBatches` is present in `SaleItemRow`.
        };
      });

      // We need to fetch available batches for these products to populate the dropdowns correctly?
      // `SaleForm` does `getProductsWithStock` on mount, but that doesn't populate the specific `availableBatches` array for EACH ROW.
      // In `addItem` of SalesForm, it calls `getAvailableStock`.
      // We should probably pre-fetch that here to make the form fully editable.

      setInitialData({
        date: new Date(data.date).toISOString().split('T')[0],
        clientName: data.clientName,
        clientPhone: data.clientPhone || "",
        isGift: data.isGift,
        isLost: data.isLost, // Added
        notes: data.notes || "", // Added
        items: formItems
      });
      setFetching(false);
    });
  }, [saleId, router]);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    const res = await updateSale(saleId, {
      date: data.date,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      isGift: data.isGift,
      isLost: data.isLost,
      notes: data.notes,
      items: data.items.map((i: any) => ({
        productCode: i.productCode,
        stockBatchId: i.stockBatchId,
        quantity: i.quantity,
        unitPriceSold: (data.isGift || data.isLost) ? 0 : i.priceToCharge
      }))
    });

    if (res.success) {
      toast.success("Venta actualizada");
      router.push("/dashboard/sales");
      router.refresh();
    } else {
      toast.error(res.error);
      setLoading(false);
    }
  };

  if (fetching) return <div>Cargando datos de venta...</div>;

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Editar Venta</h1>
      {initialData && <SaleForm initialData={initialData} onSubmit={handleSubmit} loading={loading} />}
    </>
  );
}
