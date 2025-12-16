import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Building } from 'lucide-react';
import { toast } from 'sonner';

export default function InstansiSettings() {
    const { register, handleSubmit, setValue } = useForm();
import InstansiLogoUpload from './InstansiLogoUpload';

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/api/settings/instansi');
            if (res.data) {
                Object.keys(res.data).forEach(key => setValue(key, res.data[key]));
            }
        } catch (e) {
            console.error("Failed to load instansi config");
        }
    };

    const onSubmit = async (data) => {
        try {
            await api.put('/api/settings/instansi', data);
            toast.success("Informasi Instansi berhasil disimpan");
        } catch (e) {
            toast.error("Gagal menyimpan informasi");
        }
    };

    return (
        <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="bg-slate-50 border-b pb-3">
                <div className="flex items-center gap-2">
                    <Building className="text-slate-600"/>
                    <div>
                        <CardTitle className="text-base text-slate-800">Profil Instansi</CardTitle>
                        <CardDescription>Informasi ini akan digunakan pada kop surat dan laporan</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Nama Instansi</label>
                        <Input {...register("nama_instansi", {required: true})} placeholder="Kementerian / Lembaga / Dinas..." className="bg-slate-50"/>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Alamat Lengkap</label>
                        <Input {...register("alamat")} placeholder="Jl. Jenderal Sudirman No. 1..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Kota / Kabupaten</label>
                            <Input {...register("kota")} placeholder="Jakarta Pusat" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Kode Pos</label>
                            <Input {...register("kodepos")} placeholder="10110" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Nomor Telepon</label>
                            <Input {...register("telepon")} placeholder="(021) xxxxxxxx" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Email Resmi</label>
                            <Input {...register("email")} type="email" placeholder="info@instansi.go.id" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Website</label>
                            <Input {...register("website")} placeholder="www.instansi.go.id" />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <h4 className="text-sm font-bold text-slate-700 mb-3">Pimpinan Instansi (Penandatangan Default)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Nama Pimpinan</label>
                                <Input {...register("nama_pimpinan")} placeholder="Nama Lengkap beserta Gelar" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">NIP Pimpinan</label>
                                <Input {...register("nip_pimpinan")} placeholder="NIP 18 Digit" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <Button type="submit" className="bg-slate-900 text-white min-w-[150px]">
                            Simpan Perubahan
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
