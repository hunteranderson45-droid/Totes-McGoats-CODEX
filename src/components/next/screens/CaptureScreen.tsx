import { useRef } from 'react';

type CaptureScreenProps = {
  previewImage?: string | null;
  analyzing?: boolean;
  onFileSelected: (file: File) => void;
};

export default function CaptureScreen({ previewImage, analyzing, onFileSelected }: CaptureScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-lg font-semibold text-gray-800">Drop a photo or open camera</p>
        <p className="mt-2 text-sm text-gray-500">The AI will identify items and suggest tags.</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          type="button"
          className="mt-4 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
        >
          {analyzing ? 'Analyzing...' : 'Upload Photo'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFileSelected(file);
            event.target.value = '';
          }}
        />
      </div>
      {previewImage && (
        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <img src={previewImage} alt="Preview" className="h-64 w-full object-cover" />
        </div>
      )}
    </section>
  );
}
