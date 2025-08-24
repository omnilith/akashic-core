"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  Network, 
  Package, 
  Settings,
  Home,
  GitBranch
} from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Entity Types",
    href: "/entity-types",
    icon: Database,
  },
  {
    title: "Entities",
    href: "/entities",
    icon: Package,
  },
  {
    title: "Relation Types",
    href: "/relation-types",
    icon: Network,
  },
  {
    title: "Relations",
    href: "/relations",
    icon: GitBranch,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || 
                        (item.href !== "/" && pathname.startsWith(item.href));
        
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                isActive && "bg-secondary"
              )}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.title}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}