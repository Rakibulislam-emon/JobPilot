type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className = "size-9" }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-[11px] border border-line-2 bg-surface-2 ${className}`}
    >
      <svg viewBox="0 0 36 36" className="h-[78%] w-[78%]" fill="none">
        <path
          d="M11.5 9.5h7.1l6 6v11h-13.1v-17Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M18.5 9.8v5.7h5.7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M14.5 22v-2.5l3-3 2.7 2.7 4.3-4.5"
          stroke="var(--color-accent)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function BrandName({ className = "" }: { className?: string }) {
  return (
    <span className={`whitespace-nowrap font-semibold tracking-[-0.045em] text-fg ${className}`}>
      JobDesk<span aria-hidden="true" className="ml-1 inline-block size-1.5 rounded-full bg-accent align-[0.12em]" />
    </span>
  );
}
