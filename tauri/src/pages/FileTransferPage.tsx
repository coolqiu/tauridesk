// pages/FileTransferPage.tsx
import { useParams } from 'react-router-dom';
import FileTransferModule from '../modules/file-transfer';
import PageTitleBar from '../components/PageTitleBar';
import { useTranslation } from 'react-i18next';

export default function FileTransferPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  if (!id) return <div className="p-8 text-red-400">错误：未提供设备 ID</div>;

  return (
    <div className="flex-col h-screen w-screen overflow-hidden bg-[var(--rd-bg-scaffold)]">
      <PageTitleBar title={`${t('File Transfer')} - ${id}`} />
      <main className="flex-1 min-h-0">
        <FileTransferModule peerId={id} />
      </main>
    </div>
  );
}
