
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFinanceMetrics, getAnnualFinanceMetrics } from "@/app/actions/finance-actions";
import { getSystemConfig } from "@/app/actions/config-actions";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function FinancePage() {
  const [metrics, setMetrics] = useState({ revenue: 0, expenses: 0, netProfit: 0, giftCost: 0, salesProfit: 0, salesCost: 0, expenseFromLoss: 0 });
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>(String(currentYear));
  const [yearRange, setYearRange] = useState<number[]>([currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4]);
  const [annualData, setAnnualData] = useState<any[]>([]);

  const loadData = async () => {
    const data = await getFinanceMetrics(Number(month), Number(year));
    setMetrics(data);

    // Load annual data separately (could be optimized but fine for now)
    const annual = await getAnnualFinanceMetrics(Number(year));
    setAnnualData(annual);
  };

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

  useEffect(() => {
    loadData();
  }, [month, year]);

  // Colors matching the KPI text colors
  const COLORS = ["#16a34a", "#2563eb", "#EF4444", "#059669", "#9333ea"];

  const data = [
    { name: "Ventas", value: metrics.revenue, fill: COLORS[0] },
    { name: "Ganancia Vtas", value: metrics.salesProfit, fill: COLORS[1] },
    { name: "Gastos Stock", value: metrics.expenses, fill: COLORS[2] },
    { name: "Regalos", value: metrics.giftCost, fill: COLORS[4] },
    { name: "Pérdidas", value: metrics.expenseFromLoss, fill: "#ea580c" }, // Added Loss to chart (Orange)
  ];

  // Refined data for Pie Chart (Positive values only)
  const pieData = data.filter(d => d.value > 0);
  // Pie Data excluding Gifts and Losses (and adjusting Stock Expenses)
  const pieDataNoGifts = data
    .filter(d => d.name !== "Regalos" && d.name !== "Pérdidas")
    .map(d => {
      if (d.name === "Gastos Stock") {
        return { ...d, value: d.value - metrics.giftCost - metrics.expenseFromLoss };
      }
      return d;
    })
    .filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>

        <div className="flex items-center gap-2">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas (Ingresos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.revenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Vtas.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.salesProfit)}</div>
            <p className="text-xs text-muted-foreground">Margen real de ventas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.expenses)}</div>
            <p className="text-xs text-muted-foreground">Compras del periodo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Regalos/Pérd.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-purple-600 font-bold">Regalos:</span>
                <span className="font-bold">{formatCurrency(metrics.giftCost)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-orange-600 font-bold">Pérdidas:</span>
                <span className="font-bold">{formatCurrency(metrics.expenseFromLoss)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
              {formatCurrency(metrics.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">Ingresos - Compras</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle>Análisis Financiero (Montos)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {metrics.revenue === 0 && metrics.expenses === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No hay datos financieros para este periodo
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="value" name="Monto ($)" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle>Composición Porcentual</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {metrics.revenue === 0 && metrics.expenses === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No hay datos financieros
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle>Comp. % (Sin Regalos/Pérd.)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {metrics.revenue === 0 && metrics.expenses === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No hay datos financieros
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataNoGifts}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {pieDataNoGifts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolución Anual (Mensual)</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            {annualData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Cargando datos anuales...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="revenue" name="Ventas ($)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="salesProfit" name="Ganancia Vtas ($)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Gastos Stock ($)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
