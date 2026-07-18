import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  BookOpen, Building2, ChevronDown, CircleHelp, Headphones,
  LayoutGrid, ListTodo, LogOut, Menu, Palette, RefreshCw,
  Settings, UserCog, UserRound, Users
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { permisos, ROLE_LABELS, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { aplicarTema, type Tema } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/app/UserAvatar";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid, visible: () => true },
  { to: "/clientes", label: "Clientes", icon: Users, visible: (role: Role) => permisos.verClientes(role) },
  { to: "/proyectos", label: "Proyectos", icon: Building2, visible: () => true },
  { to: "/tareas", label: "To-Do", icon: ListTodo, visible: () => true },
  { to: "/usuarios", label: "Usuarios", icon: UserCog, visible: (role: Role) => permisos.verUsuarios(role) }
];

const SETTINGS_ITEMS = [
  { to: "/settings/account", label: "Account", description: "Tu perfil y avatar", icon: UserRound },
  { to: "/settings/appearance", label: "Personalizar", description: "Tema y colores", icon: Palette },
  { to: "/settings/updates", label: "Updates", description: "Versión del sistema", icon: RefreshCw }
];

const SUPPORT_ITEMS = [
  { to: "/support/documentation", label: "Documentation", description: "Guías de uso", icon: BookOpen },
  { to: "/support/contact", label: "Contact support", description: "Solicitar ayuda", icon: Headphones }
];

function NavItems({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.filter((item) => item.visible(role)).map((item) => (
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

function UtilityGroup({
  label,
  icon: Icon,
  items,
  open,
  onToggle,
  onNavigate
}: {
  label: string;
  icon: typeof Settings;
  items: typeof SETTINGS_ITEMS;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Icon className="size-4.5" strokeWidth={1.75} />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-1 space-y-1 pl-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) => cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-sidebar-accent",
                isActive && "bg-sidebar-accent"
              )}
            >
              <div className="grid size-8 shrink-0 place-items-center rounded-lg border bg-background/75 text-primary shadow-xs">
                <item.icon className="size-4" strokeWidth={1.75} />
              </div>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-sidebar-foreground">{item.label}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{item.description}</span>
              </span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarUtilities({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(() => pathname.startsWith("/settings"));
  const [supportOpen, setSupportOpen] = useState(() => pathname.startsWith("/support"));

  useEffect(() => {
    if (pathname.startsWith("/settings")) setSettingsOpen(true);
    if (pathname.startsWith("/support")) setSupportOpen(true);
  }, [pathname]);

  return (
    <div className="space-y-1 px-3">
      <UtilityGroup
        label="Settings"
        icon={Settings}
        items={SETTINGS_ITEMS}
        open={settingsOpen}
        onToggle={() => { setSettingsOpen((value) => !value); setSupportOpen(false); }}
        onNavigate={onNavigate}
      />
      <UtilityGroup
        label="Support"
        icon={CircleHelp}
        items={SUPPORT_ITEMS}
        open={supportOpen}
        onToggle={() => { setSupportOpen((value) => !value); setSettingsOpen(false); }}
        onNavigate={onNavigate}
      />
    </div>
  );
}

function Brand() {
  return (
    <div className="px-5 pt-5 pb-7">
      <div className="flex h-12 items-center rounded-xl bg-white px-3 shadow-xs ring-1 ring-black/8">
        <img src="/brand/italplast-wordmark.webp" alt="Italplast" className="h-auto w-36" />
      </div>
      <div className="mt-2 px-1 font-heading text-[13px] font-semibold tracking-tight text-sidebar-foreground/75">Gestión de proyectos</div>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme] = useState<Tema>(() => (localStorage.getItem("co-tema") as Tema) ?? "sistema");

  useEffect(() => {
    aplicarTema(theme);
  }, [theme]);

  if (!user) return null;

  const closeSession = () => {
    logout();
    navigate("/login");
  };

  const sessionSummary = (
    <div className="px-6 py-5">
      <div className="senal senal-muted">Sesión</div>
      <div className="mt-1 truncate text-[13px] font-medium">{user.displayName}</div>
      <div className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</div>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <Brand />
        <NavItems role={user.role} />
        <div className="mt-auto border-t pt-3">
          <SidebarUtilities />
          {sessionSummary}
        </div>
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <div className="flex h-full flex-col">
            <Brand />
            <NavItems role={user.role} onNavigate={() => setMenuOpen(false)} />
            <div className="mt-auto border-t pt-3">
              <SidebarUtilities onNavigate={() => setMenuOpen(false)} />
              {sessionSummary}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <Menu className="size-5" />
          </Button>
          <div className="hidden lg:block" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-3 transition-colors hover:bg-muted" aria-label="Menú de usuario">
                <span className="hidden text-sm font-medium sm:block">{user.displayName}</span>
                <UserAvatar user={user} className="size-8" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <div className="text-sm">{user.displayName}</div>
                <div className="text-xs font-normal text-muted-foreground">{user.positionTitle}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings/account")}>
                <UserRound className="size-4" /> Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings/appearance")}>
                <Palette className="size-4" /> Personalizar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={closeSession}>
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
