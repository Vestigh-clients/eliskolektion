import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { contentConfig } from "@/config/content.config";
import { useStorefrontConfig } from "@/contexts/StorefrontConfigContext";
import { buildWhatsAppContactLink } from "@/lib/contact";

type FooterLink = {
  label: string;
  href: string;
};

const isAbsoluteUrl = (href: string) => /^https?:\/\//i.test(href);
const isSpecialProtocol = (href: string) => href.startsWith("mailto:") || href.startsWith("tel:");

const Footer = () => {
  const { storefrontConfig, storefrontCategories } = useStorefrontConfig();
  const navigate = useNavigate();
  const [newsletterEmail, setNewsletterEmail] = useState("");

  const explorationLinks = useMemo<FooterLink[]>(() => {
    return storefrontCategories.slice(0, 6).map((category) => ({
      label: category.name.trim() || "Category",
      href: `/shop?category=${encodeURIComponent(category.slug)}`,
    }));
  }, [storefrontCategories]);

  const supportLinks = useMemo<FooterLink[]>(() => {
    const fromConfig = contentConfig.footer.companyLinks
      .map((link) => ({ label: link.label.trim(), href: link.href.trim() }))
      .filter((link) => Boolean(link.label) && Boolean(link.href));

    const contactLinks: FooterLink[] = [];
    if (storefrontConfig.contact.whatsapp.trim()) {
      contactLinks.push({
        label: "WhatsApp Support",
        href: buildWhatsAppContactLink(storefrontConfig.storeName, storefrontConfig.contact.whatsapp),
      });
    }
    if (storefrontConfig.contact.email.trim()) {
      contactLinks.push({ label: "Email Us", href: `mailto:${storefrontConfig.contact.email.trim()}` });
    }
    if (storefrontConfig.contact.phone.trim()) {
      contactLinks.push({ label: "Call Us", href: `tel:${storefrontConfig.contact.phone.trim()}` });
    }

    return [...fromConfig, ...contactLinks];
  }, [storefrontConfig.contact.email, storefrontConfig.contact.phone, storefrontConfig.contact.whatsapp, storefrontConfig.storeName]);

  const socialLinks = useMemo<FooterLink[]>(() => {
    const entries = [
      { label: "Instagram", href: storefrontConfig.socials.instagram.trim() },
      { label: "Twitter / X", href: storefrontConfig.socials.twitter.trim() },
      { label: "Facebook", href: storefrontConfig.socials.facebook.trim() },
      { label: "TikTok", href: storefrontConfig.socials.tiktok.trim() },
    ].filter((item) => Boolean(item.href));

    const seen = new Set<string>();
    return entries.filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  }, [storefrontConfig.socials.facebook, storefrontConfig.socials.instagram, storefrontConfig.socials.tiktok, storefrontConfig.socials.twitter]);

  const renderLink = (link: FooterLink, className: string) => {
    if (isAbsoluteUrl(link.href) || isSpecialProtocol(link.href)) {
      return (
        <a
          href={link.href}
          className={className}
          target={isAbsoluteUrl(link.href) ? "_blank" : undefined}
          rel={isAbsoluteUrl(link.href) ? "noopener noreferrer" : undefined}
        >
          {link.label}
        </a>
      );
    }
    return (
      <Link to={link.href.startsWith("/") ? link.href : `/${link.href}`} className={className}>
        {link.label}
      </Link>
    );
  };

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = newsletterEmail.trim();
    if (!normalizedEmail) return;
    const supportEmail = storefrontConfig.contact.email.trim();
    if (!supportEmail) {
      navigate("/contact");
      return;
    }
    const subject = encodeURIComponent(`${storefrontConfig.storeName} newsletter signup`);
    const body = encodeURIComponent(`Please add this email to the newsletter list:\n\n${normalizedEmail}`);
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    setNewsletterEmail("");
  };

  const linkClass = "text-zinc-500 text-[10px] uppercase tracking-widest font-bold font-manrope hover:text-[#E8A811] transition-colors";
  const headingClass = "text-[11px] font-black uppercase tracking-widest text-black mb-8 font-manrope";

  return (
    <footer className="bg-white border-t border-zinc-100 pt-24 pb-12">
      <div className="px-6 w-full max-w-[1440px] mx-auto md:px-8">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-16 mb-16 md:mb-24">
          {/* Brand */}
          <div>
            <div className="text-xl font-black text-black uppercase mb-6 tracking-tighter italic font-manrope">
              {storefrontConfig.storeName}
            </div>
            <p className="text-zinc-400 text-[11px] max-w-xs leading-relaxed uppercase tracking-[0.2em] font-medium font-manrope">
              {contentConfig.footer.description}
            </p>
          </div>

          {/* Exploration */}
          <div>
            <h5 className={headingClass}>Exploration</h5>
            <ul className="flex flex-col gap-5">
              <li>
                <Link to="/shop" className={linkClass}>Shop All</Link>
              </li>
              {explorationLinks.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  {renderLink(link, linkClass)}
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h5 className={headingClass}>Support</h5>
            <ul className="flex flex-col gap-5">
              {supportLinks.length > 0 ? (
                supportLinks.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    {renderLink(link, linkClass)}
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/contact" className={linkClass}>Contact Us</Link></li>
                  <li><Link to="/about" className={linkClass}>About Us</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Newsletter + Social */}
          <div>
            <h5 className={headingClass}>Join the Kolektion</h5>
            <p className="text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-medium font-manrope mb-6">
              Early access to drops and exclusive pricing.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="mb-10">
              <div className="flex border-b border-zinc-300 pb-3 focus-within:border-[#E8A811] transition-colors">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                  placeholder="ENTER YOUR EMAIL"
                  className="bg-transparent border-none focus:ring-0 focus:outline-none text-[10px] font-bold uppercase tracking-widest w-full p-0 placeholder:text-zinc-400 font-manrope"
                />
                <button
                  type="submit"
                  className="text-[10px] font-black uppercase tracking-widest ml-4 hover:text-[#E8A811] transition-colors whitespace-nowrap font-manrope"
                >
                  Join Now
                </button>
              </div>
            </form>

            {socialLinks.length > 0 ? (
              <div>
                <h5 className={headingClass}>Social</h5>
                <ul className="flex flex-col gap-4">
                  {socialLinks.map((social) => (
                    <li key={`${social.label}-${social.href}`}>
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                      >
                        {social.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-t border-zinc-100 pt-10">
          <div className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-bold font-manrope">
            &copy; {new Date().getFullYear()} {storefrontConfig.storeName}. Crafted for the Digital Curator.
          </div>
          <div className="flex gap-6">
            <span className="material-symbols-outlined text-zinc-300">payments</span>
            <span className="material-symbols-outlined text-zinc-300">shopping_bag</span>
            <span className="material-symbols-outlined text-zinc-300">shield</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
