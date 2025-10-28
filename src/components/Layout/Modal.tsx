'use client';

interface ModalProps {
  message: string;
  type: string;
}

export default function Modal({ message, type }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-lg shadow-xl text-center max-w-sm w-full ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}>
        <p className="text-lg font-semibold">{message}</p>
      </div>
    </div>
  );
}
