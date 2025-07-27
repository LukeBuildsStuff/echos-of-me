import Link from "next/link";

const CTA = () => {
  return (
    <section className="py-16 md:py-20 lg:py-28">
      <div className="container">
        <div className="wow fadeInUp mx-auto max-w-[590px] text-center" data-wow-delay=".1s">
          <h2 className="mb-4 text-3xl font-bold !leading-tight text-black dark:text-white sm:text-4xl md:text-[45px]">
            Your Legacy Awaits
          </h2>
          <p className="mb-10 text-base !leading-relaxed text-body-color md:text-lg">
            Every question you answer becomes an irreplaceable gift to your family. 
            Begin building a digital legacy that truly captures the love and wisdom that makes you who you are.
          </p>
          <div className="flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <Link
              href="/auth/register"
              className="rounded-sm bg-primary px-8 py-4 text-base font-semibold text-white duration-300 ease-in-out hover:bg-primary/80"
            >
              💝 Begin Your Legacy
            </Link>
            <Link
              href="/auth/signin"
              className="inline-block rounded-sm bg-black px-8 py-4 text-base font-semibold text-white duration-300 ease-in-out hover:bg-black/90 dark:bg-white/10 dark:text-white dark:hover:bg-white/5"
            >
              Continue Your Journey
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;