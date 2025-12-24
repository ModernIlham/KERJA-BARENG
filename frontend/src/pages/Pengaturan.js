import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2, Plus, Trash, User, Building, Database, RefreshCw, AlertTriangle, Eraser, Download, PackageX, Users, Clock, CreditCard, Warehouse, Package } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import DeleteTransactionDialog from '../components/DeleteTransactionDialog';
import UnitKerjaManager from '../components/pegawai/UnitKerjaManager';
import InstansiSettings from '../components/pegawai/InstansiSettings';
import DeleteMasterDataDialog from '../components/DeleteMasterDataDialog';
import BankManager from '../components/pegawai/BankManager';
import FlexiTimeSettings from '../components/kepegawaian/FlexiTimeSettings';

// Kepegawaian Reset Dialog Component
const KepegawaianResetDialog = ({ type, onConfirm, loading }) => {
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const config = {
        overtime: {
            title: 'Reset Data Lembur',
            description: 'Hapus semua data pengajuan lembur, SPL batch, dan data absensi. Data tarif dan hari libur tidak akan dihapus.',
            buttonText: 'Reset Lembur',
            icon: Clock,
            color: 'text-orange-600',
            buttonClass: 'border-orange-400 text-orange-700 hover:bg-orange-100'
        },
        employees: {
            title: 'Reset Data Pegawai',
            description: 'Hapus semua data pegawai dari database. Perhatian: Ini akan menghapus semua pegawai yang terdaftar!',
            buttonText: 'Reset Pegawai',
            icon: Users,
            color: 'text-red-600',
            buttonClass: 'border-red-400 text-red-700 hover:bg-red-100'
        },
        all_kepegawaian: {
            title: 'Reset Semua Data Kepegawaian',
            description: 'Hapus SEMUA data kepegawaian termasuk pegawai, lembur, absensi, dan hari libur kustom. Hanya pengaturan tarif yang dipertahankan.',
            buttonText: 'Reset Kepegawaian',
            icon: Database,
            color: 'text-red-700',
            buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
        }
    };

    const cfg = config[type];
    const Icon = cfg.icon;

    const handleConfirm = async () => {
        if (confirmText !== 'CONFIRM') {
            toast.error('Ketik "CONFIRM" untuk melanjutkan');
            return;
        }
        await onConfirm(type);
        setOpen(false);
        setConfirmText('');
    };

    return (
        <>
            <Button
                variant={type === 'all_kepegawaian' ? 'default' : 'outline'}
                className={`w-full justify-start ${cfg.buttonClass}`}
                onClick={() => setOpen(true)}
                disabled={loading}
            >
                <Icon size={16} className="mr-2" />
                {cfg.buttonText}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 ${cfg.color}`}>
                            <AlertTriangle className="w-5 h-5" />
                            {cfg.title}
                        </DialogTitle>
                        <DialogDescription>{cfg.description}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-700 font-medium">Aksi ini tidak dapat dibatalkan!</p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Ketik <span className="font-bold text-red-600">CONFIRM</span> untuk melanjutkan:</Label>
                            <Input
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Ketik CONFIRM"
                                className="border-red-200"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => { setOpen(false); setConfirmText(''); }} disabled={loading}>
                            Batal
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={handleConfirm}
                            disabled={confirmText !== 'CONFIRM' || loading}
                        >
                            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menghapus...</> : <><Trash className="w-4 h-4 mr-2" /> Hapus Data</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
export default function Pengaturan() {
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [activePegawai, setActivePegawai] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  // User Form
  const { register: registerUser, handleSubmit: handleUserSubmit, reset: resetUser, setValue: setValueUser, watch: watchUser } = useForm();
  
  const [loading, setLoading] = useState(true);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [kepegawaianResetLoading, setKepegawaianResetLoading] = useState(false);
  
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
        
        // Fetch Active Pegawai for User Creation
        const pRes = await api.get('/api/pegawai', { params: { limit: 1000, status: 'AKTIF' } }); // Assuming default filter or we need to filter client side if API doesn't support status param on list endpoint yet.
        // Wait, the /api/pegawai endpoint doesn't explicitly support 'status' filter in the code I read earlier.
        // It supports 'search'. Let's check get_pegawai_list in routes/pegawai.py again.
        // It does NOT support status filter. It just paginates.
        // I should probably add a filter or just fetch all and filter client side (if not too many).
        // For now, let's fetch all (limit 1000) and filter in JS.
        setActivePegawai(pRes.data.data.filter(p => p.status === 'AKTIF'));
        
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

  const onAddUser = async (data) => {
      try {
          await api.post('/api/auth/register', data);
          toast.success("User berhasil dibuat");
          setIsUserModalOpen(false);
          resetUser();
          fetchData(); // Reload users
      } catch (e) {
          console.error(e);
          toast.error(e.response?.data?.detail || "Gagal membuat user");
      }
  };

  const handlePegawaiSelect = (pegawaiId) => {
      setValueUser('pegawai_id', pegawaiId);
      const selected = activePegawai.find(p => p._id === pegawaiId);
      if (selected) {
          setValueUser('full_name', selected.nama_lengkap);
          if (selected.email) setValueUser('email', selected.email);
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

  // --- Kepegawaian Reset Functions ---
  const handleKepegawaianReset = async (type) => {
      setKepegawaianResetLoading(true);
      const t = toast.loading('Menghapus data kepegawaian...');
      
      try {
          const endpoints = {
              overtime: '/api/kepegawaian/reset/overtime',
              employees: '/api/kepegawaian/reset/employees',
              all_kepegawaian: '/api/kepegawaian/reset/all'
          };
          
          const res = await api.delete(endpoints[type], {
              data: { confirm: 'CONFIRM' }
          });
          
          toast.success(res.data.message, { id: t });
          
          // Show deleted counts
          if (res.data.deleted) {
              const counts = Object.entries(res.data.deleted)
                  .map(([key, val]) => `${key}: ${val}`)
                  .join(', ');
              toast.info(`Data dihapus: ${counts}`);
          }
          
          // Refresh pegawai list if employees were deleted
          if (type === 'employees' || type === 'all_kepegawaian') {
              fetchData();
          }
      } catch (e) {
          const errorMsg = e.response?.data?.detail || 'Gagal menghapus data';
          toast.error(errorMsg, { id: t });
      } finally {
          setKepegawaianResetLoading(false);
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
                <TabsTrigger value="bank"><CreditCard size={14} className="mr-2"/> Bank</TabsTrigger>
                <TabsTrigger value="flexi"><Clock size={14} className="mr-2"/> Flexi-Time</TabsTrigger>
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

                    {/* Kepegawaian Reset Card */}
                    <Card className="border-orange-200 bg-orange-50">
                        <CardHeader>
                            <CardTitle className="text-orange-800 flex items-center"><Users size={18} className="mr-2"/> Reset Data Kepegawaian</CardTitle>
                            <CardDescription className="text-orange-600">Hapus data pegawai, lembur, dan absensi secara terpisah atau keseluruhan.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <KepegawaianResetDialog 
                                type="overtime" 
                                onConfirm={handleKepegawaianReset} 
                                loading={kepegawaianResetLoading} 
                            />
                            <KepegawaianResetDialog 
                                type="employees" 
                                onConfirm={handleKepegawaianReset} 
                                loading={kepegawaianResetLoading} 
                            />
                            <KepegawaianResetDialog 
                                type="all_kepegawaian" 
                                onConfirm={handleKepegawaianReset} 
                                loading={kepegawaianResetLoading} 
                            />
                            
                            <div className="mt-3 p-2 bg-orange-100 border border-orange-200 rounded text-xs text-orange-700">
                                <strong>Catatan:</strong> Reset data kepegawaian tidak mempengaruhi pengaturan tarif lembur dan user login.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Daftar Pengguna</CardTitle>
                            <CardDescription>Kelola akses pengguna aplikasi (Role Based)</CardDescription>
                        </div>
                        <Button onClick={() => setIsUserModalOpen(true)} className="bg-blue-600">
                            <Plus size={16} className="mr-2"/> Tambah User
                        </Button>
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
                                        <TableCell className="font-medium">
                                            {u.full_name}
                                            {u.pegawai_id && <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1 rounded">Pegawai</span>}
                                        </TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded text-xs font-bold
                                                ${u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 
                                                  u.role === 'kepala_satker' ? 'bg-red-100 text-red-800' :
                                                  u.role === 'validator' ? 'bg-orange-100 text-orange-800' :
                                                  u.role === 'operator' ? 'bg-green-100 text-green-800' :
                                                  'bg-slate-100 text-slate-800'}`}>
                                                {u.role.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell><span className="text-green-600 text-xs font-bold">Aktif</span></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Add User Modal */}
                <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Tambah User Baru</DialogTitle>
                            <DialogDescription>
                                Buat akun baru untuk pegawai aktif.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <form onSubmit={handleUserSubmit(onAddUser)} className="space-y-4">
                            <div className="space-y-1">
                                <Label>Pilih Pegawai (Aktif)</Label>
                                <Select onValueChange={handlePegawaiSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Pegawai..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activePegawai.map(p => (
                                            <SelectItem key={p._id} value={p._id}>
                                                {p.nama_lengkap} - {p.nip}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <input type="hidden" {...registerUser('pegawai_id', { required: "Pegawai wajib dipilih" })} />
                            </div>
                            
                            <div className="space-y-1">
                                <Label>Role Aplikasi</Label>
                                <Select onValueChange={(v) => setValueUser('role', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Role..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="operator">Operator</SelectItem>
                                        <SelectItem value="validator">Validator</SelectItem>
                                        <SelectItem value="kepala_satker">Kepala Satker</SelectItem>
                                        <SelectItem value="monitoring_pusat">Monitoring Pusat</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                <input type="hidden" {...registerUser('role', { required: true })} />
                            </div>

                            <div className="space-y-1">
                                <Label>Email Login</Label>
                                <Input {...registerUser('email', { required: true })} placeholder="email@instansi.go.id" />
                            </div>
                            
                            <div className="space-y-1">
                                <Label>Password</Label>
                                <Input type="password" {...registerUser('password', { required: true })} placeholder="******" />
                            </div>

                            <div className="space-y-1">
                                <Label>Nama Lengkap (Otomatis)</Label>
                                <Input {...registerUser('full_name')} readOnly className="bg-slate-50" />
                            </div>

                            <DialogFooter>
                                <Button type="submit" className="bg-blue-600 text-white w-full">Buat Akun</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </TabsContent>
            
            <TabsContent value="unit" className="mt-4">
                <UnitKerjaManager />
            </TabsContent>
            
            <TabsContent value="bank" className="mt-4">
                <BankManager />
            </TabsContent>
            
            <TabsContent value="flexi" className="mt-4">
                <FlexiTimeSettings />
            </TabsContent>
        </Tabs>
    </div>
  );
}
