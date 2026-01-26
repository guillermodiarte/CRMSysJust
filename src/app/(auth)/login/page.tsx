
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        toast.error("Credenciales inválidas");
        setLoading(false);
      } else {
        toast.success("Login exitoso");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast.error("Ocurrió un error");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-gray-50 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/login-bg.png"
          alt="Background"
          fill
          className="object-cover blur-[2px]"
          quality={100}
          priority
        />
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
      </div>

      <Card className="relative z-10 w-full max-w-sm border-0 shadow-2xl bg-white/90 backdrop-blur-md">
        <CardHeader className="flex flex-col items-center">
          <div className="relative w-24 h-24 mb-4">
            <Image src="/logo.png" alt="Logo Just" fill className="object-contain" priority />
          </div>
          <CardTitle className="text-2xl text-center text-gray-800">SysJust</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Ingresa tus credenciales para administrar
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/50 border-gray-300 focus:bg-white transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 bg-white/50 border-gray-300 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-6">
            <Button className="w-full bg-[#3b82f6] hover:bg-[#2563eb]" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
      {/* We need the Toaster somewhere in the app root, but adding here just in case? 
          Better to add to layout.tsx 
      */}
    </div>
  );
}
