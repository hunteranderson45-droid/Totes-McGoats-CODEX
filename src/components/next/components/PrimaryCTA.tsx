type PrimaryCTAProps = {
  label: string;
  onClick?: () => void;
};

export default function PrimaryCTA({ label, onClick }: PrimaryCTAProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm"
    >
      {label}
    </button>
  );
}
