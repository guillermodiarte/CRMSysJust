"use client";

import { useEffect, useState } from "react";
import { getSystemConfig, updateSystemConfig } from "@/app/actions/config-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { exportDatabase, importDatabase } from "@/app/actions/backup-actions";
import { Download, Upload, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    ivaPercentage: 21,
    extraTaxPercentage: 3,
    expiryAlertMonths: 3,
    filterMinYear: 2020,
    filterMaxYear: 2050,
  });

  // Backup State
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await getSystemConfig();
      setConfig({
        ivaPercentage: data.ivaPercentage,
        extraTaxPercentage: data.extraTaxPercentage,
        expiryAlertMonths: data.expiryAlertMonths,
        filterMinYear: data.filterMinYear || 2020,
        filterMaxYear: data.filterMaxYear || 2050,
      });
    } catch (error) {
      toast.error("Error al cargar la configuración.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSystemConfig(config);
      if (res.success) {
        toast.success("Configuración actualizada correctamente.");
      } else {
        toast.error(res.error || "Error al guardar.");
      }
    } catch (error) {
      toast.error("Error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    const loadingToast = toast.loading("Generando copia de seguridad...");
    const res = await exportDatabase();

    if (res.success && res.data) {
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sysjust_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(loadingToast);
      toast.success("Copia de seguridad descargada");
    } else {
      toast.dismiss(loadingToast);
      toast.error(res.error || "Error al exportar");
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      setIsRestoring(true);
      const loadingToast = toast.loading("Restaurando base de datos (esto puede tardar)...");

      const res = await importDatabase(content);

      toast.dismiss(loadingToast);
      setIsRestoring(false);

      if (res.success) {
        toast.success("Base de datos restaurada correctamente. Se recargará la página.");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(res.error || "Error al restaurar");
      }
    };
    reader.readAsText(restoreFile);
  };

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>

      <Card>
        <CardHeader>
          <CardTitle>Impuestos y Valores Globales</CardTitle>
          <CardDescription>
            Estos valores se utilizarán para calcular costos en nuevos ingresos de stock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iva">Porcentaje IVA (%)</Label>
                <Input
                  id="iva"
                  type="number"
                  step="0.01"
                  value={config.ivaPercentage}
                  onChange={(e) => setConfig({ ...config, ivaPercentage: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="extraTax">Porcentaje Impuesto Extra (%)</Label>
                <Input
                  id="extraTax"
                  type="number"
                  step="0.01"
                  value={config.extraTaxPercentage}
                  onChange={(e) => setConfig({ ...config, extraTaxPercentage: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryAlert">Alerta de Vencimiento (Meses)</Label>
                <Input
                  id="expiryAlert"
                  type="number"
                  value={config.expiryAlertMonths}
                  onChange={(e) => setConfig({ ...config, expiryAlertMonths: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Meses de anticipación para avisar lotes próximos a vencer.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minYear">Año Desde</Label>
                  <Input
                    id="minYear"
                    type="number"
                    min="2020"
                    max="2050"
                    value={config.filterMinYear}
                    onChange={(e) => setConfig({ ...config, filterMinYear: parseInt(e.target.value) || 2020 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxYear">Año Hasta</Label>
                  <Input
                    id="maxYear"
                    type="number"
                    min="2020"
                    max="2050"
                    value={config.filterMaxYear}
                    onChange={(e) => setConfig({ ...config, filterMaxYear: parseInt(e.target.value) || 2050 })}
                  />
                </div>
              </div>


            </div>

            <div className="flex justify-end mt-4">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" /> Copia de Seguridad
            </CardTitle>
            <CardDescription>
              Descarga una copia completa de la base de datos (Productos, Stock, Ventas, Usuarios) en formato JSON.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} variant="outline" className="w-full">
              Exportar Base de Datos
            </Button>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Upload className="h-5 w-5" /> Restauración
            </CardTitle>
            <CardDescription>
              Restaura la base de datos desde un archivo de respaldo.
              <span className="block mt-2 font-bold text-red-600">
                ⚠️ ADVERTENCIA: Se eliminarán TODOS los datos actuales.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="backup-file">Archivo de Respaldo (.json)</Label>
              <Input
                id="backup-file"
                type="file"
                accept=".json"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={!restoreFile || isRestoring}
                >
                  Restaurar Base de Datos
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    ¿Estás absolutamente seguro?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminarán permanentemente todos los productos, ventas, stock y usuarios actuales,
                    y se reemplazarán por los datos del archivo seleccionado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRestore}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  >
                    Sí, Restaurar Todo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
