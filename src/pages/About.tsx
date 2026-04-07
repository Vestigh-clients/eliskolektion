import { useStorefrontConfig } from "@/contexts/StorefrontConfigContext";

const STORY_PARAGRAPHS = [
  "Eli's Kolektion was built on a simple belief: that great style should be accessible, intentional, and worth keeping. What began as a personal obsession with curating the right pieces grew into a destination for those who dress with purpose.",
  "Every item in the kolektion is handpicked — not for trend, but for lasting relevance. We look for silhouettes that command attention, fabrics that hold their shape, and pieces that feel like a statement every time you put them on.",
  "Eli's Kolektion is more than a store. It is a curation. A living archive of pieces that matter — footwear that tells a story, streetwear that earns its place, and apparel that outlasts the season it arrived in.",
  "We believe the best wardrobes are built slowly, deliberately, and with taste. Our job is to source what you would find yourself if you had the time, the access, and the eye for it.",
  "At Eli's Kolektion, every customer deserves to feel like a curator of their own identity. Fashion should not just fit your body — it should fit who you are.",
  "This is our kolektion. We hope it becomes yours.",
];

const About = () => {
  const { storefrontConfig } = useStorefrontConfig();

  return (
    <div className="bg-white font-body text-zinc-900">
      <header className="relative overflow-hidden bg-gradient-to-br from-[var(--color-surface-strong)] via-[var(--color-secondary)] to-[var(--color-surface-alt)]">
        <div className="absolute -left-24 top-10 h-56 w-56 rounded-full bg-[rgba(var(--color-primary-rgb),0.16)] blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-[rgba(var(--color-navbar-solid-foreground-rgb),0.06)] blur-3xl" />
        <div className="relative mx-auto max-w-[1440px] px-6 pb-14 pt-16 md:px-8 md:pb-20 md:pt-20">
          <p className="text-xs font-display font-bold uppercase tracking-[0.18em] text-[#E8A811]">About Eli's Kolektion</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold uppercase  tracking-tighter leading-[0.95] text-zinc-900 md:text-7xl">
            Our <span className=" text-[#E8A811]">Story</span>
          </h1>
          <p className="mt-6 max-w-2xl font-body text-base leading-relaxed text-zinc-500 md:text-lg">
            Built from campus hustle, deep friendship, and a belief that fashion should make people feel seen, confident,
            and empowered.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-12 md:px-8 md:py-16">
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          <article className="rounded-[var(--radius)] bg-[var(--color-surface-strong)] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.04)] md:p-8 lg:col-span-8">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-zinc-900 md:text-3xl">The Kolektion Story</h2>
            <div className="mt-6 space-y-6 font-body text-[15px] leading-[1.95] text-zinc-500 md:text-base">
              {STORY_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <p className="mt-8 border-t border-[rgba(var(--color-navbar-solid-foreground-rgb),0.15)] pt-6 font-display text-xl font-black uppercase tracking-wide text-[#E8A811]">
              Built with taste. Curated with purpose. This is Eli's Kolektion.
            </p>
          </article>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-[var(--radius)] bg-[var(--color-surface-alt)] p-6">
              <p className="text-xs font-display font-bold uppercase tracking-[0.16em] text-[#E8A811]">Brand Promise</p>
              <h3 className="mt-2 font-display text-lg font-bold uppercase tracking-tight text-zinc-900">Confidence in Every Piece</h3>
              <p className="mt-4 font-body text-sm leading-relaxed text-zinc-500">
                Every collection is selected to help you feel stylish, assured, and fully yourself every time you get
                dressed.
              </p>
            </div>

            <div className="rounded-[var(--radius)] bg-[var(--color-surface-strong)] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-display font-bold uppercase tracking-[0.16em] text-[#E8A811]">Rooted In</p>
              <p className="mt-3 font-body text-sm text-zinc-500">A passion for curated fashion</p>
              <div className="my-4 h-px w-full bg-[rgba(var(--color-navbar-solid-foreground-rgb),0.12)]" />
              <p className="text-xs font-display font-bold uppercase tracking-[0.16em] text-[#E8A811]">Built For</p>
              <p className="mt-3 font-body text-sm text-zinc-500">Digital curators who dress with intention and wear with confidence.</p>
              <div className="my-4 h-px w-full bg-[rgba(var(--color-navbar-solid-foreground-rgb),0.12)]" />
              <p className="text-xs font-display font-bold uppercase tracking-[0.16em] text-[#E8A811]">Driven By</p>
              <p className="mt-3 font-body text-sm text-zinc-500">Quality over quantity, taste over trend, and pieces that last.</p>
            </div>

            <div className="rounded-[var(--radius)] bg-[rgba(var(--color-navbar-solid-foreground-rgb),0.94)] p-6 text-[var(--theme-text-inverse)]">
              <p className="text-xs font-display font-bold uppercase tracking-[0.16em] text-[#E8A811]">A Note from {storefrontConfig.storeName}</p>
              <p className="mt-3 font-body text-sm leading-relaxed text-[rgba(var(--color-secondary-rgb),0.86)]">
                Thank you for being part of the kolektion. Every order is a vote for intentional style and a store built around the pieces that actually matter.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default About;
