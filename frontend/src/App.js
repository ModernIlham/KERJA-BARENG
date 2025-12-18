import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BarangList from './pages/BarangList';
import PegawaiList from './pages/PegawaiList';
import BandingData from './pages/BandingData';
import StockOpname from './pages/StockOpname';
import Laporan from './pages/Laporan';
import Pengaturan from './pages/Pengaturan';
import ReferensiKode from './pages/ReferensiKode';
import TransaksiAset from './pages/TransaksiAset';
import TransaksiPersediaan from './pages/TransaksiPersediaan';
import Surat from './pages/Surat';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Wrapper for Params
const TransaksiPersediaanWrapper = () => {
    const { type } = useParams();
    return <TransaksiPersediaan activeTab={type || 'riwayat'} />;
};

export default function App() {
  return (
import DokumenList from './pages/DokumenList';
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            
            {/* Master Data */}
            <Route path="barang" element={<BarangList />} />
            <Route path="pegawai" element={<PegawaiList />} />
            <Route path="referensi" element={<ReferensiKode />} />
            <Route path="referensi/dokumen" element={<DokumenList />} />
            
            {/* New Simplified Transaction Routes */}
            <Route path="transaksi-aset" element={<TransaksiAset />} />
            <Route path="transaksi-persediaan" element={<Navigate to="/transaksi-persediaan/riwayat" replace />} />
            <Route path="transaksi-persediaan/:type" element={<TransaksiPersediaanWrapper />} />
            
            <Route path="opname" element={<StockOpname />} />
            
            <Route path="laporan" element={<Navigate to="/laporan/bmn" replace />} />
            <Route path="surat" element={<Surat />} />
            <Route path="laporan/:type" element={<Laporan />} />
            
            <Route path="banding" element={<BandingData />} />
            <Route path="pengaturan" element={<Pengaturan />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
