import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { User, Briefcase, BadgeCheck, Phone } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'sonner';

export default function PegawaiForm({ initialData, onSuccess, onClose }) {
    const { register, handleSubmit, reset, setValue, watch, control } = useForm({
        defaultValues: initialData || {
            kewarganegaraan: 'WNI',
            status_kepegawaian: 'PNS',
            status: 'AKTIF'
        }
    });

    useEffect(() => {
        if (initialData) {
            Object.keys(initialData).forEach(key => setValue(key, initialData[key]));
        }
    }, [initialData, setValue]);

    const onSubmit = async (data) => {
        try {
            // Combine names if needed, but backend supports components
            if (initialData) {
                await api.put(`/api/pegawai/${initialData._id}`, data);
                toast.success("Data pegawai diperbarui");
            } else {
                await api.post('/api/pegawai', data);
                toast.success("Pegawai berhasil ditambahkan");
            }
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Gagal menyimpan pegawai");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="utama" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-slate-100">
                    <TabsTrigger value="utama" className="text-xs"><User size={14} className="mr-2"/> Utama</TabsTrigger>
                    <TabsTrigger value="jabatan" className="text-xs"><Briefcase size={14} className="mr-2"/> Jabatan</TabsTrigger>
                    <TabsTrigger value="status" className="text-xs"><BadgeCheck size={14} className="mr-2"/> Status</TabsTrigger>
                    <TabsTrigger value="kontak" className="text-xs"><Phone size={14} className="mr-2"/> Kontak</TabsTrigger>
                </TabsList>

                <div className="mt-4 max-h-[60vh] overflow-y-auto px-1">
                    {/* --- TAB 1: INFORMASI UTAMA --- */}
                    <TabsContent value="utama" className="space-y-4">
                        <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-3">
                                <Label className="text-xs">Gelar Depan</Label>
                                <Input {...register("gelar_depan")} placeholder="Dr." className="h-8"/>
                            </div>
                            <div className="col-span-6">
                                <Label className="text-xs">Nama Lengkap *</Label>
                                <Input {...register("nama_lengkap", { required: true })} placeholder="Nama Lengkap" className="h-8"/>
                            </div>
                            <div className="col-span-3">
                                <Label className="text-xs">Gelar Belakang</Label>
                                <Input {...register("gelar_belakang")} placeholder="S.Kom, M.T." className="h-8"/>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">NIP / NRP *</Label>
                                <Input {...register("nip", { required: true })} placeholder="1980xxxxxxxxxxxx" className="h-8 font-mono"/>
                            </div>
                            <div>
                                <Label className="text-xs">Kewarganegaraan</Label>
                                <select {...register("kewarganegaraan")} className="w-full h-8 border rounded px-2 text-sm bg-white">
                                    <option value="WNI">WNI</option>
                                    <option value="WNA">WNA</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">NIK</Label>
                                <Input {...register("nik")} placeholder="16 digit NIK" className="h-8 font-mono"/>
                            </div>
                            <div>
                                <Label className="text-xs">NPWP</Label>
                                <Input {...register("npwp")} placeholder="15/16 digit NPWP" className="h-8 font-mono"/>
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- TAB 2: JABATAN & UNIT KERJA --- */}
                    <TabsContent value="jabatan" className="space-y-4">
                        <div>
                            <Label className="text-xs">Jabatan Struktural Utama *</Label>
                            <Input {...register("jabatan", { required: true })} placeholder="Contoh: Kepala Biro Umum" className="h-8"/>
                        </div>

                        <Separator className="my-2"/>
                        <Label className="text-xs font-bold text-slate-500">Unit Kerja (Struktur Organisasi)</Label>
                        
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <Label className="text-[10px] text-slate-400">Unit Eselon I</Label>
                                <Input {...register("eselon1")} placeholder="Sekretariat Jenderal" className="h-8"/>
                            </div>
                            <div>
                                <Label className="text-[10px] text-slate-400">Unit Eselon II</Label>
                                <Input {...register("eselon2")} placeholder="Biro Umum" className="h-8"/>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[10px] text-slate-400">Unit Eselon III</Label>
                                    <Input {...register("eselon3")} placeholder="Bagian..." className="h-8"/>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-slate-400">Unit Eselon IV</Label>
                                    <Input {...register("eselon4")} placeholder="Subbagian..." className="h-8"/>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- TAB 3: ATRIBUT & STATUS --- */}
                    <TabsContent value="status" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Status Kepegawaian</Label>
                                <select {...register("status_kepegawaian")} className="w-full h-8 border rounded px-2 text-sm bg-white">
                                    <option value="PNS">PNS</option>
                                    <option value="CPNS">CPNS</option>
                                    <option value="PPPK">PPPK</option>
                                    <option value="Non-ASN">Non-ASN / PPNPN</option>
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs">Kategori Pegawai</Label>
                                <select {...register("kategori_pegawai")} className="w-full h-8 border rounded px-2 text-sm bg-white">
                                    <option value="Struktural">Struktural</option>
                                    <option value="Fungsional">Fungsional</option>
                                    <option value="Pelaksana">Pelaksana</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Status Penempatan</Label>
                                <select {...register("status_penempatan")} className="w-full h-8 border rounded px-2 text-sm bg-white">
                                    <option value="Pusat">Pusat</option>
                                    <option value="Daerah">Daerah / UPT</option>
                                    <option value="Penugasan">Penugasan Khusus</option>
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs">Status Jabatan</Label>
                                <select {...register("status_jabatan")} className="w-full h-8 border rounded px-2 text-sm bg-white">
                                    <option value="Definitif">Definitif</option>
                                    <option value="Plt">Plt. (Pelaksana Tugas)</option>
                                    <option value="Plh">Plh. (Pelaksana Harian)</option>
                                    <option value="Pj">Pj. (Penjabat)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Pangkat / Golongan</Label>
                                <Input {...register("pangkat_golongan")} placeholder="Contoh: Pembina (IV/a)" className="h-8"/>
                            </div>
                            <div>
                                <Label className="text-xs">Status Sistem</Label>
                                <select {...register("status")} className="w-full h-8 border rounded px-2 text-sm bg-white font-bold">
                                    <option value="AKTIF">AKTIF</option>
                                    <option value="CUTI">CUTI</option>
                                    <option value="TUGAS_BELAJAR">TUGAS BELAJAR</option>
                                    <option value="KELUAR">KELUAR / PENSIUN</option>
                                </select>
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- TAB 4: KONTAK & LAINNYA --- */}
                    <TabsContent value="kontak" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Nomor Telepon / HP</Label>
                                <Input {...register("no_telp")} placeholder="08xxxxxxxx" className="h-8"/>
                            </div>
                            <div>
                                <Label className="text-xs">Email</Label>
                                <Input {...register("email")} type="email" placeholder="email@example.com" className="h-8"/>
                            </div>
                        </div>

                        <Separator className="my-2"/>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Nama Bank</Label>
                                <Input {...register("nama_bank")} placeholder="BSI / Mandiri" className="h-8"/>
                            </div>
                            <div>
                                <Label className="text-xs">Nomor Rekening</Label>
                                <Input {...register("no_rekening")} placeholder="xxxxxxxxxx" className="h-8"/>
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs">Keterangan Tambahan</Label>
                            <Input {...register("keterangan")} placeholder="Catatan khusus..." className="h-8"/>
                        </div>
                    </TabsContent>
                </div>

                <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                    <Button type="submit" className="bg-slate-900 text-white">Simpan Data</Button>
                </DialogFooter>
            </Tabs>
        </form>
    );
}
