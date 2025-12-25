import React, { useState, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Package, Users, LogOut, Menu, X, FileSpreadsheet, FileText, 
  Settings, Mail, ChevronDown, ChevronRight, Book, Box, Building, Network, 
  Clock, Briefcase, FileCheck, ClipboardList, ArrowRightLeft, ChevronsLeft, ChevronsRight,
  Calendar, Activity, Warehouse, Bell, CheckCircle2, ArrowDownToLine, ArrowUpFromLine,
  History, Database, Shield, Scale, FolderOpen, RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '../lib/utils';
import { ScrollArea } from './ui/scroll-area';

// Helper Component for Sidebar Links
const SidebarItem = ({ to, icon: Icon, label, end = false, collapsed = false }) => (
  <NavLink 
    to={to} 
    end={end}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group relative",
      isActive 
        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" 
        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100",
      collapsed && "justify-center px-2"
    )}
  >
    <Icon size={18} strokeWidth={2} className={cn("shrink-0", collapsed ? "w-6 h-6" : "w-[18px] h-[18px]")} />
    {!collapsed && <span>{label}</span>}
    {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none transition-opacity duration-200">
            {label}
        </div>
    )}
  </NavLink>
);

// Popup Menu for Collapsed Sidebar Groups
const PopupMenu = ({ isOpen, position, children, onMouseEnter, onMouseLeave }) => {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed z-[100] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-2 min-w-[200px] animate-in fade-in slide-in-from-left-2 duration-200"
      style={{ left: position.x, top: position.y }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

// Popup Menu Item
const PopupMenuItem = ({ to, icon: Icon, label }) => (
  <NavLink 
    to={to}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-all duration-150",
      isActive 
        ? "bg-blue-600 text-white" 
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    )}
  >
    <Icon size={16} />
    <span>{label}</span>
  </NavLink>
);

// Helper for Sidebar Groups (Collapsible) with Popup on Collapsed State
const SidebarGroup = ({ icon: Icon, label, children, activePaths = [], collapsed = false, items = [] }) => {
    const location = useLocation();
    const isOpenDefault = activePaths.some(path => location.pathname.startsWith(path));
    const [isOpen, setIsOpen] = useState(isOpenDefault);
    const [showPopup, setShowPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const triggerRef = useRef(null);
    const timeoutRef = useRef(null);

    const handleMouseEnter = () => {
      if (collapsed && triggerRef.current) {
        clearTimeout(timeoutRef.current);
        const rect = triggerRef.current.getBoundingClientRect();
        setPopupPosition({ x: rect.right + 8, y: rect.top });
        setShowPopup(true);
      }
    };

    const handleMouseLeave = () => {
      if (collapsed) {
        timeoutRef.current = setTimeout(() => {
          setShowPopup(false);
        }, 150);
      }
    };

    const keepPopupOpen = () => {
      clearTimeout(timeoutRef.current);
    };

    const closePopup = () => {
      timeoutRef.current = setTimeout(() => {
        setShowPopup(false);
      }, 150);
    };

    if (collapsed) {
        return (
            <>
                <div 
                    ref={triggerRef}
                    className="flex justify-center p-2 text-slate-400 hover:bg-slate-800/50 rounded-md cursor-pointer group relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <Icon size={20} />
                    {!showPopup && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none transition-opacity">
                          {label}
                      </div>
                    )}
                </div>
                <PopupMenu 
                    isOpen={showPopup} 
                    position={popupPosition}
                    onMouseEnter={keepPopupOpen}
                    onMouseLeave={closePopup}
                >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 mb-1">
                        {label}
                    </div>
                    {items.map((item, idx) => (
                        <PopupMenuItem key={idx} to={item.to} icon={item.icon} label={item.label} />
                    ))}
                </PopupMenu>
            </>
        );
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1">
            <CollapsibleTrigger className={cn(
                "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isOpen ? "text-slate-200 bg-slate-800/30" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
            )}>
                <div className="flex items-center gap-3">
                    <Icon size={18} strokeWidth={2} />
                    <span>{label}</span>
                </div>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-9 space-y-1 pt-1 animate-in slide-in-from-top-2 fade-in duration-200">
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
};

const Sidebar = ({ isOpen, toggleSidebar, collapsed, toggleCollapse }) => {
  const { logout } = useAuth();

  // Define menu items for groups to pass to popup
  const kepegawaianItems = [
    { to: '/kepegawaian', icon: Briefcase, label: 'Dashboard HR' },
    { to: '/pegawai', icon: Users, label: 'Data Pegawai' },
    { to: '/kepegawaian/lembur', icon: Clock, label: 'Manajemen Lembur' },
    { to: '/kepegawaian/tugas', icon: ClipboardList, label: 'Tugas Tim' },
    { to: '/kepegawaian/absensi', icon: Calendar, label: 'Riwayat Absensi' },
  ];

  const transaksiAsetItems = [
    { to: '/transaksi-aset', icon: ArrowRightLeft, label: 'Semua Transaksi' },
    { to: '/aset-pegawai', icon: Package, label: 'Aset Pegawai' },
    { to: '/notifikasi', icon: Bell, label: 'Notifikasi Aset' },
  ];

  const transaksiPersediaanItems = [
    { to: '/transaksi-persediaan?tab=masuk', icon: ArrowDownToLine, label: 'Barang Masuk' },
    { to: '/transaksi-persediaan?tab=keluar', icon: ArrowUpFromLine, label: 'Barang Keluar' },
    { to: '/transaksi-persediaan?tab=riwayat', icon: History, label: 'Riwayat Transaksi' },
    { to: '/gudang', icon: Warehouse, label: 'Manajemen Gudang' },
  ];

  const pengamananItems = [
    { to: '/pengamanan-bmn', icon: Shield, label: 'Dashboard Pengamanan' },
    { to: '/opname', icon: FileCheck, label: 'Stock Opname' },
  ];

  const laporanItems = [
    { to: '/laporan/inti', icon: FileText, label: 'Laporan Inti' },
    { to: '/laporan/ringkas', icon: FileText, label: 'Laporan Ringkas (1 Hal.)' },
    { to: '/laporan/posisi', icon: FileText, label: 'Posisi Stok' },
    { to: '/laporan/mutasi', icon: FileText, label: 'Mutasi Barang' },
    { to: '/laporan/kartu', icon: FileText, label: 'Kartu Gudang' },
  ];

  const sistemItems = [
    { to: '/organisasi', icon: Network, label: 'Struktur Organisasi' },
    { to: '/referensi', icon: Book, label: 'Referensi Kode' },
    { to: '/banding', icon: ArrowRightLeft, label: 'Banding Data' },
    { to: '/aktivitas', icon: Activity, label: 'Log Aktivitas' },
    { to: '/pengaturan', icon: Settings, label: 'Pengaturan' },
  ];

  return (
    <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-slate-950 text-slate-100 transition-all duration-300 ease-in-out border-r border-slate-800 flex flex-col shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        collapsed ? "w-[70px]" : "w-64"
    )}>
      {/* Header */}
      <div className={cn("h-16 flex items-center border-b border-slate-800/50 shrink-0 bg-slate-950 transition-all", collapsed ? "justify-center px-0" : "px-6")}>
        <div className="flex items-center gap-2 text-white">
            <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
                <Building size={20} className="text-white" />
            </div>
            {!collapsed && <h1 className="text-lg font-bold tracking-tight font-display">SIMAN-G</h1>}
        </div>
        <button className="md:hidden ml-auto text-slate-400 hover:text-white" onClick={toggleSidebar}>
          <X size={20} />
        </button>
      </div>
        
      <ScrollArea className="flex-1 py-4 px-3">
          <div className="space-y-5">
            {/* ==================== BERANDA ==================== */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Beranda
                    </div>
                )}
                <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard Utama" end collapsed={collapsed} />
            </div>

            {/* ==================== KEPEGAWAIAN ==================== */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Kepegawaian
                    </div>
                )}
                <SidebarGroup 
                    icon={Briefcase} 
                    label="Manajemen SDM" 
                    activePaths={['/kepegawaian', '/pegawai']} 
                    collapsed={collapsed}
                    items={kepegawaianItems}
                >
                    <SidebarItem to="/kepegawaian" icon={Briefcase} label="Dashboard HR" end />
                    <SidebarItem to="/pegawai" icon={Users} label="Data Pegawai" />
                    <SidebarItem to="/kepegawaian/lembur" icon={Clock} label="Manajemen Lembur" />
                    <SidebarItem to="/kepegawaian/tugas" icon={ClipboardList} label="Tugas Tim" />
                    <SidebarItem to="/kepegawaian/absensi" icon={Calendar} label="Riwayat Absensi" />
                </SidebarGroup>
            </div>

            {/* ==================== MASTER DATA ==================== */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Master Data
                    </div>
                )}
                <SidebarItem to="/barang?tab=aset-tetap" icon={Database} label="Daftar Aset (BMN)" collapsed={collapsed} />
                <SidebarItem to="/barang?tab=persediaan" icon={FolderOpen} label="Daftar Persediaan" collapsed={collapsed} />
            </div>

            {/* ==================== TRANSAKSI ASET ==================== */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Transaksi Aset
                    </div>
                )}
                
                <SidebarGroup 
                    icon={Package} 
                    label="Kelola Transaksi Aset" 
                    activePaths={['/transaksi-aset', '/aset-pegawai', '/notifikasi']} 
                    collapsed={collapsed}
                    items={transaksiAsetItems}
                >
                    <SidebarItem to="/transaksi-aset" icon={ArrowRightLeft} label="Semua Transaksi" />
                    <SidebarItem to="/aset-pegawai" icon={Package} label="Aset Pegawai" />
                    <SidebarItem to="/notifikasi" icon={Bell} label="Notifikasi Aset" />
                </SidebarGroup>
            </div>

            {/* ==================== TRANSAKSI PERSEDIAAN ==================== */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Transaksi Persediaan
                    </div>
                )}
                
                <SidebarGroup 
                    icon={Box} 
                    label="Kelola Transaksi Gudang" 
                    activePaths={['/transaksi-persediaan', '/gudang']} 
                    collapsed={collapsed}
                    items={transaksiPersediaanItems}
                >
                    <SidebarItem to="/transaksi-persediaan?tab=masuk" icon={ArrowDownToLine} label="Barang Masuk" />
                    <SidebarItem to="/transaksi-persediaan?tab=keluar" icon={ArrowUpFromLine} label="Barang Keluar" />
                    <SidebarItem to="/transaksi-persediaan?tab=riwayat" icon={History} label="Riwayat Transaksi" />
                    <SidebarItem to="/gudang" icon={Warehouse} label="Manajemen Gudang" />
                </SidebarGroup>
            </div>

            {/* ==================== PENGAMANAN BMN ==================== */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Pengamanan BMN
                    </div>
                )}
                
                <SidebarGroup 
                    icon={Shield} 
                    label="Tertib & Pengamanan" 
                    activePaths={['/pengamanan-bmn', '/opname']} 
                    collapsed={collapsed}
                    items={pengamananItems}
                >
                    <SidebarItem to="/pengamanan-bmn" icon={Shield} label="Dashboard Pengamanan" />
                    <SidebarItem to="/opname" icon={FileCheck} label="Stock Opname" />
                </SidebarGroup>
            </div>

            {/* ==================== ADMINISTRASI ==================== */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Administrasi
                    </div>
                )}
                <SidebarItem to="/persetujuan" icon={CheckCircle2} label="Persetujuan Transaksi" collapsed={collapsed} />
                <SidebarItem to="/surat" icon={Mail} label="Persuratan" collapsed={collapsed} />
                <SidebarItem to="/referensi/dokumen" icon={FileSpreadsheet} label="Dokumen Sumber" collapsed={collapsed} />
                
                <SidebarGroup 
                    icon={FileText} 
                    label="Laporan" 
                    activePaths={['/laporan']} 
                    collapsed={collapsed}
                    items={laporanItems}
                >
                    <SidebarItem to="/laporan/inti" icon={FileText} label="Laporan Inti" />
                    <SidebarItem to="/laporan/ringkas" icon={FileText} label="Laporan Ringkas (1 Hal.)" />
                    <SidebarItem to="/laporan/posisi" icon={FileText} label="Posisi Stok" />
                    <SidebarItem to="/laporan/mutasi" icon={FileText} label="Mutasi Barang" />
                    <SidebarItem to="/laporan/kartu" icon={FileText} label="Kartu Gudang" />
                </SidebarGroup>
            </div>

            {/* ==================== SISTEM ==================== */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Sistem
                    </div>
                )}
                <SidebarGroup 
                    icon={Settings} 
                    label="Pengaturan Sistem" 
                    activePaths={['/organisasi', '/referensi', '/banding', '/aktivitas', '/pengaturan']} 
                    collapsed={collapsed}
                    items={sistemItems}
                >
                    <SidebarItem to="/organisasi" icon={Network} label="Struktur Organisasi" />
                    <SidebarItem to="/referensi" icon={Book} label="Referensi Kode" end />
                    <SidebarItem to="/banding" icon={ArrowRightLeft} label="Banding Data" />
                    <SidebarItem to="/aktivitas" icon={Activity} label="Log Aktivitas" />
                    <SidebarItem to="/pengaturan" icon={Settings} label="Pengaturan" />
                </SidebarGroup>
            </div>
          </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-800/50 mt-auto bg-slate-950 space-y-2">
        <Button 
            variant="ghost" 
            className={cn("w-full text-slate-400 hover:text-white hover:bg-slate-800", collapsed && "justify-center px-0")}
            onClick={toggleCollapse}
        >
            {collapsed ? <ChevronsRight size={18} /> : <div className="flex items-center gap-2"><ChevronsLeft size={18}/> <span>Collapse</span></div>}
        </Button>
        <Button 
          variant="ghost" 
          className={cn("w-full text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors", collapsed ? "justify-center px-0" : "justify-start")}
          onClick={logout}
        >
          <LogOut size={18} className={cn("shrink-0", !collapsed && "mr-2")} />
          {!collapsed && "Keluar Aplikasi"}
        </Button>
      </div>
    </aside>
  );
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans print:bg-white print:min-h-0">
      {/* Sidebar - hidden during print */}
      <div className="print:hidden">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} collapsed={collapsed} toggleCollapse={toggleCollapse} />
      </div>
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden transition-opacity print:hidden" 
          onClick={toggleSidebar}
        />
      )}
      
      {/* Main content */}
      <div className={cn("min-h-screen flex flex-col transition-all duration-300 print:min-h-0 print:ml-0", collapsed ? "md:ml-[70px]" : "md:ml-64")}>
        {/* Top bar - hidden during print */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-30 shadow-sm print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
                <button 
                className="md:hidden mr-4 text-slate-500 hover:text-slate-700"
                onClick={toggleSidebar}
                >
                <Menu size={24} />
                </button>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide truncate">
                    Sistem Informasi Manajemen Aset Negara & Kepegawaian
                </h2>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                    A
                </div>
                <div className="hidden md:block text-xs text-right">
                    <p className="font-semibold text-slate-800">Admin System</p>
                    <p className="text-slate-500">Administrator</p>
                </div>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="p-6 flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
