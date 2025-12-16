import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2, Plus, Trash, User, Building, Database, RefreshCw, AlertTriangle, Eraser, Download, PackageX } from 'lucide-react';
import { toast } from 'sonner';

import DeleteTransactionDialog from '../components/DeleteTransactionDialog';
import UnitKerjaManager from '../components/pegawai/UnitKerjaManager';
import InstansiSettings from '../components/pegawai/InstansiSettings';
import DeleteMasterDataDialog from '../components/DeleteMasterDataDialog';
export default function Pengaturan() {
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  
  const [config, setConfig] = useState(null);
  const { register: registerUnit, handleSubmit: handleUnitSubmit, reset: resetUnit } = useForm();
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const [uRes, unitRes, configRes] = await Promise.all([
            api.get('/api/settings/users'),
            api.get('/api/settings/unit-kerja'),
            api.get('/api/settings/config')
        ]);
        setUsers(uRes.data);
        setUnits(unitRes.data);
        setConfig(configRes.data);
    } catch (e) {
        toast.error("Gagal memuat pengaturan");
    } finally {
        setLoading(false);
    }
  };

  const onAddUnit = async (data) => {
      try {
          await api.post('/api/settings/unit-kerja', data);
          toast.success("Unit Kerja ditambahkan");
          resetUnit();
          fetchData();
      } catch (e) {
          toast.error("Gagal menyimpan unit kerja");
      }
  };
  
  const onDeleteUnit = async (id) => {
      if(!window.confirm("Hapus unit kerja ini?")) return;
      try {
          await api.delete(`/api/settings/unit-kerja/${id}`);
          toast.success("Unit Kerja dihapus");
          fetchData();
      } catch (e) {
          toast.error("Gagal menghapus unit kerja");
      }
  };

  const updateConfig = async () => {
      try {
          const limit = parseInt(config.monthly_upload_limit);
          if (isNaN(limit) || limit < 0) return toast.error("Limit harus angka positif");
          
          await api.put('/api/settings/config', { monthly_upload_limit: limit });
          toast.success("Konfigurasi disimpan");
      } catch (e) {
          toast.error("Gagal update konfigurasi");
      }
  };

  // --- Database Maintenance Functions ---
  
  const runNormalize = async () => {
      if(!window.confirm("Proses ini akan memperbaiki format data (angka, kode) di database. Lanjutkan?")) return;
      setMaintenanceLoading(true);
      try {
          const res = await api.post('/api/settings/database/normalize');
          toast.success(res.data.message);
      } catch (e) {
          toast.error("Gagal normalisasi data");
      } finally {
          setMaintenanceLoading(false);
      }
  };

  const runRecalculate = async () => {
      if(!window.confirm("Stok Barang akan dihitung ulang berdasarkan riwayat transaksi. Stok saat ini mungkin berubah. Lanjutkan?")) return;
      setMaintenanceLoading(true);
      try {
          const res = await api.post('/api/settings/database/recalculate-stock');
          toast.success(res.data.message);
      } catch (e) {
          toast.error("Gagal hitung ulang stok");
      } finally {
          setMaintenanceLoading(false);
      }
  };

  const runReset = async (target, assetType = 'all', txnType = 'all') => {
      let confirmMsg = `Yakin ingin menghapus semua data ${target.toUpperCase()}? Data tidak bisa dikembalikan.`;
      
      if (target === 'transaksi') {
          // Custom confirmation handled by dialog, but safe check here too
          // Pass params
      } else if (target === 'all') {
          confirmMsg = "PERINGATAN KERAS: SEMUA DATA (Barang, Transaksi, Pegawai) akan DIHAPUS PERMANEN. Ketik 'SETUJU' untuk melanjutkan.";
          const check = window.prompt(confirmMsg);
          if (check !== 'SETUJU') return;
      } else if (target === 'barang') {
          confirmMsg = "Yakin HAPUS SEMUA MASTER BARANG? Ini akan menghapus seluruh data aset yang terdaftar. Data transaksi mungkin menjadi yatim (orphan).";
          if(!window.confirm(confirmMsg)) return;
      } else {
          if(!window.confirm(confirmMsg)) return;
      }

      setMaintenanceLoading(true);
      try {
          // Pass asset_type and txn_type as query params
          const res = await api.post('/api/settings/database/reset', null, { 
              params: { target, asset_type: assetType, txn_type: txnType }
          });
          toast.success(res.data.message);
      } catch (e) {
          toast.error("Gagal reset data");
      } finally {
          setMaintenanceLoading(false);
      }
  };

  const downloadBackup = async () => {
      setMaintenanceLoading(true);
      try {
          const response = await api.get('/api/settings/database/backup', { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `backup_siman_${new Date().toISOString().slice(0,10)}.json`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success("Backup berhasil diunduh");
      } catch (e) {
          toast.error("Gagal download backup");
      } finally {
          setMaintenanceLoading(false);
      }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Sistem</h1>
        
        <Tabs defaultValue="db">
            <TabsList className="bg-slate-100">
                <TabsTrigger value="instansi"><Building size={14} className="mr-2"/> Profil Instansi</TabsTrigger>
                <TabsTrigger value="db"><Database size={14} className="mr-2"/> Database & Data</TabsTrigger>
                <TabsTrigger value="users"><User size={14} className="mr-2"/> Manajemen User</TabsTrigger>
                <TabsTrigger value="unit"><Building size={14} className="mr-2"/> Unit Kerja</TabsTrigger>
            </TabsList>
            
            <TabsContent value="instansi" className="mt-4">
                <InstansiSettings />
            </TabsContent>
            
            <TabsContent value="db" className="mt-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-green-200 bg-green-50">
                        <CardHeader>
                            <CardTitle className="text-green-800 flex items-center">Konfigurasi Sistem</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Batas Upload Foto per Bulan</label>
                                <div className="flex gap-2 mt-1">
                                    <Input 
                                        type="number" 
                                        className="bg-white max-w-[200px]" 
                                        value={config?.monthly_upload_limit || 500} 
                                        onChange={(e) => setConfig({...config, monthly_upload_limit: e.target.value})}
                                    />
                                    <Button onClick={updateConfig} className="bg-green-600 hover:bg-green-700">Simpan</Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Terpakai bulan ini ({config?.current_month}): <strong>{config?.current_month_count || 0}</strong> / {config?.monthly_upload_limit || 500}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                            <CardTitle className="text-blue-800 flex items-center"><RefreshCw size={18} className="mr-2"/> Pemeliharaan Data</CardTitle>
                            <CardDescription className="text-blue-600">Alat bantu untuk memperbaiki inkonsistensi data.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button 
                                variant="outline" 
                                className="w-full justify-start bg-white hover:bg-blue-100 border-blue-200"
                                onClick={runNormalize}
                                disabled={maintenanceLoading}
                            >
                                <RefreshCw size={16} className="mr-2 text-blue-600"/> 
                                <div>
                                    <div className="text-sm font-semibold text-slate-700">Normalisasi Format Data</div>
                                    <div className="text-xs text-slate-500">Perbaiki format angka (Rp) & kode barang di database</div>
                                </div>
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                className="w-full justify-start bg-white hover:bg-blue-100 border-blue-200"
                                onClick={runRecalculate}
                                disabled={maintenanceLoading}
                            >
                                <Database size={16} className="mr-2 text-blue-600"/> 
                                <div>
                                    <div className="text-sm font-semibold text-slate-700">Hitung Ulang Stok</div>
                                    <div className="text-xs text-slate-500">Sinkronisasi stok Master Barang vs Riwayat Transaksi</div>
                                </div>
                            </Button>

                            <Button 
                                variant="outline" 
                                className="w-full justify-start bg-white hover:bg-blue-100 border-blue-200"
                                onClick={downloadBackup}
                                disabled={maintenanceLoading}
                            >
                                <Download size={16} className="mr-2 text-blue-600"/> 
                                <div>
                                    <div className="text-sm font-semibold text-slate-700">Backup Data (JSON)</div>
                                    <div className="text-xs text-slate-500">Download seluruh data database</div>
                                </div>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50">
                        <CardHeader>
                            <CardTitle className="text-red-800 flex items-center"><AlertTriangle size={18} className="mr-2"/> Zona Bahaya (Reset Data)</CardTitle>
                            <CardDescription className="text-red-600">Menghapus data secara permanen. Berhati-hatilah.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <DeleteTransactionDialog 
                                onConfirm={runReset} 
                                loading={maintenanceLoading} 
                            />
                            <Button 
                                variant="outline" 
                                className="w-full justify-start bg-white hover:bg-red-100 border-red-200 text-red-700"
                                onClick={() => runReset('referensi')}
                                disabled={maintenanceLoading}
                            >
                                <Eraser size={16} className="mr-2"/> 
                                Hapus Referensi Kode
                            </Button>
                            
                            <DeleteMasterDataDialog 
                                onConfirm={runReset} 
                                loading={maintenanceLoading} 
                            />

                            <Button 
                                className="w-full bg-red-600 hover:bg-red-700 text-white mt-4"
                                onClick={() => runReset('all')}
                                disabled={maintenanceLoading}
                            >
                                <Trash size={16} className="mr-2"/> 
                                RESET TOTAL (Hapus Semua Data)
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
                {/* ... (Existing Users Content) ... */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daftar Pengguna</CardTitle>
                        <CardDescription>Kelola akses pengguna aplikasi</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Lengkap</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((u, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{u.full_name}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell><span className="bg-slate-100 px-2 py-1 rounded text-xs">{u.role}</span></TableCell>
                                        <TableCell><span className="text-green-600 text-xs font-bold">Aktif</span></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="unit" className="mt-4">
                <UnitKerjaManager />
            </TabsContent>
        </Tabs>
    </div>
  );
}
