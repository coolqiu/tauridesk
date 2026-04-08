import { useState } from 'react';
import { 
  Plus, Search, ListFilter, LayoutGrid, 
  Monitor, Laptop, Smartphone, MoreVertical,
  User, CheckCircle2, XCircle
} from 'lucide-react';

export default function AddressBook() {
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const peers = [
    { id: '123 456 789', alias: 'Office Windows PC', platform: 'Windows', online: true },
    { id: '987 654 321', alias: 'MacBook Pro 14', platform: 'MacOS', online: false },
    { id: '555 666 777', alias: 'Android S24 Ultra', platform: 'Android', online: true },
    { id: '222 333 444', alias: 'Linux Lab Server', platform: 'Linux', online: true },
    { id: '888 777 666', alias: 'iPad Air 5', platform: 'iOS', online: false },
  ];

  return (
    <div className="flex-1 flex-col p-8 gap-8 overflow-hidden h-full">
      {/* 1. TOP HEADER (INDUSTRIAL ALIGNMENT) */}
      <div className="flex-row justify-between">
         <div className="flex-row gap-2">
            <h1 className="text-[20px] font-bold text-[var(--rd-text-primary)]">地址簿</h1>
            <span className="bg-[var(--rd-bg-scaffold)] text-[11px] font-bold px-1.5 py-0.5 rounded opacity-40">
               {peers.length}
            </span>
         </div>
         <div className="flex-row gap-4">
            <button className="flex-row gap-2 px-6 py-2 bg-[var(--rd-accent)] text-white rounded text-[13.5px] font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all">
               <Plus size={16} strokeWidth={2.5} />
               添加设备
            </button>
         </div>
      </div>

      {/* 2. TOOLBAR (ENFORCED 32PX TABS) */}
      <div className="flex-row justify-between border-b border-[var(--rd-border)]">
         <div className="flex-row gap-[32px] pl-2"> {/* RIGID INDUSTRIAL GAP */}
            {[
              { id: 'all', label: '全部' },
              { id: 'online', label: '在线' },
              { id: 'offline', label: '离线' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rd-icon-tab h-[44px] font-bold text-[13.5px] ${activeTab === tab.id ? 'active' : ''}`}
                style={{ width: '44px' }}
              >
                 {tab.label}
              </button>
            ))}
         </div>

         <div className="flex-row gap-6 pr-3 opacity-30 hover:opacity-100 transition-opacity">
            <button className="hover:text-[var(--rd-text-primary)]"><Search size={20} strokeWidth={1.5} /></button>
            <button className="hover:text-[var(--rd-text-primary)]"><ListFilter size={20} strokeWidth={1.5} /></button>
            <button 
               onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
               className="hover:text-[var(--rd-text-primary)]"
            >
               <LayoutGrid size={20} strokeWidth={1.5} />
            </button>
         </div>
      </div>

      {/* 3. PEER GRID (1:1 INDUSTRIAL REPLICATION) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-2 pr-1">
         <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
            : "flex-col gap-1"
         }>
            {peers.map((peer) => (
              <div key={peer.id} className={`rd-card group cursor-pointer hover:border-[var(--rd-accent)] transition-all ${viewMode === 'grid' ? 'p-5 flex-col gap-5' : 'p-3 flex-row gap-4'}`}>
                 <div className={`flex items-center justify-center bg-gray-400/5 rounded ${viewMode === 'grid' ? 'w-full h-24' : 'w-10 h-10'}`}>
                    {peer.platform === 'Windows' ? <Monitor size={viewMode === 'grid' ? 44 : 20} strokeWidth={1.0} /> : 
                     peer.platform === 'MacOS' ? <Laptop size={viewMode === 'grid' ? 44 : 20} strokeWidth={1.0} /> : <Smartphone size={viewMode === 'grid' ? 44 : 20} strokeWidth={1.0} />}
                 </div>
                 
                 <div className="flex-1 flex-col min-w-0" style={{ justifyContent: 'center' }}>
                    <div className="flex-row gap-2">
                       <div className={`w-2 h-2 rounded-full border border-white ${peer.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                       <span className="text-[14px] font-bold text-[var(--rd-text-primary)] truncate">{peer.id}</span>
                       {peer.online && <CheckCircle2 size={12} className="text-green-500 opacity-60" />}
                    </div>
                    <span className="text-[12px] text-[var(--rd-text-secondary)] font-normal truncate">{peer.alias}</span>
                 </div>

                 <div className="flex-row items-center justify-end">
                    <button className="p-1 text-[var(--rd-text-secondary)] opacity-0 group-hover:opacity-100 hover:text-[var(--rd-text-primary)]">
                       <MoreVertical size={18} />
                    </button>
                 </div>
              </div>
            ))}
         </div>
      </div>

      {/* 4. FOOTER STATUS BAR */}
      <div className="pt-6 border-t border-[var(--rd-border)] flex-row justify-between text-[12px] text-[var(--rd-text-secondary)]">
         <div className="flex-row gap-3">
            <User size={14} />
            <span>5 个设备</span>
         </div>
         <div className="flex-row gap-4 opacity-50">
            <span className="hover:text-[var(--rd-text-primary)] cursor-pointer">修改分组</span>
            <span className="hover:text-[var(--rd-text-primary)] cursor-pointer">删除选中</span>
         </div>
      </div>
    </div>
  );
}
