
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, ShoppingCart, Users, AlertTriangle, ArrowRight, Gift, Megaphone, Plus, Search, TrendingUp } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(data.finance.revenue)}</div>
            <p className={cn("text-xs font-medium", data.finance.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
              Ganancia Neta: {formatCurrency(data.finance.netProfit)}
            </p>
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

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/sales/new">
              <Button className="w-full h-28 flex flex-col gap-2 text-lg border-2 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm" variant="outline">
                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                  <Plus className="w-6 h-6" />
                </div>
                Nueva Venta
              </Button>
            </Link>
            <Link href="/dashboard/products/new">
              <Button className="w-full h-28 flex flex-col gap-2 text-lg border-2 hover:border-green-500 hover:bg-green-50 hover:text-green-700 transition-all shadow-sm" variant="outline">
                <div className="p-2 rounded-full bg-green-100 text-green-600">
                  <Plus className="w-6 h-6" />
                </div>
                Ingreso Stock
              </Button>
            </Link>
            <Link href="/dashboard/products">
              <Button className="w-full h-28 flex flex-col gap-2 text-lg border-2 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 transition-all shadow-sm" variant="outline">
                <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                  <Search className="w-6 h-6" />
                </div>
                Consultar Stock
              </Button>
            </Link>
            <Link href="/dashboard/finance">
              <Button className="w-full h-28 flex flex-col gap-2 text-lg border-2 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-700 transition-all shadow-sm" variant="outline">
                <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                Ver Finanzas
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
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
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${sale.isGift ? "bg-purple-100" : sale.isLost ? "bg-red-100" : "bg-green-100"}`}>
                        {sale.isGift ? <Gift className="h-4 w-4 text-purple-600" /> : sale.isLost ? <Megaphone className="h-4 w-4 text-red-600" /> : <DollarSign className="h-4 w-4 text-green-600" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium leading-none ${sale.isLost ? "text-red-600" : ""}`}>{sale.clientName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(sale.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className={`font-bold ${sale.isGift ? "text-purple-600" : sale.isLost ? "text-red-600" : ""}`}>
                      {sale.isGift ? "REGALO" : sale.isLost ? "PÉRDIDA" : formatCurrency(Number(sale.totalAmount))}
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
