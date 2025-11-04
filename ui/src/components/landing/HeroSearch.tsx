import { useRef } from 'react';
import { Search, Upload } from 'lucide-react';

export function HeroSearch() {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full flex flex-col md:flex-row items-stretch gap-3 md:gap-4 justify-center">
      <div className="relative w-full md:flex-1 min-w-[320px] max-w-[880px]">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={20} aria-hidden="true" />
        <input
          aria-label="Search projects"
          placeholder="Museums with courtyard circulation in hot climates"
          className="w-full h-14 leading-[56px] pl-12 pr-4 rounded-full border border-[var(--border-color)] bg-white text-[16px] outline-none focus:ring-2 focus:ring-[#7E7AC8]/40"
        />
      </div>

      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="h-14 leading-[56px] px-5 rounded-full border border-[var(--border-color)] bg-white text-[14px] flex items-center gap-2 hover:bg-gray-50"
        >
          <Upload size={18} aria-hidden="true" />
          Upload
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={() => { /* no-op scaffold */ }} />

        <button
          type="button"
          onClick={() => { /* no-op scaffold */ }}
          className="h-14 leading-[56px] px-8 rounded-full bg-[#7E7AC8] hover:bg-[#6C64BF] text-white text-[16px] font-medium"
        >
          Search
        </button>
      </div>
    </div>
  );
}
