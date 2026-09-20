interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="w-8 h-8 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-2.5 w-32" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr>
      <td className="py-4 px-4"><Skeleton className="h-3 w-24" /></td>
      <td className="py-4 px-4"><Skeleton className="h-3 w-48" /></td>
      <td className="py-4 px-4"><Skeleton className="h-3 w-20" /></td>
      <td className="py-4 px-4"><Skeleton className="h-3 w-12" /></td>
      <td className="py-4 px-4"><Skeleton className="h-3 w-16" /></td>
      <td className="py-4 px-4"><Skeleton className="h-3 w-20" /></td>
      <td className="py-4 px-4 text-right"><Skeleton className="h-7 w-16 ml-auto rounded-lg" /></td>
    </tr>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </>
  );
}
