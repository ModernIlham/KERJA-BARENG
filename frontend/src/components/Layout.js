import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Package, Users, LogOut, Menu, X, FileSpreadsheet, FileText, 
  Settings, Mail, ChevronDown, ChevronRight, Book, Box, Building, Network, 
  Clock, Briefcase, FileCheck, ClipboardList, ArrowRightLeft, ChevronsLeft, ChevronsRight
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
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
            {label}
        </div>
    )}
  </NavLink>
);

// Helper for Sidebar Groups (Collapsible)
const SidebarGroup = ({ icon: Icon, label, children, activePaths = [], collapsed = false }) => {
    const location = useLocation();
    const isOpenDefault = activePaths.some(path => location.pathname.startsWith(path));
    const [isOpen, setIsOpen] = useState(isOpenDefault);

    if (collapsed) {
        return (
            <div className="space-y-1">
                 <div className="flex justify-center p-2 text-slate-400 hover:bg-slate-800/50 rounded-md cursor-pointer group relative">
                    <Icon size={20} />
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                        {label} (Expand to view items)
                    </div>
                 </div>
            </div>
        )
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

  return (
    <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-slate-950 text-slate-100 transition-all duration-300 ease-in-out border-r border-slate-800 flex flex-col shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        collapsed ? "w-20" : "w-64"
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
        
      <ScrollArea className="flex-1 py-6 px-3">
          <div className="space-y-6">
            {/* Main */}
            <div className="space-y-1">
                <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard Utama" end collapsed={collapsed} />
            </div>

            {/* Kepegawaian (HR) */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Kepegawaian
                    </div>
                )}
                <SidebarItem to="/kepegawaian" icon={Briefcase} label="Dashboard HR" end collapsed={collapsed} />
                <SidebarItem to="/kepegawaian/lembur" icon={Clock} label="Manajemen Lembur" collapsed={collapsed} />
                <SidebarItem to="/pegawai" icon={Users} label="Data Pegawai" collapsed={collapsed} />
                <SidebarItem to="/kepegawaian/tugas" icon={ClipboardList} label="Tugas Tim" collapsed={collapsed} />
            </div>

                <SidebarItem to="/kepegawaian/absensi" icon={Calendar} label="Riwayat Absensi" collapsed={collapsed} />
            {/* Aset & Inventaris */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Aset & Logistik
                    </div>
                )}
                
                <SidebarGroup icon={Package} label="Aset Tetap (BMN)" activePaths={['/barang', '/transaksi-aset', '/opname']} collapsed={collapsed}>
                    <SidebarItem to="/barang?tab=aset-tetap" icon={ClipboardList} label="Daftar Aset" />
                    <SidebarItem to="/transaksi-aset" icon={ArrowRightLeft} label="Transaksi Aset" />
                    <SidebarItem to="/opname" icon={FileCheck} label="Stock Opname" />
                </SidebarGroup>

                <SidebarGroup icon={Box} label="Persediaan (Gudang)" activePaths={['/barang', '/transaksi-persediaan']} collapsed={collapsed}>
                    <SidebarItem to="/barang?tab=persediaan" icon={ClipboardList} label="Daftar Barang" />
                    <SidebarItem to="/transaksi-persediaan/masuk" icon={ArrowRightLeft} label="Barang Masuk" />
                    <SidebarItem to="/transaksi-persediaan/keluar" icon={ArrowRightLeft} label="Barang Keluar" />
                    <SidebarItem to="/transaksi-persediaan/riwayat" icon={FileText} label="Riwayat Transaksi" />
                </SidebarGroup>
            </div>

            {/* Administrasi */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Administrasi
                    </div>
                )}
                <SidebarItem to="/surat" icon={Mail} label="Persuratan" collapsed={collapsed} />
                <SidebarItem to="/referensi/dokumen" icon={FileSpreadsheet} label="Dokumen Sumber" collapsed={collapsed} />
                
                <SidebarGroup icon={FileText} label="Laporan" activePaths={['/laporan']} collapsed={collapsed}>
                    <SidebarItem to="/laporan/bmn" icon={FileText} label="Laporan Inti" />
                    <SidebarItem to="/laporan/posisi" icon={FileText} label="Posisi Stok" />
                    <SidebarItem to="/laporan/mutasi" icon={FileText} label="Mutasi Barang" />
                    <SidebarItem to="/laporan/kartu" icon={FileText} label="Kartu Gudang" />
                </SidebarGroup>
            </div>

            {/* Pengaturan */}
            <div className="space-y-1">
                {!collapsed && (
                    <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Sistem
                    </div>
                )}
                <SidebarItem to="/organisasi" icon={Network} label="Struktur Organisasi" collapsed={collapsed} />
                <SidebarItem to="/referensi" icon={Book} label="Referensi Kode" end collapsed={collapsed} />
                <SidebarItem to="/banding" icon={ArrowRightLeft} label="Banding Data" collapsed={collapsed} />
                <SidebarItem to="/pengaturan" icon={Settings} label="Pengaturan" collapsed={collapsed} />
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
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleCollapse = () => setCollapsed(!collapsed);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} collapsed={collapsed} toggleCollapse={toggleCollapse} />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={toggleSidebar}
        />
      )}
      
      {/* Main content */}
      <div className={cn("min-h-screen flex flex-col transition-all duration-300", collapsed ? "md:ml-20" : "md:ml-64")}>
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-30 shadow-sm">
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
