/* eslint-disable */
import { Link } from "react-router-dom";


export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="text-5xl font-bold mb-6">About NebulaTwin Pro</h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        We believe physical infrastructure deserves software as good as the apps on your phone.
        NebulaTwin Pro was built by a team of engineers who lived inside SCADA control rooms and
        wished for a better way. We blend 3D, real-time data, and AI into a single product that
        operations teams actually love using.
      </p>
      <div className="grid md:grid-cols-3 gap-6 mt-16">
        {[
          { k: "10M+", v: "Sensor events / day" },
          { k: "120+", v: "Industrial customers" },
          { k: "99.99%", v: "Uptime SLA" },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-border bg-card/60 p-6 text-center">
            <div className="text-3xl font-bold text-gradient">{s.k}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
