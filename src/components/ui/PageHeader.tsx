import { FolkDivider } from './FolkDivider';

interface Props {
  title: string;
  subtitle?: string;
}

/** Standard page title block: exactly one <h1> per page. */
export function PageHeader({ title, subtitle }: Props) {
  return (
    <header className="container-page pt-10 pb-6 text-center md:pt-14">
      <h1 className="text-glow text-gold-300 text-[clamp(2rem,7vw,3.5rem)]">{title}</h1>
      {subtitle && <p className="mt-3 text-lg text-ivory-300">{subtitle}</p>}
      <FolkDivider className="mx-auto mt-6 max-w-xs" />
    </header>
  );
}
