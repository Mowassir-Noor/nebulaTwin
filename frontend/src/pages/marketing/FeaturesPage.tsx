/* eslint-disable */
import { Link } from "react-router-dom";
import { Layers, Activity, Brain, Users, Shield, Zap, Globe, GitBranch } from "lucide-react";


const items = [
  { icon: Layers, title: "3D Model Pipeline", desc: "Upload GLB/GLTF, auto-optimize, version, and bind." },
  { icon: Activity, title: "Real-time Telemetry", desc: "WebSocket data streams rendered as overlays." },
  { icon: Brain, title: "Anomaly Detection", desc: "ML models flag deviations before they cascade." },
  { icon: Users, title: "RBAC & Multi-tenant", desc: "Org/team/role permissions baked in." },
  { icon: Shield, title: "Enterprise Security", desc: "SSO, audit logs, encryption at rest." },
  { icon: Zap, title: "Sub-100ms Updates", desc: "Engineered for control-room latency budgets." },
  { icon: Globe, title: "Global Edge", desc: "Deploy ingest endpoints close to your fleet." },
  { icon: GitBranch, title: "API + Webhooks", desc: "Integrate with your existing stack." },
];

export default function Features() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">Built for industrial scale</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Every feature you need to operationalize digital twins, none of the bloat.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card/60 p-6 hover:border-primary/50 transition">
            <div className="h-11 w-11 rounded-lg bg-[image:var(--gradient-primary)] grid place-items-center mb-4">
              <f.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
