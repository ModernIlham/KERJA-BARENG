import React, { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { User, Briefcase, BadgeCheck, Phone, Info } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'sonner';
import PegawaiPhotoUpload from './PegawaiPhotoUpload';

// --- REF DATA ---
const PANGKAT_GOLONGAN = {
    'ASN': [
        "Juru Muda (I/a)", "Juru Muda Tingkat I (I/b)", "Juru (I/c)", "Juru Tingkat I (I/d)",
        "Pengatur Muda (II/a)", "Pengatur Muda Tingkat I (II/b)", "Pengatur (II/c)", "Pengatur Tingkat I (II/d)",
        "Penata Muda (III/a)", "Penata Muda Tingkat I (III/b)", "Penata (III/c)", "Penata Tingkat I (III/d)",
        "Pembina (IV/a)", "Pembina Tingkat I (IV/b)", "Pembina Utama Muda (IV/c)", "Pembina Utama Madya (IV/d)", "Pembina Utama (IV/e)"
    ],
    'TNI': [
        "Prajurit Dua", "Prajurit Satu", "Prajurit Kepala", 
        "Kopral Dua", "Kopral Satu", "Kopral Kepala",
        "Sersan Dua", "Sersan Satu", "Sersan Kepala", "Sersan Mayor",
        "Pembantu Letnan Dua", "Pembantu Letnan Satu",
        "Letnan Dua", "Letnan Satu", "Kapten",
        "Mayor", "Letnan Kolonel", "Kolonel",
        "Brigadir Jenderal", "Mayor Jenderal", "Letnan Jenderal", "Jenderal"
    ],
    'POLRI': [
        "Bhayangkara Dua", "Bhayangkara Satu", "Bhayangkara Kepala",
        "Ajun Brigadir Polisi Dua", "Ajun Brigadir Polisi Satu", "Ajun Brigadir Polisi",
        "Brigadir Polisi Dua", "Brigadir Polisi Satu", "Brigadir Polisi", "Brigadir Polisi Kepala",
        "Ajun Inspektur Polisi Dua", "Ajun Inspektur Polisi Satu",
        "Inspektur Polisi Dua", "Inspektur Polisi Satu", "Ajun Komisaris Polisi",
        "Komisaris Polisi", "Ajun Komisaris Besar Polisi", "Komisaris Besar Polisi",
        "Brigadir Jenderal Polisi", "Inspektur Jenderal Polisi", "Komisaris Jenderal Polisi", "Jenderal Polisi"
    ]
};

export default function PegawaiForm({ initialData, onSuccess, onClose }) {
    const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm({
        defaultValues: initialData || {
            kewarganegaraan: 'WNI',
            status_kepegawaian: 'PNS',
            status: 'AKTIF',
            jenis_non_asn: 'Kontrak'
        }
    });

    const kewarganegaraan = watch('kewarganegaraan');
    const statusKepegawaian = watch('status_kepegawaian');
    const jenisNonAsn = watch('jenis_non_asn');
    const statusPenempatan = watch('status_penempatan');
    const kategoriPegawai = watch('kategori_pegawai');

    // Unit Watchers for Cascading
    const watchEselon1 = watch('eselon1');
    const watchEselon2 = watch('eselon2');
    const watchEselon3 = watch('eselon3');
    const watchEselon4 = watch('eselon4');

    // Unit Options State
    const [units, setUnits] = useState([]);
    const [optEselon1, setOptEselon1] = useState([]);
    const [optEselon2, setOptEselon2] = useState([]);
    const [optEselon3, setOptEselon3] = useState([]);
    const [optEselon4, setOptEselon4] = useState([]);
    const [optEselon5, setOptEselon5] = useState([]);

    // Dynamic Logic for Identity
    const isWNI = kewarganegaraan === 'WNI';
    const isASN = ['PNS', 'PPPK'].includes(statusKepegawaian);
    const isTNI_POLRI = ['TNI', 'POLRI'].includes(statusKepegawaian);
    const isNonASN = ['Non-ASN', 'Honorer'].includes(statusKepegawaian);

    useEffect(() => {
        fetchUnits();
    }, []);

    const fetchUnits = async () => {
        try {
            const res = await api.get('/api/settings/unit-kerja');
            setUnits(res.data);
            setOptEselon1(res.data.filter(u => u.eselon === "1"));
        } catch (e) {
            console.error(e);
        }
    };

    // Filter Logic for Cascading Dropdowns
    useEffect(() => {
        if (!watchEselon1) { setOptEselon2([]); return; }
        // Find ID of selected Eselon 1 Name
        const parent = units.find(u => u.nama_unit === watchEselon1 && u.eselon === "1");
        if (parent) {
            setOptEselon2(units.filter(u => u.parent_id === parent.id && u.eselon === "2"));
        } else { setOptEselon2([]); }
    }, [watchEselon1, units]);

    useEffect(() => {
        if (!watchEselon2) { setOptEselon3([]); return; }
        const parent = units.find(u => u.nama_unit === watchEselon2 && u.eselon === "2");
        if (parent) {
            setOptEselon3(units.filter(u => u.parent_id === parent.id && u.eselon === "3"));
        } else { setOptEselon3([]); }
    }, [watchEselon2, units]);

    useEffect(() => {
        if (!watchEselon3) { setOptEselon4([]); return; }
        const parent = units.find(u => u.nama_unit === watchEselon3 && u.eselon === "3");
        if (parent) {
            setOptEselon4(units.filter(u => u.parent_id === parent.id && u.eselon === "4"));
        } else { setOptEselon4([]); }
    }, [watchEselon3, units]);

    useEffect(() => {
        if (!watchEselon4) { setOptEselon5([]); return; }
        const parent = units.find(u => u.nama_unit === watchEselon4 && u.eselon === "4");
        if (parent) {
            setOptEselon5(units.filter(u => u.parent_id === parent.id && u.eselon === "5"));
        } else { setOptEselon5([]); }
    }, [watchEselon4, units]);


    useEffect(() => {
        if (initialData) {
            Object.keys(initialData).forEach(key => setValue(key, initialData[key]));
        }
    }, [initialData, setValue]);

    const onSubmit = async (data) => {
        try {
            // Manual Validation Logic if needed
            if(isWNI) {
                if (isASN && data.nip.length !== 18) return toast.error("NIP ASN wajib 18 digit");
                if (isNonASN && data.nik && data.nik.length !== 16) return toast.error("NIK wajib 16 digit");
            }

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
                    <TabsTrigger value="status" className="text-xs"><BadgeCheck size={14} className="mr-2"/> Atribut</TabsTrigger>
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
                                <Input {...register("gelar_belakang")} placeholder="S.Kom" className="h-8"/>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Kewarganegaraan</Label>
                                <select {...register("kewarganegaraan")} className="w-full h-8 border rounded px-2 text-sm bg-white">
                                    <option value="WNI">WNI</option>
                                    <option value="WNA">WNA</option>
                                </select>
                            </div>
                            
                            {/* Dynamic Identity Field */}
                            {isWNI ? (
                                <div>
                                    <Label className="text-xs font-bold text-blue-700">
                                        {isASN ? "NIP (18 Digit) *" : isTNI_POLRI ? "NRP *" : "NIK (16 Digit) *"}
                                    </Label>
                                    <Input 
                                        {...register(isASN ? "nip" : isTNI_POLRI ? "nrp" : "nik", { required: true })} 
                                        placeholder={isASN ? "1980xxxxxxxxxxxx" : "Nomor Identitas"} 
                                        className="h-8 font-mono bg-blue-50/50"
                                        maxLength={isASN ? 18 : isTNI_POLRI ? 20 : 16}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <Label className="text-xs font-bold text-amber-700">Jenis Identitas WNA</Label>
                                    <div className="flex gap-2">
                                        <select {...register("jenis_identitas_wna")} className="w-1/3 h-8 border rounded px-2 text-sm bg-white">
                                            <option value="PASPOR">PASPOR</option>
                                            <option value="KITAS">KITAS</option>
                                            <option value="KITAP">KITAP</option>
                                        </select>
                                        <Input {...register("nomor_identitas_wna", {required: true})} placeholder="Nomor..." className="flex-1 h-8 font-mono"/>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Additional WNI Fields */}
                        {isWNI && (
                            <div className="grid grid-cols-2 gap-4">
                                {isASN && (
                                    <div>
                                        <Label className="text-xs">NIK (KTP)</Label>
                                        <Input {...register("nik")} placeholder="16 digit NIK" className="h-8 font-mono" maxLength={16}/>
                                    </div>
                                )}
                                <div>
                                    <Label className="text-xs">NPWP</Label>
                                    <Input {...register("npwp")} placeholder="15/16 digit NPWP" className="h-8 font-mono"/>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* --- TAB 2: JABATAN & UNIT KERJA --- */}
                    <TabsContent value="jabatan" className="space-y-4">
                        <div>
                            <Label className="text-xs">Jabatan Struktural Utama *</Label>
                            {/* This could be a dropdown from Master Jabatan in future */}
                            <Input {...register("jabatan", { required: true })} placeholder="Contoh: Kepala Biro Umum" className="h-8"/>
                        </div>

                        <Separator className="my-2"/>
                        <Label className="text-xs font-bold text-slate-500">Unit Kerja (Struktur Organisasi Bertingkat)</Label>
                        
                        <div className="grid grid-cols-1 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                            {/* Eselon I */}
                            <div className="grid grid-cols-2 gap-3 items-center">
                                <Label className="text-[10px] text-slate-500">Unit Eselon I</Label>
                                <select 
                                    {...register("eselon1")} 
                                    className="w-full h-8 border rounded px-2 text-xs bg-white"
                                    onChange={(e) => {
                                        setValue('eselon1', e.target.value);
                                        setValue('eselon2', '');
                                        setValue('eselon3', '');
                                        setValue('eselon4', '');
                                        setValue('eselon5', '');
                                    }}
                                >
                                    <option value="">-- Pilih Eselon I --</option>
                                    {optEselon1.map(u => <option key={u.id} value={u.nama_unit}>{u.nama_unit}</option>)}
                                </select>
                            </div>

                            {/* Eselon II */}
                            <div className="grid grid-cols-2 gap-3 items-center">
                                <Label className="text-[10px] text-slate-500">Unit Eselon II</Label>
                                <select 
                                    {...register("eselon2")} 
                                    disabled={!watchEselon1}
                                    className="w-full h-8 border rounded px-2 text-xs bg-white disabled:bg-slate-100"
                                    onChange={(e) => {
                                        setValue('eselon2', e.target.value);
                                        setValue('eselon3', '');
                                        setValue('eselon4', '');
                                        setValue('eselon5', '');
                                    }}
                                >
                                    <option value="">-- Pilih Eselon II --</option>
                                    {optEselon2.map(u => <option key={u.id} value={u.nama_unit}>{u.nama_unit}</option>)}
                                </select>
                            </div>

                            {/* Eselon III */}
                            <div className="grid grid-cols-2 gap-3 items-center">
                                <Label className="text-[10px] text-slate-500">Unit Eselon III</Label>
                                <select 
                                    {...register("eselon3")} 
                                    disabled={!watchEselon2}
                                    className="w-full h-8 border rounded px-2 text-xs bg-white disabled:bg-slate-100"
                                    onChange={(e) => {
                                        setValue('eselon3', e.target.value);
                                        setValue('eselon4', '');
                                        setValue('eselon5', '');
                                    }}
                                >
                                    <option value="">-- Pilih Eselon III --</option>
                                    {optEselon3.map(u => <option key={u.id} value={u.nama_unit}>{u.nama_unit}</option>)}
                                </select>
                            </div>

                            {/* Eselon IV */}
                            <div className="grid grid-cols-2 gap-3 items-center">
                                <Label className="text-[10px] text-slate-500">Unit Eselon IV</Label>
                                <select 
                                    {...register("eselon4")} 
                                    disabled={!watchEselon3}
                                    className="w-full h-8 border rounded px-2 text-xs bg-white disabled:bg-slate-100"
                                    onChange={(e) => {
                                        setValue('eselon4', e.target.value);
                                        setValue('eselon5', '');
                                    }}
                                >
                                    <option value="">-- Pilih Eselon IV --</option>
                                    {optEselon4.map(u => <option key={u.id} value={u.nama_unit}>{u.nama_unit}</option>)}
                                </select>
                            </div>

                            {/* Eselon V */}
                            <div className="grid grid-cols-2 gap-3 items-center">
                                <Label className="text-[10px] text-slate-500">Unit Eselon V</Label>
                                <select 
                                    {...register("eselon5")} 
                                    disabled={!watchEselon4}
                                    className="w-full h-8 border rounded px-2 text-xs bg-white disabled:bg-slate-100"
                                >
                                    <option value="">-- Pilih Eselon V --</option>
                                    {optEselon5.map(u => <option key={u.id} value={u.nama_unit}>{u.nama_unit}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <Label className="text-xs">Jabatan Fungsional Melekat</Label>
                            <Input {...register("jabatan_melekat")} placeholder="Contoh: PPK, Bendahara (Pisahkan dengan koma)" className="h-8"/>
                        </div>
                    </TabsContent>

                    {/* --- TAB 3: ATRIBUT & STATUS --- */}
                    <TabsContent value="status" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Status Kepegawaian</Label>
                                <select {...register("status_kepegawaian")} className="w-full h-8 border rounded px-2 text-sm bg-white">
                                    <option value="PNS">PNS</option>
                                    <option value="PPPK">PPPK</option>
                                    <option value="TNI">TNI</option>
                                    <option value="POLRI">POLRI</option>
                                    <option value="Non-ASN">Non-ASN / Honorer</option>
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs">Status Penempatan</Label>
                                <select {...register("status_penempatan")} className="w-full h-8 border rounded px-2 text-sm bg-white">
                                    <option value="Definitif">Definitif (Menetap)</option>
                                    <option value="Mutasi">Mutasi Antar Instansi</option>
                                    <option value="Penugasan">Penugasan (Sementara)</option>
                                </select>
                            </div>
                        </div>

                        {statusPenempatan === 'Penugasan' && (
                            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[10px] text-yellow-800">Instansi Asal</Label>
                                    <Input {...register("instansi_asal")} placeholder="Asal Instansi..." className="h-7 text-xs"/>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-yellow-800">Masa Penugasan Berakhir</Label>
                                    <Input type="date" {...register("masa_penugasan_end")} className="h-7 text-xs"/>
                                </div>
                            </div>
                        )}

                        {isNonASN ? (
                            <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                                <Label className="text-xs font-bold text-slate-700 flex items-center"><Info size={12} className="mr-1"/> Detail Non-ASN</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-[10px]">Jenis</Label>
                                        <select {...register("jenis_non_asn")} className="w-full h-8 border rounded px-2 text-xs">
                                            <option value="Kontrak">Kontrak</option>
                                            <option value="Outsourcing">Outsourcing</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px]">Sub-Kategori</Label>
                                        <select {...register("sub_kategori_non_asn")} className="w-full h-8 border rounded px-2 text-xs">
                                            <option value="PPNPN">PPNPN</option>
                                            <option value="Konsultan Individu">Konsultan Individu</option>
                                            <option value="Tenaga Ahli">Tenaga Ahli</option>
                                            <option value="Teknisi">Teknisi</option>
                                            <option value="Pramubakti">Pramubakti</option>
                                            <option value="Satpam">Satpam</option>
                                            <option value="Supir">Supir</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-[10px]">Mulai Kontrak</Label>
                                        <Input type="date" {...register("tgl_mulai_kontrak")} className="h-8 text-xs"/>
                                    </div>
                                    <div>
                                        <Label className="text-[10px]">Selesai Kontrak</Label>
                                        <Input type="date" {...register("tgl_selesai_kontrak")} className="h-8 text-xs"/>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs">Pangkat / Golongan</Label>
                                    <select {...register("pangkat_golongan")} className="w-full h-8 border rounded px-2 text-sm bg-white">
                                        <option value="">-- Pilih Pangkat --</option>
                                        {(isTNI_POLRI ? (PANGKAT_GOLONGAN[statusKepegawaian] || []) : PANGKAT_GOLONGAN['ASN']).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
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
                        )}
                        
                        <div>
                            <Label className="text-xs">Status Sistem</Label>
                            <select {...register("status")} className="w-full h-8 border rounded px-2 text-sm bg-white font-bold text-blue-700">
                                <option value="AKTIF">AKTIF</option>
                                <option value="CUTI">CUTI</option>
                                <option value="TUGAS_BELAJAR">TUGAS BELAJAR</option>
                                <option value="KELUAR">KELUAR / PENSIUN</option>
                            </select>
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
