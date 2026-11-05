import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { DeadlineBanner } from '../components/home/DeadlineBanner';
import { Hero } from '../components/home/Hero';
import { Countdown } from '../components/home/Countdown';
import { HomePlaques } from '../components/home/HomePlaques';
import { ProcessionPreview } from '../components/home/ProcessionPreview';

export default function Home() {
  useDocumentMeta('pages.home.title', 'pages.home.description');
  return (
    <>
      <DeadlineBanner />
      <Hero />
      <Countdown />
      <HomePlaques />
      <ProcessionPreview />
    </>
  );
}
