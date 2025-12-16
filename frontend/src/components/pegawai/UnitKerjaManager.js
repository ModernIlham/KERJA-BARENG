import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Trash, Plus, Network } from 'lucide-react';
import { toast } from 'sonner';

export default function UnitKerjaManager() {
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("1"); // Eselon Level 1-5

    const { register, handleSubmit, reset, watch, setValue } = useForm();
    const selectedParent = watch('parent_id');

    useEffect(() => {
        fetchUnits();
    }, []);

    const fetchUnits = async () => {
        try {
            const res = await api.get('/api/settings/unit-kerja');
            setUnits(res.data);
        } catch (e) {
            toast.error("Gagal memuat data unit kerja");
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data) => {
        try {
            await api.post('/api/settings/unit-kerja', {
                ...data,
                eselon: activeTab // Force current tab level
            });
            toast.success("Unit Kerja ditambahkan");
            reset();
            fetchUnits();
        } catch (e) {
            toast.error("Gagal menyimpan unit kerja");
        }
    };

    const onDelete = async (id) => {
        if (!window.confirm("Hapus unit kerja ini?")) return;
        try {
            await api.delete(`/api/settings/unit-kerja/${id}`);
            toast.success("Unit Kerja dihapus");
            fetchUnits();
        } catch (e) {
            toast.error("Gagal menghapus");
        }
    };

    // --- Helpers ---
    const getUnitsByLevel = (level) => units.filter(u => u.eselon === level);
    const getUnitName = (id) => units.find(u => u.id === id)?.nama_unit || '-';

    const renderTabContent = (level) => {
        const levelInt = parseInt(level);
        const parentLevel = (levelInt - 1).toString();
        const currentUnits = getUnitsByLevel(level);
        const parentOptions = levelInt > 1 ? getUnitsByLevel(parentLevel) : [];

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 bg-slate-50/50">
                        <CardTitle className="text-base">Tambah Struktur Eselon {level}</CardTitle>
                        {levelInt > 1 && (
                            <CardDescription>
                                Unit ini berada di bawah naungan <strong>Eselon {parentLevel}</strong>
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleSubmit(onSubmit)} className="flex gap-4 items-end">
                            {levelInt > 1 && (
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs font-medium">Induk (Eselon {parentLevel})</label>
                                    <select 
                                        {...register('parent_id', { required: true })} 
                                        className="w-full h-10 border rounded px-3 text-sm bg-white"
                                    >
                                        <option value="">-- Pilih Induk --</option>
                                        {parentOptions.map(p => (
                                            <option key={p.id} value={p.id}>{p.nama_unit}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex-[2] space-y-1">
                                <label className="text-xs font-medium">Nama Unit Eselon {level}</label>
                                <Input {...register('nama_unit', { required: true })} placeholder={`Contoh: ${levelInt === 1 ? 'Sekretariat Jenderal' : 'Bagian Umum'}`} />
                            </div>
                            <Button type="submit" className="bg-slate-900 text-white min-w-[100px]">
                                <Plus size={16} className="mr-2"/> Tambah
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="rounded-md border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-100">
                            <TableRow>
                                <TableHead className="w-[50px]">No</TableHead>
                                <TableHead>Nama Unit</TableHead>
                                {levelInt > 1 && <TableHead>Induk (Eselon {parentLevel})</TableHead>}
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentUnits.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={levelInt > 1 ? 4 : 3} className="text-center py-8 text-slate-500">
                                        Belum ada data untuk Eselon {level}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                currentUnits.map((u, i) => (
                                    <TableRow key={u.id}>
                                        <TableCell>{i + 1}</TableCell>
                                        <TableCell className="font-medium">{u.nama_unit}</TableCell>
                                        {levelInt > 1 && (
                                            <TableCell className="text-slate-600">
                                                {u.parent_id ? (
                                                    <span className="flex items-center gap-2">
                                                        <Network size={14} className="text-slate-400"/>
                                                        {getUnitName(u.parent_id)}
                                                    </span>
                                                ) : <span className="text-red-400 italic">Tanpa Induk</span>}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="ghost" onClick={() => onDelete(u.id)} className="text-red-500 hover:bg-red-50">
                                                <Trash size={14}/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Memuat struktur organisasi...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                    <Network size={24}/>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Manajemen Struktur Organisasi</h2>
                    <p className="text-sm text-slate-500">Atur hierarki jabatan struktural dari Eselon I hingga V</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); reset(); }} className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-slate-100 p-1">
                    <TabsTrigger value="1">Eselon I</TabsTrigger>
                    <TabsTrigger value="2">Eselon II</TabsTrigger>
                    <TabsTrigger value="3">Eselon III</TabsTrigger>
                    <TabsTrigger value="4">Eselon IV</TabsTrigger>
                    <TabsTrigger value="5">Eselon V</TabsTrigger>
                </TabsList>
                
                <div className="mt-4">
                    <TabsContent value="1">{renderTabContent("1")}</TabsContent>
                    <TabsContent value="2">{renderTabContent("2")}</TabsContent>
                    <TabsContent value="3">{renderTabContent("3")}</TabsContent>
                    <TabsContent value="4">{renderTabContent("4")}</TabsContent>
                    <TabsContent value="5">{renderTabContent("5")}</TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
