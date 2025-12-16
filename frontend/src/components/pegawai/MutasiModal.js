import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import api from '../../api/axios';
import { toast } from 'sonner';
import { Briefcase, ArrowRightLeft } from 'lucide-react';

export default function MutasiModal({ isOpen, onClose, pegawai, onSuccess }) {
    const { register, handleSubmit, reset, setValue, watch } = useForm();

    const onSubmit = async (data) => {
        try {
            const payload = {
                jenis_mutasi: data.jenis_mutasi,
                jabatan_baru: data.jabatan_baru,
                unit_kerja_baru: {
                    eselon1: data.eselon1,
                    eselon2: data.eselon2,
                    eselon3: data.eselon3,
                    eselon4: data.eselon4
                },
                pangkat_baru: data.pangkat_baru || null,
                sk_ref: data.sk_ref,
                keterangan: data.keterangan,
                tgl_efektif: data.tgl_efektif
            };

            await api.post(`/api/pegawai/${pegawai._id}/mutasi`, payload);
            toast.success("Mutasi pegawai berhasil diproses");
            reset();
            onSuccess();
            onClose();
        } catch (error) {
            toast.error("Gagal memproses mutasi");
        }
    };

    if (!pegawai) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="text-blue-600"/> 
                        Proses Mutasi / Promosi
                    </DialogTitle>
                    <div className="text-sm text-slate-500">
                        Pegawai: <span className="font-bold text-slate-700">{pegawai.nama_lengkap}</span> ({pegawai.nip})
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs">Jenis Perubahan</Label>
                            <select {...register("jenis_mutasi", {required: true})} className="w-full h-9 border rounded px-2 text-sm">
                                <option value="Mutasi Internal">Mutasi Internal</option>
                                <option value="Mutasi Eksternal">Mutasi Eksternal</option>
                                <option value="Promosi">Promosi (Kenaikan Jabatan)</option>
                                <option value="Demosi">Demosi (Penurunan Jabatan)</option>
                                <option value="Pengangkatan Kembali">Pengangkatan Kembali</option>
                            </select>
                        </div>
                        <div>
                            <Label className="text-xs">Tanggal Efektif (TMT)</Label>
                            <Input type="date" {...register("tgl_efektif", {required: true})} className="h-9"/>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                        <h4 className="text-xs font-bold flex items-center gap-2"><Briefcase size={12}/> Jabatan & Unit Baru</h4>
                        
                        <div>
                            <Label className="text-xs">Jabatan Baru</Label>
                            <Input {...register("jabatan_baru", {required: true})} placeholder="Nama Jabatan Baru" className="h-8 bg-white"/>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-[10px] text-slate-500">Unit Eselon I</Label>
                                <Input {...register("eselon1")} placeholder="Eselon I Baru" className="h-8 bg-white text-xs"/>
                            </div>
                            <div>
                                <Label className="text-[10px] text-slate-500">Unit Eselon II</Label>
                                <Input {...register("eselon2")} placeholder="Eselon II Baru" className="h-8 bg-white text-xs"/>
                            </div>
                            <div>
                                <Label className="text-[10px] text-slate-500">Unit Eselon III</Label>
                                <Input {...register("eselon3")} placeholder="Eselon III Baru" className="h-8 bg-white text-xs"/>
                            </div>
                            <div>
                                <Label className="text-[10px] text-slate-500">Unit Eselon IV</Label>
                                <Input {...register("eselon4")} placeholder="Eselon IV Baru" className="h-8 bg-white text-xs"/>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs">Nomor SK / Ref</Label>
                            <Input {...register("sk_ref")} placeholder="Nomor SK Mutasi" className="h-9"/>
                        </div>
                        <div>
                            <Label className="text-xs">Pangkat Baru (Opsional)</Label>
                            <Input {...register("pangkat_baru")} placeholder="Jika ada kenaikan pangkat" className="h-9"/>
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs">Keterangan</Label>
                        <Input {...register("keterangan")} placeholder="Alasan mutasi..." className="h-9"/>
                    </div>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Simpan Mutasi</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
