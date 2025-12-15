import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  LogOut, 
  Menu,
  ArrowRightLeft,
  X,
  FileSpreadsheet,
  ClipboardCheck,
  FileText,
  Settings,
  Mail,
  ChevronDown,
  ChevronRight,
  Book
} from 'lucide-react';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout } = useAuth();
  const [openSubmenus, setOpenSubmenus] = useState({
      transaksi: true,
      laporan: true
  });
  
  const toggleSubmenu = (key) => {
      setOpenSubmenus(prev => ({...prev, [key]: !prev[key]}));
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 border-r border-slate-800 flex flex-col`}>
      <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
        <h1 className="text-xl font-bold tracking-tight font-display text-white">SIMAN-G</h1>
        <button className="md:hidden ml-auto" onClick={toggleSidebar}>
          <X size={20} />
        </button>
      </div>
        
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white border-l-4 border-amber-600' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>

          {/* Master Barang */}
          <NavLink to="/barang" className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white border-l-4 border-amber-600' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Package size={18} /> Master Barang
          </NavLink>

          {/* Referensi Kode (NEW) */}
          <NavLink to="/referensi" className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white border-l-4 border-amber-600' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Book size={18} /> Referensi Kode
          </NavLink>

          {/* Transaksi Group */}
          <Collapsible open={openSubmenus.transaksi} onOpenChange={() => toggleSubmenu('transaksi')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md">
                  <div className="flex items-center gap-3">
                      <ArrowRightLeft size={18} /> Transaksi
                  </div>
                  {openSubmenus.transaksi ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-1 mt-1">
                  <NavLink to="/transaksi/masuk" className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-md text-xs font-medium ${isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>
                      Barang Masuk
                  </NavLink>
                  <NavLink to="/transaksi/keluar" className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-md text-xs font-medium ${isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>
                      Barang Keluar
                  </NavLink>
                  <NavLink to="/transaksi/riwayat" className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-md text-xs font-medium ${isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>
                      Riwayat Transaksi
                  </NavLink>
              </CollapsibleContent>
          </Collapsible>

          {/* Stock Opname */}
          <NavLink to="/opname" className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white border-l-4 border-amber-600' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <ClipboardCheck size={18} /> Stock Opname
          </NavLink>

          {/* Laporan Group */}
          <Collapsible open={openSubmenus.laporan} onOpenChange={() => toggleSubmenu('laporan')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md">
                  <div className="flex items-center gap-3">
                      <FileText size={18} /> Laporan
                  </div>
                  {openSubmenus.laporan ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-1 mt-1">
                  <NavLink to="/laporan/bmn" className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-md text-xs font-medium ${isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>
                      Laporan Inti (BMN)
                  </NavLink>
                  <NavLink to="/laporan/posisi" className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-md text-xs font-medium ${isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>
                      Posisi Stok
                  </NavLink>
                  <NavLink to="/laporan/mutasi" className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-md text-xs font-medium ${isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>
                      Mutasi Barang
                  </NavLink>
                  <NavLink to="/laporan/kartu" className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-md text-xs font-medium ${isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>
                      Kartu Gudang
          {/* Manajemen Persuratan */}
          <NavLink to="/surat" className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white border-l-4 border-amber-600' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Mail size={18} /> Manajemen Persuratan
          </NavLink>
                  </NavLink>
              </CollapsibleContent>
          </Collapsible>
          
          {/* Manajemen Pegawai */}
          <NavLink to="/pegawai" className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white border-l-4 border-amber-600' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Users size={18} /> Data Pegawai
          </NavLink>

          {/* Pengaturan */}
          <NavLink to="/pengaturan" className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white border-l-4 border-amber-600' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <Settings size={18} /> Pengaturan
          </NavLink>
          
           {/* Banding Data */}
          <NavLink to="/banding" className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white border-l-4 border-amber-600' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <FileSpreadsheet size={18} /> Banding Data
          </NavLink>

      </nav>

      <div className="p-4 border-t border-slate-800 mt-auto">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/20"
          onClick={logout}
        >
          <LogOut size={18} className="mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={toggleSidebar}
        />
      )}
      
      {/* Main content */}
      <div className="md:ml-64">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center">
            <button 
              className="md:hidden mr-4"
              onClick={toggleSidebar}
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-semibold text-slate-900">SIMAN-G Dashboard</h2>
          </div>
        </header>
        
        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
