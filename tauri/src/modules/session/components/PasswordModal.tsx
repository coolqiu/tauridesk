// components/PasswordModal.tsx
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PasswordModalProps {
  title: string;
  text: string;
  onSubmit: (pwd: string) => void;
  onCancel: () => void;
}

export default function PasswordModal({ title, text, onSubmit, onCancel }: PasswordModalProps) {
  const { t } = useTranslation();
  return (
    <div className="rs-modal-overlay fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center">
      <div className="rs-modal-content bg-[var(--rd-bg-content)] p-8 rounded-2xl border border-[#333] w-full max-w-sm shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="p-4 bg-blue-500/10 rounded-full mb-4">
            <Lock size={40} className="text-blue-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-sm text-secondary text-center mt-2">{text}</p>
        </div>
        <input
          type="password"
          className="w-full bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-white mb-6 focus:border-[var(--rd-accent)] transition-colors outline-none"
          autoFocus
          placeholder={t('Enter Password')}
          onKeyDown={e => e.key === 'Enter' && onSubmit((e.target as HTMLInputElement).value)}
        />
        <div className="flex gap-3">
          <button className="flex-1 py-2.5 rounded-lg bg-[#333] text-white hover:bg-[#444] transition-colors" onClick={onCancel}>
            {t('Cancel')}
          </button>
          <button 
            className="flex-1 py-2.5 rounded-lg bg-[var(--rd-accent)] text-white hover:opacity-90 transition-opacity"
            onClick={() => {
              const input = document.querySelector('input[type="password"]') as HTMLInputElement;
              onSubmit(input.value);
            }}
          >
            {t('Login')}
          </button>
        </div>
      </div>
    </div>
  );
}
