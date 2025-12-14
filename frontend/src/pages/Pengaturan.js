import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2, Plus, Trash, User, Building } from 'lucide-react';
import { toast } from 'sonner';

export default function Pengaturan() {
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const { register: registerUnit, handleSubmit: handleUnitSubmit, reset: resetUnit } = useForm();
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const [uRes, unitRes] = await Promise.all([
            api.get('/api/settings/users'),
            api.get('/api/settings/unit-kerja')
        ]);
        setUsers(uRes.data);
        setUnits(unitRes.data);
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

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Sistem</h1>
        
        <Tabs defaultValue="users">
            <TabsList className="bg-slate-100">
                <TabsTrigger value="users">Manajemen User</TabsTrigger>
                <TabsTrigger value="unit">Unit Kerja & Struktur</TabsTrigger>
                <TabsTrigger value="referensi">Referensi Lain</TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="mt-4">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>Tambah Unit Kerja</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUnitSubmit(onAddUnit)} className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Nama Unit</label>
                                    <Input {...registerUnit('nama_unit', {required: true})} placeholder="Biro Umum" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Tingkat Eselon</label>
                                    <select {...registerUnit('eselon', {required: true})} className="w-full text-sm border rounded p-2">
                                        <option value="1">Eselon I</option>
                                        <option value="2">Eselon II</option>
                                        <option value="3">Eselon III</option>
                                        <option value="4">Eselon IV</option>
                                    </select>
                                </div>
                                <Button type="submit" className="w-full bg-slate-900">Simpan</Button>
                            </form>
                        </CardContent>
                    </Card>
                    
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Struktur Organisasi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-[500px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama Unit</TableHead>
                                            <TableHead>Eselon</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {units.map((unit) => (
                                            <TableRow key={unit.id}>
                                                <TableCell>{unit.nama_unit}</TableCell>
                                                <TableCell>{unit.eselon}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="ghost" onClick={() => onDeleteUnit(unit.id)} className="text-red-500">
                                                        <Trash size={14}/>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="referensi" className="mt-4">
                 <div className="p-8 text-center text-slate-500 border-2 border-dashed rounded-lg">
                     Fitur Referensi Tambahan (Klasifikasi, Rumpun Jabatan) dapat ditambahkan di sini.
                 </div>
            </TabsContent>
        </Tabs>
    </div>
  );
}
