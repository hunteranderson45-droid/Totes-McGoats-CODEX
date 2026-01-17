type CaptureDropzoneProps = {
  onClick?: () => void;
};

export default function CaptureDropzone({ onClick }: CaptureDropzoneProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center"
    >
      <p className="text-sm font-semibold text-gray-800">Drop a photo or tap to capture</p>
      <p className="mt-2 text-xs text-gray-500">We will extract items and tags automatically.</p>
    </button>
  );
}
