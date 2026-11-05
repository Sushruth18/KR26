/** CSS flame on a stick. Decorative; animation handled in index.css (disabled under reduced motion). */
export function Torch({ className = '' }: { className?: string }) {
  return (
    <div className={`torch ${className}`} aria-hidden="true">
      <span className="flame" />
      <span className="flame flame-2" />
      <span className="torch-cup" />
      <span className="torch-stick" />
    </div>
  );
}
