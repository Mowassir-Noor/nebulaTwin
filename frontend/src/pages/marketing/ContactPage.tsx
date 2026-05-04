/* eslint-disable */
import { Link } from "react-router-dom";
import { useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";


export default function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <div className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12">
      <div>
        <h1 className="text-4xl font-bold mb-4">Talk to our team</h1>
        <p className="text-muted-foreground mb-8">Tell us about your fleet and we'll get back within 24 hours.</p>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-cyan-accent" /> hello@nebulatwin.io</li>
          <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-cyan-accent" /> +1 (555) 010-0042</li>
          <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-cyan-accent" /> San Francisco, CA</li>
        </ul>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); setSent(true); }}
        className="rounded-xl border border-border bg-card/60 p-6 space-y-4"
      >
        <div>
          <label className="text-sm font-medium">Name</label>
          <input required className="mt-1 w-full h-11 rounded-lg bg-input/40 border border-border px-3 focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input required type="email" className="mt-1 w-full h-11 rounded-lg bg-input/40 border border-border px-3 focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-sm font-medium">Message</label>
          <textarea required rows={4} className="mt-1 w-full rounded-lg bg-input/40 border border-border px-3 py-2 focus:outline-none focus:border-primary" />
        </div>
        <button className="w-full h-11 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground font-medium hover:brightness-110">
          {sent ? "Sent ✓" : "Send message"}
        </button>
      </form>
    </div>
  );
}
