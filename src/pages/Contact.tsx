import { MessageCircle, Phone, Instagram } from "lucide-react";

const Contact = () => {
  return (
    <div className="container mx-auto px-4 py-20 max-w-2xl">
      <h1 className="font-display text-4xl md:text-5xl font-bold text-center mb-4">Get In Touch</h1>
      <p className="font-body text-muted-foreground text-center mb-12">
        We'd love to hear from you. Reach out through any of our channels.
      </p>

      <div className="space-y-6">
        <a
          href="https://wa.me/233594817032"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-5 bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-[hsl(142,70%,45%)] flex items-center justify-center flex-shrink-0">
            <MessageCircle size={22} className="text-card" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">WhatsApp</h3>
            <p className="font-body text-sm text-muted-foreground">0594817032</p>
          </div>
        </a>

        <a
          href="tel:+233594817032"
          className="flex items-center gap-5 bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Phone size={22} className="text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">Phone</h3>
            <p className="font-body text-sm text-muted-foreground">0594817032</p>
          </div>
        </a>

        <a
          href="https://instagram.com/torriefebri"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-5 bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <Instagram size={22} className="text-accent-foreground" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">Instagram</h3>
            <p className="font-body text-sm text-muted-foreground">@Torrie Febri</p>
          </div>
        </a>

        <a
          href="https://tiktok.com/@torrie"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-5 bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
            <span className="text-background font-body font-bold text-sm">TT</span>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">TikTok</h3>
            <p className="font-body text-sm text-muted-foreground">@TORRIE</p>
          </div>
        </a>

        <a
          href="https://facebook.com/luxuriant"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-5 bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-[hsl(220,46%,48%)] flex items-center justify-center flex-shrink-0">
            <span className="text-card font-body font-bold text-sm">f</span>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">Facebook</h3>
            <p className="font-body text-sm text-muted-foreground">Luxuriant</p>
          </div>
        </a>

        <a
          href="https://pinterest.com/torriefebri"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-5 bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-[hsl(0,70%,50%)] flex items-center justify-center flex-shrink-0">
            <span className="text-card font-body font-bold text-sm">P</span>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">Pinterest</h3>
            <p className="font-body text-sm text-muted-foreground">Torrie Febri</p>
          </div>
        </a>

        <a
          href="https://snapchat.com/add/torrie_febri"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-5 bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-[hsl(55,100%,50%)] flex items-center justify-center flex-shrink-0">
            <span className="text-foreground font-body font-bold text-sm">👻</span>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">Snapchat</h3>
            <p className="font-body text-sm text-muted-foreground">Torrie_Febri</p>
          </div>
        </a>
      </div>
    </div>
  );
};

export default Contact;
