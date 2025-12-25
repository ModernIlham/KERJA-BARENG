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
import LaporanInti from './pages/LaporanInti';
import LaporanRingkas from './pages/LaporanRingkas';
import Pengaturan from './pages/Pengaturan';
import ReferensiKode from './pages/ReferensiKode';
import TransaksiAset from './pages/TransaksiAset';
import TransaksiPersediaan from './pages/TransaksiPersediaan';
import Surat from './pages/Surat';
import DokumenList from './pages/DokumenList';
import StrukturOrganisasi from './pages/StrukturOrganisasi';
import AsetPegawaiList from './pages/AsetPegawaiList';
import GudangList from './pages/GudangList';
import NotificationList from './pages/NotificationList';
import ApprovalPage from './components/transaksi/ApprovalPage';
import PengamananBMN from './pages/PengamananBMN';
import LabelBMN from './pages/LabelBMN';

import DashboardKepegawaian from './modules/kepegawaian/pages/DashboardKepegawaian';
import ManajemenLembur from './modules/kepegawaian/pages/ManajemenLembur';
import ManajemenTugas from './modules/kepegawaian/pages/ManajemenTugas';
import RiwayatAbsensi from './modules/kepegawaian/pages/RiwayatAbsensi';
import ActivityLogPage from './pages/activity/ActivityLogPage';
import UserActivityReport from './pages/activity/UserActivityReport';
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
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
            {/* New Workforce Management Module */}
            <Route path="kepegawaian" element={<DashboardKepegawaian />} />
            <Route path="kepegawaian/tugas" element={<ManajemenTugas />} />
            <Route path="kepegawaian/absensi" element={<RiwayatAbsensi />} />
            <Route path="kepegawaian/lembur" element={<ManajemenLembur />} />
            
            <Route path="organisasi" element={<StrukturOrganisasi />} />
            <Route path="aset-pegawai" element={<AsetPegawaiList />} />
            <Route path="gudang" element={<GudangList />} />
            <Route path="notifikasi" element={<NotificationList />} />
            <Route path="persetujuan" element={<ApprovalPage />} />
            
            {/* New Simplified Transaction Routes */}
            <Route path="transaksi-aset" element={<TransaksiAset />} />
            <Route path="transaksi-persediaan" element={<TransaksiPersediaan />} />
            
            <Route path="opname" element={<StockOpname />} />
            <Route path="pengamanan-bmn" element={<PengamananBMN />} />
            <Route path="label-bmn" element={<LabelBMN />} />
            
            <Route path="laporan" element={<Navigate to="/laporan/inti" replace />} />
            <Route path="laporan/inti" element={<LaporanInti />} />
            <Route path="laporan/ringkas" element={<LaporanRingkas />} />
            <Route path="laporan/bmn" element={<LaporanRingkas />} />
            <Route path="surat" element={<Surat />} />
            <Route path="laporan/:type" element={<Laporan />} />
            
            <Route path="banding" element={<BandingData />} />
            <Route path="pengaturan" element={<Pengaturan />} />
            <Route path="aktivitas" element={<ActivityLogPage />} />
            <Route path="aktivitas/user/:userId" element={<UserActivityReport />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
