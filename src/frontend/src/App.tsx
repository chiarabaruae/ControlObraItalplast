import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthProvider } from "@/context/auth";
import { AppShell } from "@/components/app/AppShell";
import { RequireAuth, RequireRole } from "@/components/app/RequireRole";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Clientes from "@/pages/Clientes";
import Proyectos from "@/pages/Proyectos";
import ProyectoDetalle from "@/pages/ProyectoDetalle";
import Todo from "@/pages/Todo";
import Usuarios from "@/pages/Usuarios";
import Personalizar from "@/pages/Personalizar";
import Account from "@/pages/Account";
import Updates from "@/pages/Updates";
import Planificacion from "@/pages/Planificacion";
import Documentation from "@/pages/Documentation";
import ContactSupport from "@/pages/ContactSupport";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/proyectos" element={<Proyectos />} />
              <Route path="/proyectos/:id" element={<ProyectoDetalle />} />
              <Route path="/tareas" element={<Todo />} />
              <Route path="/personalizar" element={<Navigate to="/settings/appearance" replace />} />
              <Route path="/settings/account" element={<Account />} />
              <Route path="/settings/appearance" element={<Personalizar />} />
              <Route path="/settings/updates" element={<Updates />} />
              <Route path="/support/documentation" element={<Documentation />} />
              <Route path="/support/contact" element={<ContactSupport />} />

              {/* Clientes: admin + supervisor */}
              <Route element={<RequireRole roles={["administrator", "supervisor"]} />}>
                <Route path="/clientes" element={<Clientes />} />
              </Route>

              {/* Usuarios y planificación: solo admin */}
              <Route element={<RequireRole roles={["administrator"]} />}>
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/settings/planning" element={<Planificacion />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </AuthProvider>
  );
}
