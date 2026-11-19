"use client";

type FormAction = (formData: FormData) => void | Promise<void>;

/** Submit button that asks for confirmation. `{n}` in the message is replaced by the ticked count. */
export function ConfirmSubmit({
  action,
  message,
  needsSelection = false,
  className,
  children,
}: {
  action: FormAction;
  message: string;
  needsSelection?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      formAction={action}
      className={className}
      onClick={(e) => {
        const form = e.currentTarget.form;
        const n = form ? new FormData(form).getAll("ids").length : 0;
        if (needsSelection && n === 0) {
          e.preventDefault();
          window.alert("Tick at least one of your entries first.");
          return;
        }
        if (!window.confirm(message.replace("{n}", String(n)))) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Ticks every one of your entries in the log, or unticks them all if they are already ticked. */
export function SelectAllButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        const form = e.currentTarget.form;
        if (!form) return;
        const boxes = [...form.querySelectorAll<HTMLInputElement>('input[name="ids"]')];
        const allOn = boxes.length > 0 && boxes.every((b) => b.checked);
        for (const b of boxes) b.checked = !allOn;
      }}
    >
      Select all mine
    </button>
  );
}
