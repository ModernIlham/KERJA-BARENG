import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Plus, Search, Loader2, Trash, Edit, AlertTriangle, ArrowRightLeft, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';
import PegawaiForm from '../components/pegawai/PegawaiForm';
import MutasiModal from '../components/pegawai/MutasiModal';

import PegawaiPhotoModal from '../components/pegawai/PegawaiPhotoModal';
export default function PegawaiList() {
  const [pegawai, setPegawai] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMutasiOpen, setIsMutasiOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  
  // State for selected item
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;
  
  const fetchPegawai = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/pegawai', { 
          params: { search, page: currentPage, limit } 
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

  useEffect(() => {
    const timeout = setTimeout(() => {
        if(search && currentPage !== 1) setCurrentPage(1);
        else fetchPegawai();
    }, 500);
    return () => clearTimeout(timeout);
  }, [search, currentPage]);

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
        <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Pegawai Baru
        </Button>
        
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

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Cari NIP, Nama, atau Unit Kerja..." 
              className="pl-9 max-w-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                  pegawai.map((item) => (
                    <TableRow key={item._id} className="hover:bg-slate-50">
                      <TableCell>
                         <div className="flex items-center gap-3">
                             <div 
                                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all"
                                onClick={() => openPhoto(item)}
                                title="Klik untuk ubah foto"
                             >
                                 {item.foto_thumbnail_url || item.foto_url ? (
                                    <img 
                                        src={item.foto_thumbnail_url || item.foto_url} 
                                        alt={item.nama_lengkap}
                                        className="h-full w-full object-cover"
                                    />
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
                          <div className="font-semibold">{item.jabatan}</div>
                          {item.pangkat_golongan && <div className="text-slate-500">{item.pangkat_golongan}</div>}
                          {item.status_jabatan && <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-[9px] rounded border border-yellow-200">{item.status_jabatan}</span>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                          {item.eselon1 && <div className="font-semibold">{item.eselon1}</div>}
                          {item.eselon2 && <div>&rdsh; {item.eselon2}</div>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${item.status === 'AKTIF' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openMutasi(item)} title="Mutasi/Promosi" className="text-blue-600 h-8 w-8 p-0 hover:bg-blue-50">
                              <ArrowRightLeft className="h-4 w-4" />
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
                  ))
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
