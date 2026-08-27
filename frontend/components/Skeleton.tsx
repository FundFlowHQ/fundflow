interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 h-full">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <Skeleton className="w-3/4 h-5 mb-2" />
      <Skeleton className="w-full h-4 mb-1" />
      <Skeleton className="w-2/3 h-4 mb-4" />
      <div className="flex justify-between items-center">
        <Skeleton className="w-20 h-3" />
        <Skeleton className="w-16 h-3" />
      </div>
    </div>
  );
}

export function SkeletonListRow() {
  return (
    <div className="flex items-center justify-between p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="flex-1">
        <Skeleton className="w-40 h-4 mb-2" />
        <Skeleton className="w-28 h-3" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="w-14 h-3" />
        <Skeleton className="w-14 h-5 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <Skeleton className="w-64 h-7 mb-2" />
      <Skeleton className="w-full h-4 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900"
            >
              <Skeleton className="w-24 h-3 mb-2" />
              <Skeleton className="w-16 h-5" />
            </div>
          ))}
      </div>
    </div>
  );
}
