export function SuggestedQueries() {
  const queries = [
    'Museums with courtyard circulation in hot climates',
    'Timber construction schools in Scandinavia',
    'Brutalist housing with vertical gardens',
    'Contemporary libraries with natural ventilation',
    'Waterfront adaptive reuse projects',
  ];

  return (
    <div className="max-w-[1200px] md:max-w-[1440px] mx-auto">
      <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)] mb-2">
        <span className="inline-block">Try these searches:</span>
      </div>
      <div className="flex flex-wrap gap-3 md:gap-3.5 justify-center">
        {queries.map((q) => (
          <button
            key={q}
            type="button"
            className="inline-flex items-center h-8 px-4 rounded-full border border-[var(--border-color)] bg-white text-[13px] leading-[1.2] text-[var(--text-secondary)] hover:bg-gray-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
