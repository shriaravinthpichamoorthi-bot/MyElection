export default function LoadingSpinner({ message = 'Loading election data…' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}
