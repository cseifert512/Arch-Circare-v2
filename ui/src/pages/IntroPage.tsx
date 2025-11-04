import { Header } from '../figma-ui/src/components/Header';
import { HeroSearch } from '../components/landing/HeroSearch';
import { SuggestedQueries } from '../components/landing/SuggestedQueries';

export default function IntroPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-36 pb-16">
        <div className="max-w-[1200px] md:max-w-[1440px] mx-auto px-6 md:px-8 text-center">
          <h1 className="text-[40px] md:text-[56px] lg:text-[64px] font-extrabold leading-tight text-[var(--text-primary)]">
            Find your next architectural
            <br />
            inspiration
          </h1>
          <p className="mt-4 text-[16px] md:text-[18px] text-[var(--text-secondary)]">
            Search by description, upload an image, or both to discover relevant{' '}
            <br className="hidden md:block" />
            building projects
          </p>

          <div className="mt-10">
            <HeroSearch />
          </div>

          <div className="mt-6">
            <SuggestedQueries />
          </div>
        </div>
      </main>
    </div>
  );
}


