import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  LogOut, 
  Menu,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { Button } from './ui/button';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout } = useAuth();
  
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/barang', icon: Package, label: 'Master Barang' },
    { to: '/pegawai', icon: Users, label: 'Data Pegawai' },
    { to: '/transaksi', icon: ArrowRightLeft, label: 'Riwayat Transaksi' },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 border-r border-slate-800`}>
      <div className="flex flex-col h-full">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight font-display text-white">SIMAN-G</h1>
          <button className="md:hidden ml-auto" onClick={toggleSidebar}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-slate-800 text-white border-l-4 border-amber-600 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
              `}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/20"
            onClick={logout}
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="md:ml-64 min-h-screen flex flex-col transition-all duration-300">
        <header className="h-16 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-md" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 hidden md:block">
              Sistem Manajemen Aset Negara
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium text-slate-900">{user?.email}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-500 slide-in-from-bottom-2">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
