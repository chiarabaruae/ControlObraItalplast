import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import {
  LayoutGrid, Users, Building2, ListTodo, Settings2, UserCog,
  Menu, LogOut, Sun, Moon, Monitor, Eye
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { permisos, ROLE_LABELS, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Tema = "claro" | "oscuro" | "sistema";

export function aplicarTema(tema: Tema) {
  const oscuro =
    tema === "oscuro" ||
    (tema === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", oscuro);
}

function iniciales(nombre: string) {
  return nombre.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid, visible: () => true },
  { to: "/clientes", label: "Clientes", icon: Users, visible: (r: Role) => permisos.verClientes(r) },
  { to: "/proyectos", label: "Proyectos", icon: Building2, visible: () => true },
  { to: "/tareas", label: "To-Do", icon: ListTodo, visible: () => true },
  { to: "/usuarios", label: "Usuarios", icon: UserCog, visible: (r: Role) => permisos.verUsuarios(r) },
  { to: "/personalizar", label: "Personalizar", icon: Settings2, visible: () => true }
];

function NavItems({ rol, onNavigate }: { rol: Role; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.filter((item) => item.visible(rol)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
            )
          }
        >
          <item.icon className="size-4.5" strokeWidth={1.75} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-3 px-6 pt-6 pb-7">
      <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/75 font-heading text-sm font-bold text-primary-foreground">
        IT
      </div>
      <div className="leading-tight">
        <div className="senal">Italplast</div>
        <div className="font-heading text-[15px] font-bold tracking-tight">Control de Obras</div>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user, logout, verComo } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [tema, setTema] = useState<Tema>(() => (localStorage.getItem("co-tema") as Tema) ?? "sistema");

  useEffect(() => {
    aplicarTema(tema);
    localStorage.setItem("co-tema", tema);
  }, [tema]);

  if (!user) return null;

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <Marca />
        <NavItems rol={user.role} />
        <div className="mt-auto px-6 py-5">
          <div className="senal senal-muted">Sesión</div>
          <div className="mt-1 text-[13px] font-medium">{user.displayName}</div>
          <div className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</div>
        </div>
      </aside>

      {/* Sidebar móvil */}
      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <Marca />
          <NavItems rol={user.role} onNavigate={() => setMenuAbierto(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
            <Menu className="size-5" />
          </Button>
          <div className="hidden lg:block" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-3 transition-colors hover:bg-muted" aria-label="Menú de usuario">
                <span className="hidden text-sm font-medium sm:block">{user.displayName}</span>
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                    {iniciales(user.displayName)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="text-sm">{user.displayName}</div>
                <div className="text-xs font-normal text-muted-foreground">{user.positionTitle}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="senal senal-muted flex items-center gap-1.5">
                <Eye className="size-3.5" /> Ver como
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={user.role} onValueChange={(v) => verComo(v as Role)}>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <DropdownMenuRadioItem key={r} value={r}>{ROLE_LABELS[r]}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={tema} onValueChange={(v) => setTema(v as Tema)}>
                <DropdownMenuRadioItem value="claro"><Sun className="size-4" /> Modo claro</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oscuro"><Moon className="size-4" /> Modo oscuro</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sistema"><Monitor className="size-4" /> Sistema</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => { logout(); navigate("/login"); }}
              >
                <LogOut className="size-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
