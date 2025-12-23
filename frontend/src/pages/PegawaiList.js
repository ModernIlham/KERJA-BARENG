import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Plus, Search, Loader2, Trash, Edit, AlertTriangle, ArrowRightLeft, UserCircle, Clock, Package, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';
import PegawaiForm from '../components/pegawai/PegawaiForm';
import MutasiModal from '../components/pegawai/MutasiModal';
import ContractNotifications from '../components/pegawai/ContractNotifications';

import PegawaiPhotoModal from '../components/pegawai/PegawaiPhotoModal';
import SignaturePad from '../components/pegawai/SignaturePad';
import { PenTool } from 'lucide-react';
import ImportPegawaiModal from '../components/pegawai/ImportPegawaiModal';
import PegawaiDocumentModal from '../components/pegawai/PegawaiDocumentModal';
import { FileText } from 'lucide-react';
import RiwayatKarirModal from '../components/pegawai/RiwayatKarirModal';
import { Upload, History } from 'lucide-react';
import { Badge } from '../components/ui/badge';

export default function PegawaiList() {
  const [pegawai, setPegawai] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMutasiOpen, setIsMutasiOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [isSigOpen, setIsSigOpen] = useState(false);
  
  // State for selected item
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;
  
  // Filter & Sort States
  const [filters, setFilters] = useState({
    status: '',
    status_kepegawaian: '',
    eselon1: '',
    kategori_pegawai: ''
  });
  const [sortBy, setSortBy] = useState('nama_lengkap');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [unitKerjaOptions, setUnitKerjaOptions] = useState([]);
  const [exporting, setExporting] = useState(false);
  
  // Fetch unit kerja for filter options
  useEffect(() => {
    const fetchUnitKerja = async () => {
      try {
        const res = await api.get('/api/settings/unit-kerja');
        const eselon1 = res.data.filter(u => u.eselon === "1").map(u => u.nama_unit);
        setUnitKerjaOptions(eselon1);
      } catch (e) {}
    };
    fetchUnitKerja();
  }, []);
  
  const fetchPegawai = async () => {
  
  const fetchPegawai = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/pegawai', { 
          params: { search, page: currentPage, limit, sort_by: sortBy, sort_order: sortOrder, ...filters } 
      });
      setPegawai(res.data.data);
      setTotalPages(res.data.total_pages);
      setTotalItems(res.data.total);
    } catch (error) {
      toast.error("Gagal memuat data pegawai");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const res = await api.get('/api/pegawai/notifications/expiring');
      setNotificationCount(res.data.total || 0);
    } catch (e) {
      console.error('Failed to fetch notification count');
    }
  };

  // Helper to check contract expiry status
  const getContractStatus = (item) => {
    const tglSelesai = item.tgl_selesai_kontrak || item.masa_penugasan_end;
    if (!tglSelesai) return null;
    
    try {
      const endDate = new Date(tglSelesai);
      const today = new Date();
      const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining < 0) return { status: 'expired', days: Math.abs(daysRemaining), label: 'Berakhir' };
      if (daysRemaining <= 7) return { status: 'critical', days: daysRemaining, label: 'Kritis' };
      if (daysRemaining <= 14) return { status: 'high', days: daysRemaining, label: 'Penting' };
      if (daysRemaining <= 30) return { status: 'medium', days: daysRemaining, label: 'Perhatian' };
      return null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
        if(search && currentPage !== 1) setCurrentPage(1);
        else fetchPegawai();
    }, 500);
    return () => clearTimeout(timeout);
  }, [search, currentPage]);

  useEffect(() => {
    fetchNotificationCount();
  }, []);

  const openAdd = () => {
      setSelectedItem(null);
      setIsFormOpen(true);
  };

  const openEdit = (item) => {
      setSelectedItem(item);
      setIsFormOpen(true);
  };

  const openMutasi = (item) => {
      setSelectedItem(item);
      setIsMutasiOpen(true);
  };

  const confirmDelete = (id) => {
      setDeleteId(id);
      setIsDeleteOpen(true);
  };

  const openPhoto = (item) => {
      setSelectedItem(item);
      setIsPhotoOpen(true);
  };

  const openHistory = (item) => {
      setSelectedItem(item);
      setIsHistoryOpen(true);
  };

  const openDocuments = (item) => {
      setSelectedItem(item);
      setIsDocOpen(true);
  };

  const openSignature = (item) => {
      setSelectedItem(item);
      setIsSigOpen(true);
  };

  const handleDelete = async () => {
      try {
          await api.delete(`/api/pegawai/${deleteId}`);
          toast.success("Pegawai dihapus");
          fetchPegawai();
      } catch (e) {
          toast.error("Gagal menghapus");
      } finally {
          setIsDeleteOpen(false);
          setDeleteId(null);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen SDM</h1>
            <p className="text-sm text-slate-500">Kelola data pegawai, mutasi, dan struktur organisasi</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="bg-white border-slate-300" onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Import Excel
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Pegawai Baru
            </Button>
        </div>
        
        {/* Pegawai Form Modal (Add/Edit) */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedItem ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}</DialogTitle>
            </DialogHeader>
            <PegawaiForm 
                initialData={selectedItem} 
                onSuccess={() => {
                    setIsFormOpen(false);
                    fetchPegawai();
                }}
                onClose={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Mutasi Modal */}
        <MutasiModal 
            isOpen={isMutasiOpen}
            onClose={() => setIsMutasiOpen(false)}
            pegawai={selectedItem}
            onSuccess={fetchPegawai}
        />

        {/* Photo Modal */}
        <PegawaiPhotoModal
            isOpen={isPhotoOpen}
            onClose={() => setIsPhotoOpen(false)}
            pegawai={selectedItem}
            onSuccess={fetchPegawai}
        />

        {/* Import Modal */}
        <ImportPegawaiModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onSuccess={fetchPegawai}
        />

        {/* History Modal */}
        <RiwayatKarirModal 
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            pegawai={selectedItem}
        />

        {/* Document Modal */}
        <PegawaiDocumentModal
            isOpen={isDocOpen}
            onClose={() => setIsDocOpen(false)}
            pegawai={selectedItem}
            onSuccess={fetchPegawai}
        />

        {/* Signature Modal */}
        <Dialog open={isSigOpen} onOpenChange={setIsSigOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Tanda Tangan Digital</DialogTitle>
                    <DialogDescription>
                        Atur tanda tangan untuk {selectedItem?.nama_lengkap}. Digunakan untuk pengesahan dokumen digital.
                    </DialogDescription>
                </DialogHeader>
                {selectedItem && (
                    <SignaturePad 
                        pegawaiId={selectedItem._id} 
                        existingSignature={selectedItem.signature_url}
                        onSuccess={() => {
                            setIsSigOpen(false);
                            fetchPegawai();
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle/> Konfirmasi Hapus
                    </DialogTitle>
                    <DialogDescription>
                        Apakah Anda yakin ingin menghapus data pegawai ini? Tindakan ini tidak dapat dibatalkan.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Batal</Button>
                    <Button variant="destructive" onClick={handleDelete}>Ya, Hapus</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
      {/* Notification Panel */}
      {showNotifications && (
        <div className="mb-4">
          <ContractNotifications onRefresh={() => { fetchPegawai(); fetchNotificationCount(); }} />
        </div>
      )}


      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Cari NIP, Nama, atau Unit Kerja..." 
                className="pl-9 max-w-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button 
              variant={showNotifications ? "default" : "outline"}
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className={notificationCount > 0 ? "relative" : ""}
            >
              <Bell className="h-4 w-4 mr-1" />
              Notifikasi
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Profil Pegawai</TableHead>
                  <TableHead>Jabatan & Pangkat</TableHead>
                  <TableHead>Unit Kerja (Eselon)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center w-[120px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton columns={5} rows={10} />
                ) : pegawai.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      Tidak ada data pegawai.
                    </TableCell>
                  </TableRow>
                ) : (
                  pegawai.map((item) => {
                    // Determine row color based on status
                    const getRowClassName = () => {
                      const status = (item.status || '').toUpperCase();
                      // Gray/faded for inactive statuses
                      if (['KELUAR', 'PENSIUN', 'MUTASI_KELUAR', 'MENINGGAL', 'RESIGN', 'PHK'].includes(status)) {
                        return 'bg-slate-100 opacity-60 hover:opacity-80';
                      }
                      // Yellow for temporary leave
                      if (['CUTI', 'TUGAS_BELAJAR', 'TUGAS BELAJAR'].includes(status)) {
                        return 'bg-amber-50 hover:bg-amber-100';
                      }
                      return 'hover:bg-slate-50';
                    };
                    
                    return (
                    <TableRow key={item._id} className={getRowClassName()}>
                      <TableCell>
                         <div className="flex items-center gap-3">
                             <div 
                                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all relative group"
                                onClick={() => openPhoto(item)}
                                title="Klik untuk ubah foto"
                             >
                                 {item.foto_thumbnail_url || item.foto_url ? (
                                    <>
                                        <img 
                                            src={item.foto_thumbnail_url || item.foto_url} 
                                            alt={item.nama_lengkap}
                                            className="h-full w-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center gap-2">
                                            <span className="text-[8px] text-white bg-slate-900/50 px-1 rounded">Edit</span>
                                            <a 
                                                href={item.foto_url || item.foto_thumbnail_url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-1 bg-white/20 rounded-full hover:bg-white/40 text-white"
                                                onClick={(e) => e.stopPropagation()}
                                                title="Zoom Fullscreen"
                                            >
                                                <ExternalLink size={10}/>
                                            </a>
                                        </div>
                                    </>
                                 ) : (
                                    <UserCircle size={24}/>
                                 )}
                             </div>
                             <div>
                                <div className="font-bold text-slate-900 text-sm">{item.nama_lengkap}</div>
                                <div className="font-mono text-[10px] text-slate-500">{item.nip}</div>
                                <div className="text-[10px] text-blue-600 font-medium">{item.status_kepegawaian}</div>
                             </div>
                         </div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                          {item.is_pimpinan_kl && item.jabatan_pimpinan_kl && (
                              <div className="mb-1">
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded-full font-semibold border border-amber-300">
                                      {item.jabatan_pimpinan_kl}
                                  </span>
                              </div>
                          )}
                          <div className="font-semibold">{item.jabatan}</div>
                          {item.pangkat_golongan && <div className="text-slate-500">{item.pangkat_golongan}</div>}
                          {item.status_jabatan && <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-[9px] rounded border border-yellow-200">{item.status_jabatan}</span>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                          <div className="space-y-0.5">
                            {item.is_pimpinan_kl && item.jabatan_pimpinan_kl && (
                              <div className="font-bold text-amber-700 text-[10px] mb-1">★ Pimpinan K/L</div>
                            )}
                            {item.eselon1 && <div className="font-semibold text-slate-800">{item.eselon1}</div>}
                            {item.eselon2 && <div className="text-slate-600 pl-2 text-[10px]">└ {item.eselon2}</div>}
                            {item.eselon3 && <div className="text-slate-500 pl-4 text-[10px]">└ {item.eselon3}</div>}
                            {item.eselon4 && <div className="text-slate-400 pl-6 text-[10px]">└ {item.eselon4}</div>}
                            {item.eselon5 && <div className="text-slate-400 pl-8 text-[10px]">└ {item.eselon5}</div>}
                          </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {(() => {
                            const status = (item.status || 'AKTIF').toUpperCase();
                            const statusColors = {
                              'AKTIF': 'bg-green-100 text-green-700 border-green-200',
                              'CUTI': 'bg-amber-100 text-amber-700 border-amber-200',
                              'TUGAS_BELAJAR': 'bg-amber-100 text-amber-700 border-amber-200',
                              'TUGAS BELAJAR': 'bg-amber-100 text-amber-700 border-amber-200',
                              'KELUAR': 'bg-slate-200 text-slate-500 border-slate-300',
                              'PENSIUN': 'bg-slate-200 text-slate-500 border-slate-300',
                              'MUTASI_KELUAR': 'bg-slate-200 text-slate-500 border-slate-300',
                              'MENINGGAL': 'bg-slate-300 text-slate-600 border-slate-400',
                              'RESIGN': 'bg-slate-200 text-slate-500 border-slate-300',
                              'PHK': 'bg-red-100 text-red-600 border-red-200',
                            };
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {item.status}
                              </span>
                            );
                          })()}
                          {/* Contract Expiry Badge */}
                          {/* Contract Expiry Badge */}
                          {(() => {
                            const contractStatus = getContractStatus(item);
                            if (!contractStatus) return null;
                            const colors = {
                              expired: 'bg-gray-500 text-white',
                              critical: 'bg-red-500 text-white animate-pulse',
                              high: 'bg-orange-500 text-white',
                              medium: 'bg-yellow-500 text-white'
                            };
                            return (
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${colors[contractStatus.status]}`}>
                                <Clock className="h-3 w-3" />
                                {contractStatus.status === 'expired' 
                                  ? `${contractStatus.days}hr lalu` 
                                  : `${contractStatus.days}hr lagi`}
                              </div>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openMutasi(item)} title="Mutasi/Promosi" className="text-blue-600 h-8 w-8 p-0 hover:bg-blue-50">
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openHistory(item)} title="Riwayat Karir" className="text-purple-600 h-8 w-8 p-0 hover:bg-purple-50">
                              <History className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openDocuments(item)} title="Dokumen Pendukung" className="text-orange-600 h-8 w-8 p-0 hover:bg-orange-50">
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openSignature(item)} title="Tanda Tangan Digital" className="text-emerald-600 h-8 w-8 p-0 hover:bg-emerald-50">
                              <PenTool className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="Edit Profil" className="text-slate-500 h-8 w-8 p-0 hover:bg-slate-100">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => confirmDelete(item._id)} title="Hapus" className="text-red-500 h-8 w-8 p-0 hover:bg-red-50">
                              <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            limit={limit}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
