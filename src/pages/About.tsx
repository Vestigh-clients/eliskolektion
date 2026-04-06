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
    <div className="bg-[#F9F9F9] font-manrope text-[#1A1C1C]">
      <header className="relative overflow-hidden border-b border-[#dde2e6] bg-gradient-to-br from-[#ffffff] via-[#f5f7f8] to-[#f9f9f9]">
        <div className="absolute -left-24 top-10 h-56 w-56 rounded-full bg-[#e9ecef] blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-[#f8d6e4] blur-3xl" />
        <div className="relative mx-auto max-w-screen-2xl px-4 pb-14 pt-16 md:px-8 md:pb-20 md:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8A811]">About Eli's Kolektion</p>
          <h1 className="mt-3 font-notoSerif text-5xl font-bold leading-[0.95] text-[#1A1C1C] md:text-7xl">
            Our <span className="italic text-[#D81B60]">Story</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#5E5E5E] md:text-lg">
            Built from campus hustle, deep friendship, and a belief that fashion should make people feel seen, confident,
            and empowered.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-4 py-12 md:px-8 md:py-16">
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          <article className="rounded-[8px] border border-[#e3bdc7] bg-white p-6 shadow-[0_14px_30px_rgba(26,28,28,0.05)] md:p-8 lg:col-span-8">
            <h2 className="font-notoSerif text-3xl font-bold text-[#1A1C1C] md:text-4xl">The Kolektion Story</h2>
            <div className="mt-6 space-y-6 text-[15px] leading-[1.95] text-[#4e4e4e] md:text-base">
              {STORY_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <p className="mt-8 border-t border-[#e1e5e8] pt-6 font-notoSerif text-xl font-semibold italic text-[#E8A811]">
              Built with taste. Curated with purpose. This is Eli's Kolektion.
            </p>
          </article>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-[8px] border border-[#e3bdc7] bg-[#f5f7f8] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E8A811]">Brand Promise</p>
              <h3 className="mt-2 font-notoSerif text-2xl font-bold text-[#1A1C1C]">Confidence in Every Piece</h3>
              <p className="mt-4 text-sm leading-relaxed text-[#5E5E5E]">
                Every collection is selected to help you feel stylish, assured, and fully yourself every time you get
                dressed.
              </p>
            </div>

            <div className="rounded-[8px] border border-[#e3bdc7] bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E8A811]">Rooted In</p>
              <p className="mt-3 text-sm text-[#5E5E5E]">A passion for curated fashion</p>
              <div className="my-4 h-px w-full bg-[#e1e5e8]" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E8A811]">Built For</p>
              <p className="mt-3 text-sm text-[#5E5E5E]">Digital curators who dress with intention and wear with confidence.</p>
              <div className="my-4 h-px w-full bg-[#e1e5e8]" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E8A811]">Driven By</p>
              <p className="mt-3 text-sm text-[#5E5E5E]">Quality over quantity, taste over trend, and pieces that last.</p>
            </div>

            <div className="rounded-[8px] border border-[#e3bdc7] bg-[#1A1C1C] p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E8A811]">A Note from {storefrontConfig.storeName}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
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
