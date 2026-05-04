import { Link, Outlet, useLocation } from "react-router-dom";
import { Globe, Mail } from "lucide-react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function MarketingLayout() {
  const location = useLocation();
  const path = location.pathname;
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-primary)] glow" />
            <span className="text-lg">NebulaTwin <span className="text-gradient">Pro</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  path === n.to ? "text-foreground bg-white/5" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground px-3 py-2">Sign in</Link>
            <Link
              to="/register"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground hover:brightness-110 transition"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-semibold mb-3">
              <div className="h-7 w-7 rounded-md bg-[image:var(--gradient-primary)]" />
              NebulaTwin Pro
            </div>
            <p className="text-sm text-muted-foreground">The next generation Digital Twin platform for industrial intelligence.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/features" className="hover:text-foreground">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground">About</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Connect</h4>
            <div className="flex gap-3 text-muted-foreground">
              <a href="#" className="hover:text-foreground"><Globe className="h-5 w-5" /></a>
              <a href="#" className="hover:text-foreground"><Mail className="h-5 w-5" /></a>
            </div>
          </div>
        </div>
        <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} NebulaTwin Pro. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
