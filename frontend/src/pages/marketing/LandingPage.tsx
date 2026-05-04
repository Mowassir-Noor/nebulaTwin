import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Boxes, Activity, Brain, Users, ArrowRight, Sparkles, Cpu, Layers } from "lucide-react";


const features = [
  { icon: Layers, title: "3D Model + Sensor Binding", desc: "Upload GLB/GLTF assets and bind sensors directly to mesh parts with an intuitive editor." },
  { icon: Activity, title: "Real-time Monitoring", desc: "WebSocket-powered live telemetry visualized on top of your 3D scene." },
  { icon: Brain, title: "AI Anomaly Detection", desc: "On-device and cloud ML models surface issues before they become incidents." },
  { icon: Users, title: "Team Collaboration", desc: "Multi-tenant RBAC, shared dashboards, and audit logs out of the box." },
];

export default function Landing() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-6"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-accent" /> Now with on-device anomaly detection
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto"
          >
            Build <span className="text-gradient">Digital Twins</span><br />
            that think in real-time.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            NebulaTwin Pro fuses 3D models, live sensor data, and AI to give industrial teams
            an operational copilot for every asset they own.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-10 flex items-center justify-center gap-4"
          >
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 h-12 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground font-semibold glow hover:brightness-110"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/features"
              className="inline-flex items-center gap-2 px-6 h-12 rounded-lg border border-border bg-white/5 hover:bg-white/10 font-medium"
            >
              View Demo
            </Link>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <div className="rounded-2xl border border-border glass p-2 shadow-[0_30px_120px_-30px_oklch(0.5_0.2_265/0.5)]">
              <div className="aspect-[16/9] rounded-xl bg-[radial-gradient(ellipse_at_center,oklch(0.3_0.18_265/0.6),oklch(0.15_0.05_265))] grid place-items-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(oklch(0.7_0.18_265/0.3)_1px,transparent_1px),linear-gradient(90deg,oklch(0.7_0.18_265/0.3)_1px,transparent_1px)] [background-size:40px_40px]" />
                <Cpu className="h-32 w-32 text-cyan-accent opacity-80" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">Everything you need.<br /><span className="text-muted-foreground">Nothing you don't.</span></h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-xl border border-border bg-card/60 p-6 hover:border-primary/50 hover:bg-card/80 transition-all"
            >
              <div className="h-11 w-11 rounded-lg bg-[image:var(--gradient-primary)] grid place-items-center mb-4">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="rounded-2xl border border-border glass p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
          <Boxes className="h-12 w-12 mx-auto text-cyan-accent mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Ready to twin your operation?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">Spin up your first twin in under 5 minutes. No credit card required.</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 h-12 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground font-semibold glow hover:brightness-110"
          >
            Start Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
