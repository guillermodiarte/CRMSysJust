
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, ShoppingCart, Users, AlertTriangle, ArrowRight } from "lucide-react";
import { getDashboardMetrics } from "@/app/actions/dashboard-actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getDashboardMetrics().then(setData);
  }, []);

  if (!data) return <div className="p-8">Cargando tablero...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Panel Principal</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.finance.revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ganancia Neta: ${data.finance.netProfit.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStock}</div>
            <p className="text-xs text-muted-foreground">Unidades disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas (Cant.)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.salesCount}</div>
            <p className="text-xs text-muted-foreground">Operaciones este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos a Vencer</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.expiringSoonCount > 0 ? "text-red-600" : "text-green-600"}`}>
              {data.expiringSoonCount}
            </div>
            <p className="text-xs text-muted-foreground">Lotes en riesgo (&lt;{data.expiryAlertMonths} meses)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/sales/new">
              <Button className="w-full h-24 text-lg" variant="outline">+ Nueva Venta</Button>
            </Link>
            <Link href="/dashboard/products/new">
              <Button className="w-full h-24 text-lg" variant="outline">+ Ingreso Stock</Button>
            </Link>
            <Link href="/dashboard/products">
              <Button className="w-full h-24 text-lg" variant="outline">Consultar Stock</Button>
            </Link>
            <Link href="/dashboard/finance">
              <Button className="w-full h-24 text-lg" variant="outline">Ver Finanzas</Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Ventas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentSales.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay ventas registradas</div>
              ) : (
                data.recentSales.map((sale: any) => (
                  <div key={sale.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium leading-none">{sale.clientName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.date).toLocaleDateString()}</p>
                    </div>
                    <div className="font-bold">
                      {sale.isGift ? "REGALO" : `$${Number(sale.totalAmount).toFixed(2)}`}
                    </div>
                  </div>
                ))
              )}
              {data.recentSales.length > 0 && (
                <Link href="/dashboard/sales" className="flex items-center text-sm text-blue-600 hover:underline pt-2">
                  Ver todas <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
