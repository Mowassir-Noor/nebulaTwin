import { Link } from "react-router-dom";
import { Check } from "lucide-react";


const tiers = [
  { name: "Starter", price: "$0", desc: "Explore digital twins.", features: ["3 twins", "1GB models", "Community support"], cta: "Start Free" },
  { name: "Pro", price: "$49", highlight: true, desc: "For growing teams.", features: ["Unlimited twins", "50GB models", "Anomaly detection", "Priority support"], cta: "Start Pro Trial" },
  { name: "Enterprise", price: "Custom", desc: "Mission-critical scale.", features: ["SSO + SAML", "On-prem option", "Dedicated SLA", "Solutions architect"], cta: "Contact Sales" },
];

export default function Pricing() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">Simple, scalable pricing</h1>
        <p className="text-muted-foreground">Pick a plan that fits your fleet.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-2xl p-8 border ${
              t.highlight ? "border-primary/60 bg-card/80 glow" : "border-border bg-card/60"
            }`}
          >
            <h3 className="text-lg font-semibold">{t.name}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{t.price}</span>
              {t.price.startsWith("$") && t.price !== "$0" && <span className="text-muted-foreground text-sm">/mo</span>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
            <ul className="mt-6 space-y-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-cyan-accent" /> {f}
                </li>
              ))}
            </ul>
            <Link
              to={t.name === "Enterprise" ? "/contact" : "/register"}
              className={`mt-8 block text-center h-11 leading-[2.75rem] rounded-lg font-medium transition ${
                t.highlight
                  ? "bg-[image:var(--gradient-primary)] text-primary-foreground hover:brightness-110"
                  : "border border-border hover:bg-white/5"
              }`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
