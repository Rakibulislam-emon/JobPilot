"use client";

import type { Job } from "@/lib/types";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ButtonHTMLAttributes,
    type ReactNode,
} from "react";
import { Icon } from "./Icon";

// The form is heavy (image/OCR helpers), so it is loaded the first time the
// modal opens instead of on every page in the app shell.
const JobForm = dynamic(() => import("./JobForm").then((mod) => mod.JobForm), {
  ssr: false,
  loading: () => (
    <div className="space-y-4" aria-hidden="true">
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-44 w-full" />
      <div className="skeleton h-52 w-full" />
    </div>
  ),
});

type AddJobContextValue = {
  isOpen: boolean;
  open: (job?: Job) => void;
  close: () => void;
};

const AddJobContext = createContext<AddJobContextValue | null>(null);

export function useAddJob(): AddJobContextValue {
  const ctx = useContext(AddJobContext);
  if (!ctx) throw new Error("useAddJob must be used inside <AddJobProvider>");
  return ctx;
}

export function AddJobProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>();
  // Remounting on each open gives the form a clean slate.
  const [session, setSession] = useState(0);
  const pathname = usePathname();

  const open = useCallback((job?: Job) => {
    setEditingJob(job);
    setSession((value) => value + 1);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setEditingJob(undefined);
  }, []);

  // Creating a job navigates to its detail page while this provider survives.
  // Close the dialog on navigation; modal edits close after their action succeeds.
  useEffect(() => {
    setIsOpen(false);
    setEditingJob(undefined);
  }, [pathname]);

  return (
    <AddJobContext.Provider value={{ isOpen, open, close }}>
      {children}
      {isOpen && <AddJobDialog key={session} job={editingJob} onClose={close} />}
    </AddJobContext.Provider>
  );
}

/** Any button that should open the add-job modal. */
export function AddJobTrigger({
  className,
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open } = useAddJob();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) open();
      }}
      className={className}
    >
      {children}
    </button>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function AddJobDialog({ job, onClose }: { job?: Job; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const frame = requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="animate-fade absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div
        className="relative flex h-dvh w-full items-end justify-center sm:h-auto sm:min-h-full sm:items-center sm:p-4 md:p-6"
        onClick={onClose}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-job-title"
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          className="animate-in fade-in-0 slide-in-from-bottom-4 flex h-[100dvh] w-full flex-col overflow-hidden bg-bg duration-200 outline-none sm:h-auto sm:max-h-[88dvh] sm:max-w-3xl sm:rounded-xl sm:border sm:border-line-2 sm:shadow-2xl"
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-4">
            <div className="min-w-0">
              <h2
                id="add-job-title"
                className="text-[15px] font-medium tracking-tight text-fg"
              >
                {job ? "Edit job" : "Add a job"}
              </h2>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                {job
                  ? "Update the details for this application."
                  : "Paste a post or add a screenshot — details are picked up when available."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${job ? "edit" : "add job"} form`}
              className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <Icon name="close" size={17} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            <JobForm
              job={job}
              onCancel={onClose}
              stickyActions
              idPrefix={job ? "edit-job" : "add-job"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
