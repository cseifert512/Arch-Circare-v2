export function ProjectCardSkeleton() {
  return (
    <div className="w-[280px] bg-white rounded-lg overflow-hidden animate-pulse">
      <div className="w-full h-[200px] bg-gray-200" />
      <div className="p-3 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="flex gap-3">
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
        <div className="flex justify-between pt-1">
          <div className="flex gap-2">
            <div className="h-4 w-4 bg-gray-200 rounded" />
            <div className="h-4 w-4 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-4 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}
