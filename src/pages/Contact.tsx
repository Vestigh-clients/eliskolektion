import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Twitter } from "lucide-react";
import { useStorefrontConfig } from "@/contexts/StorefrontConfigContext";
import { buildWhatsAppContactLink } from "@/lib/contact";

interface ContactChannel {
  label: string;
  value: string;
  href: string;
  description: string;
  icon: "whatsapp" | "phone" | "email" | "address";
}

interface SocialChannel {
  label: string;
  href: string;
  value: string;
}

const toDisplayHandle = (value: string): string => {
  if (!value) return "";
  if (value.startsWith("http")) {
    try {
      const url = new URL(value);
      return url.pathname.replace(/^\/+/, "") || url.hostname;
    } catch {
      return value;
    }
  }
  return value;
};

const iconForChannel = (icon: ContactChannel["icon"]) => {
  if (icon === "whatsapp") return <MessageCircle size={20} />;
  if (icon === "phone") return <Phone size={20} />;
  if (icon === "email") return <Mail size={20} />;
  return <MapPin size={20} />;
};

const Contact = () => {
  const { storefrontConfig } = useStorefrontConfig();

  const fullAddress = [storefrontConfig.contact.address, storefrontConfig.contact.city, storefrontConfig.contact.country]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

  const contactChannels: ContactChannel[] = [
    storefrontConfig.contact.whatsapp.trim()
      ? {
          label: "WhatsApp",
          value: storefrontConfig.contact.whatsapp.trim(),
          href: buildWhatsAppContactLink(storefrontConfig.storeName, storefrontConfig.contact.whatsapp),
          description: "Fast support for order and product enquiries.",
          icon: "whatsapp",
        }
      : null,
    storefrontConfig.contact.phone.trim()
      ? {
          label: "Phone",
          value: storefrontConfig.contact.phone.trim(),
          href: `tel:${storefrontConfig.contact.phone.trim()}`,
          description: "Speak directly with our support team.",
          icon: "phone",
        }
      : null,
    storefrontConfig.contact.email.trim()
      ? {
          label: "Email",
          value: storefrontConfig.contact.email.trim(),
          href: `mailto:${storefrontConfig.contact.email.trim()}`,
          description: "Best for detailed enquiries and collaborations.",
          icon: "email",
        }
      : null,
    fullAddress
      ? {
          label: "Location",
          value: fullAddress,
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
          description: "Visit us or locate our showroom on the map.",
          icon: "address",
        }
      : null,
  ].filter((entry): entry is ContactChannel => Boolean(entry));

  const socialChannels: SocialChannel[] = [
    {
      label: "Instagram",
      href: storefrontConfig.socials.instagram.trim(),
      value: toDisplayHandle(storefrontConfig.socials.instagram.trim()),
    },
    {
      label: "Facebook",
      href: storefrontConfig.socials.facebook.trim(),
      value: toDisplayHandle(storefrontConfig.socials.facebook.trim()),
    },
    {
      label: "Twitter",
      href: storefrontConfig.socials.twitter.trim(),
      value: toDisplayHandle(storefrontConfig.socials.twitter.trim()),
    },
    {
      label: "TikTok",
      href: storefrontConfig.socials.tiktok.trim(),
      value: toDisplayHandle(storefrontConfig.socials.tiktok.trim()),
    },
  ].filter((entry) => Boolean(entry.href));

  const hasAnyDirectChannel = contactChannels.length > 0;

  return (
    <div className="bg-white font-body text-zinc-900">
      <header className="relative overflow-hidden bg-gradient-to-br from-[var(--color-surface-strong)] via-[var(--color-secondary)] to-[var(--color-surface-alt)]">
        <div className="absolute -left-20 top-16 h-52 w-52 rounded-full bg-[rgba(var(--color-primary-rgb),0.16)] blur-3xl" />
        <div className="absolute -right-20 bottom-2 h-56 w-56 rounded-full bg-[rgba(var(--color-navbar-solid-foreground-rgb),0.06)] blur-3xl" />
        <div className="relative mx-auto max-w-[1440px] px-6 pb-14 pt-16 md:px-8 md:pb-20 md:pt-20">
          <p className="text-xs font-display font-bold uppercase tracking-[0.18em] text-[#E8A811]">Contact Us</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold uppercase  tracking-tighter leading-[0.95] text-zinc-900 md:text-7xl">
            Let&apos;s <span className=" text-[#E8A811]">Talk</span>
          </h1>
          <p className="mt-6 max-w-2xl font-body text-base leading-relaxed text-zinc-500 md:text-lg">
            Questions about sizing, delivery, orders, or collaborations? Reach out through any of our channels and we&apos;ll help quickly.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-12 md:px-8 md:py-16">
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8">
            {hasAnyDirectChannel ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {contactChannels.map((channel) => (
                  <a
                    key={channel.label}
                    href={channel.href}
                    target={channel.icon === "address" ? "_blank" : undefined}
                    rel={channel.icon === "address" ? "noopener noreferrer" : undefined}
                    className="group rounded-[var(--radius)] bg-[var(--color-surface-strong)] p-5 shadow-[0_16px_28px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(var(--color-navbar-solid-foreground-rgb),0.15)] bg-[var(--color-surface-alt)] text-[#E8A811] transition-colors group-hover:border-[#E8A811] group-hover:text-[#E8A811]">
                        {iconForChannel(channel.icon)}
                      </div>
                      <span className="rounded-full border border-[rgba(var(--color-navbar-solid-foreground-rgb),0.15)] px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-[0.14em] text-[#E8A811]">
                        {channel.label}
                      </span>
                    </div>
                    <p className="mt-4 font-display text-lg font-bold text-zinc-900">{channel.value}</p>
                    <p className="mt-2 font-body text-sm leading-relaxed text-zinc-500">{channel.description}</p>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-[var(--radius)] bg-[var(--color-surface-strong)] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
                <p className="text-xs font-display font-bold uppercase tracking-[0.16em] text-[#E8A811]">Contact Info Coming Soon</p>
                <p className="mt-3 max-w-lg font-body text-sm leading-relaxed text-zinc-500">
                  Our direct support channels are being updated. Please check back shortly or reach us through social media in the meantime.
                </p>
              </div>
            )}

            <div className="mt-6 rounded-[var(--radius)] bg-[rgba(var(--color-navbar-solid-foreground-rgb),0.94)] p-6 text-[var(--theme-text-inverse)]">
              <p className="text-xs font-display font-bold uppercase tracking-[0.16em] text-[#E8A811]">Support Hours</p>
              <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">We Reply Fast</h2>
              <p className="mt-3 font-body text-sm leading-relaxed text-[rgba(var(--color-secondary-rgb),0.8)]">
                Monday to Saturday, 9:00 AM to 7:00 PM (GMT). We usually respond on WhatsApp and email within the same day.
              </p>
            </div>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-[var(--radius)] bg-[var(--color-surface-strong)] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-display font-bold uppercase tracking-[0.16em] text-[#E8A811]">Need Immediate Help?</p>
              <h3 className="mt-2 font-display text-lg font-bold uppercase tracking-tight text-zinc-900">Quick Routes</h3>
              <div className="mt-4 space-y-3">
                {storefrontConfig.contact.whatsapp.trim() ? (
                  <a
                    href={buildWhatsAppContactLink(storefrontConfig.storeName, storefrontConfig.contact.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-[var(--radius)] border border-[rgba(var(--color-navbar-solid-foreground-rgb),0.15)] px-4 py-3 font-display text-[11px] font-bold uppercase tracking-wider text-zinc-900 transition-colors hover:border-[#E8A811] hover:text-[#E8A811]"
                  >
                    <span>Chat on WhatsApp</span>
                    <MessageCircle size={16} />
                  </a>
                ) : null}
                {storefrontConfig.contact.email.trim() ? (
                  <a
                    href={`mailto:${storefrontConfig.contact.email.trim()}`}
                    className="flex items-center justify-between rounded-[var(--radius)] border border-[rgba(var(--color-navbar-solid-foreground-rgb),0.15)] px-4 py-3 font-display text-[11px] font-bold uppercase tracking-wider text-zinc-900 transition-colors hover:border-[#E8A811] hover:text-[#E8A811]"
                  >
                    <span>Send an Email</span>
                    <Mail size={16} />
                  </a>
                ) : null}
                <a
                  href="/shop"
                  className="flex items-center justify-between rounded-[var(--radius)] border border-[rgba(var(--color-navbar-solid-foreground-rgb),0.15)] px-4 py-3 font-display text-[11px] font-bold uppercase tracking-wider text-zinc-900 transition-colors hover:border-[#E8A811] hover:text-[#E8A811]"
                >
                  <span>Continue Shopping</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </a>
              </div>
            </div>

            <div className="rounded-[var(--radius)] bg-[var(--color-surface-alt)] p-6">
              <p className="text-xs font-display font-bold uppercase tracking-[0.16em] text-[#E8A811]">Follow Us</p>
              {socialChannels.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {socialChannels.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[var(--radius)] bg-[var(--color-surface-strong)] px-4 py-3 font-display text-[11px] font-bold uppercase tracking-wider text-zinc-900 transition-colors hover:text-[#E8A811]"
                    >
                      <span className="flex items-center gap-2">
                        {social.label === "Instagram" ? <Instagram size={15} /> : null}
                        {social.label === "Facebook" ? <Facebook size={15} /> : null}
                        {social.label === "Twitter" ? <Twitter size={15} /> : null}
                        {social.label === "TikTok" ? <span className="material-symbols-outlined text-[15px]">music_note</span> : null}
                        {social.label}
                      </span>
                      <span className="max-w-[130px] truncate text-[10px] text-zinc-500">{social.value || "View"}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-3 font-body text-sm leading-relaxed text-zinc-500">
                  Social links are currently being refreshed. Check again soon for our latest updates.
                </p>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default Contact;
