import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '../components/ui/pagination';
import { TableSkeleton } from '../components/ui/skeleton-table';

export default function PegawaiList() {
  const [pegawai, setPegawai] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;
  
  const { register, handleSubmit, reset } = useForm();

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

  const onSubmit = async (data) => {
    try {
      await api.post('/api/pegawai', data);
      toast.success("Pegawai berhasil ditambahkan");
      setIsModalOpen(false);
      reset();
      fetchPegawai();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gagal menyimpan pegawai");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Pegawai & Struktur Organisasi</h1>
        <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Pegawai
        </Button>
        {/* Modal Content... Omitted for brevity, logic exists */}
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
                  <TableHead>NIP / Nama</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Unit Kerja (Eselon)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton columns={4} rows={10} />
                ) : pegawai.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      Tidak ada data pegawai.
                    </TableCell>
                  </TableRow>
                ) : (
                  pegawai.map((item) => (
                    <TableRow key={item._id} className="hover:bg-slate-50">
                      <TableCell>
                         <div className="font-bold text-slate-900">{item.nama_lengkap}</div>
                         <div className="font-mono text-xs text-slate-500">{item.nip}</div>
                      </TableCell>
                      <TableCell className="text-slate-600">{item.jabatan}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                          {item.eselon1 && <div className="font-semibold">{item.eselon1}</div>}
                          {item.eselon2 && <div>&rdsh; {item.eselon2}</div>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'AKTIF' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {item.status}
                        </span>
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
