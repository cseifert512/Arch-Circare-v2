export function SuggestedQueries() {
  const queries = [
    'Museums with courtyard circulation in hot climates',
    'Timber construction schools in Scandinavia',
    'Brutalist housing with vertical gardens',
    'Contemporary libraries with natural ventilation',
    'Waterfront adaptive reuse projects',
  ];

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)] mb-2">
        <span className="inline-block">Try these searches:</span>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        {queries.map((q) => (
          <span
            key={q}
            className="px-4 py-2 rounded-full border border-[var(--border-color)] bg-white text-[13px] text-[var(--text-secondary)] hover:bg-gray-50 cursor-pointer"
          >
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}
