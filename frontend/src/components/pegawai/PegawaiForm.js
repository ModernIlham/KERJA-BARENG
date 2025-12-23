import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { User, Briefcase, BadgeCheck, Phone, Info, Building2, Calendar, CreditCard } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'sonner';
import PegawaiPhotoUpload from './PegawaiPhotoUpload';

// === REFERENCE DATA (Sama dengan template Excel) ===
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
        "Komisaris Polisi", "Ajun Komisaris Besar Polisi", "Komisaris Besar Polisi"
    ]
};

const STATUS_KEPEGAWAIAN = ["PNS", "CPNS", "PPPK", "TNI", "POLRI", "Non-ASN", "Honorer"];
const JENIS_KELAMIN = ["Laki-laki", "Perempuan"];
const AGAMA = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"];
const STATUS_PERKAWINAN = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];
const PENDIDIKAN = ["SD", "SMP", "SMA/SMK", "D1", "D2", "D3", "D4/S1", "S2", "S3"];
const KEWARGANEGARAAN = ["WNI", "WNA"];
const STATUS_AKTIF = ["AKTIF", "CUTI", "TUGAS_BELAJAR", "KELUAR", "PENSIUN", "MUTASI KELUAR", "MENINGGAL"];
const NAMA_BANK = ["BRI", "BNI", "Mandiri", "BTN", "Bank Syariah Indonesia (BSI)", "BCA", "CIMB Niaga", "Danamon", "Permata", "OCBC NISP", "Maybank", "Lainnya"];
const JENIS_NON_ASN = ["Kontrak", "Outsourcing"];
const SUB_KATEGORI_NON_ASN = ["PPNPN", "Konsultan Individu", "Tenaga Ahli", "Teknisi", "Pramubakti", "Satpam", "Supir", "Magang"];
const STATUS_PENEMPATAN = ["Definitif", "Mutasi", "Penugasan"];
const STATUS_JABATAN = ["Definitif", "Plt", "Plh", "Pj", "Pjs"];
const JENIS_IDENTITAS_WNA = ["PASPOR", "KITAS", "KITAP"];
const KATEGORI_PEGAWAI = ["Struktural", "Fungsional", "Pelaksana"];

export default function PegawaiForm({ initialData, onSuccess, onClose }) {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        defaultValues: initialData || {
            kewarganegaraan: 'WNI',
            status_kepegawaian: 'PNS',
            status: 'AKTIF',
            jenis_non_asn: 'Kontrak',
            status_penempatan: 'Definitif',
            status_jabatan: 'Definitif'
        }
    });

    // Watchers
    const kewarganegaraan = watch('kewarganegaraan');
    const statusKepegawaian = watch('status_kepegawaian');
    const jenisNonAsn = watch('jenis_non_asn');
    const statusPenempatan = watch('status_penempatan');
    const kategoriPegawai = watch('kategori_pegawai');

    // Unit Watchers
    const watchEselon1 = watch('eselon1');
    const watchEselon2 = watch('eselon2');
    const watchEselon3 = watch('eselon3');
    const watchEselon4 = watch('eselon4');

    // States
    const [units, setUnits] = useState([]);
    const [banks, setBanks] = useState([]);
    const [optEselon1, setOptEselon1] = useState([]);
    const [optEselon2, setOptEselon2] = useState([]);
    const [optEselon3, setOptEselon3] = useState([]);
    const [optEselon4, setOptEselon4] = useState([]);
    const [optEselon5, setOptEselon5] = useState([]);

    // Derived States
    const isWNI = kewarganegaraan === 'WNI';
    const isASN = ['PNS', 'CPNS', 'PPPK'].includes(statusKepegawaian);
    const isTNI_POLRI = ['TNI', 'POLRI'].includes(statusKepegawaian);
    const isNonASN = ['Non-ASN', 'Honorer'].includes(statusKepegawaian);
    const isPenugasan = statusPenempatan === 'Penugasan';

    useEffect(() => { 
        fetchUnits(); 
        fetchBanks();
    }, []);

    const fetchUnits = async () => {
        try {
            const res = await api.get('/api/settings/unit-kerja');
            setUnits(res.data);
            setOptEselon1(res.data.filter(u => u.eselon === "1"));
        } catch (e) { console.error(e); }
    };

    const fetchBanks = async () => {
        try {
            const res = await api.get('/api/settings/banks');
            setBanks(res.data.map(b => b.nama_bank));
        } catch (e) { 
            // Fallback to default
            setBanks(["BRI", "BNI", "Mandiri", "BTN", "Bank Syariah Indonesia (BSI)", "BCA", "CIMB Niaga", "Danamon", "Permata", "OCBC NISP", "Maybank", "Lainnya"]);
        }
    };

    // Cascading Dropdowns
    useEffect(() => {
        if (!watchEselon1) { setOptEselon2([]); return; }
        const parent = units.find(u => u.nama_unit === watchEselon1 && u.eselon === "1");
        setOptEselon2(parent ? units.filter(u => u.parent_id === parent.id && u.eselon === "2") : []);
    }, [watchEselon1, units]);

    useEffect(() => {
        if (!watchEselon2) { setOptEselon3([]); return; }
        const parent = units.find(u => u.nama_unit === watchEselon2 && u.eselon === "2");
        setOptEselon3(parent ? units.filter(u => u.parent_id === parent.id && u.eselon === "3") : []);
    }, [watchEselon2, units]);

    useEffect(() => {
        if (!watchEselon3) { setOptEselon4([]); return; }
        const parent = units.find(u => u.nama_unit === watchEselon3 && u.eselon === "3");
        setOptEselon4(parent ? units.filter(u => u.parent_id === parent.id && u.eselon === "4") : []);
    }, [watchEselon3, units]);

    useEffect(() => {
        if (!watchEselon4) { setOptEselon5([]); return; }
        const parent = units.find(u => u.nama_unit === watchEselon4 && u.eselon === "4");
        setOptEselon5(parent ? units.filter(u => u.parent_id === parent.id && u.eselon === "5") : []);
    }, [watchEselon4, units]);

    useEffect(() => {
        if (initialData) {
            Object.keys(initialData).forEach(key => setValue(key, initialData[key]));
        }
    }, [initialData, setValue]);

    const onSubmit = async (data) => {
        try {
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

    // Helper: Render Select
    const renderSelect = (name, label, options, placeholder = "Pilih...") => (
        <div className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <select {...register(name)} className="w-full h-9 border rounded px-2 text-sm bg-white">
                <option value="">{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );

    // Helper: Render Input
    const renderInput = (name, label, type = "text", placeholder = "") => (
        <div className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <Input {...register(name)} type={type} placeholder={placeholder} className="h-9" />
        </div>
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="identitas" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-slate-100 h-auto">
                    <TabsTrigger value="identitas" className="text-[11px] py-2"><User size={12} className="mr-1"/> Identitas</TabsTrigger>
                    <TabsTrigger value="pribadi" className="text-[11px] py-2"><Info size={12} className="mr-1"/> Pribadi</TabsTrigger>
                    <TabsTrigger value="kepegawaian" className="text-[11px] py-2"><BadgeCheck size={12} className="mr-1"/> Kepegawaian</TabsTrigger>
                    <TabsTrigger value="jabatan" className="text-[11px] py-2"><Building2 size={12} className="mr-1"/> Jabatan</TabsTrigger>
                    <TabsTrigger value="kontak" className="text-[11px] py-2"><Phone size={12} className="mr-1"/> Kontak</TabsTrigger>
                </TabsList>

                {/* ========== TAB 1: IDENTITAS UTAMA ========== */}
                <TabsContent value="identitas" className="space-y-4 mt-4">
                    {/* Photo Upload */}
                    <div className="flex justify-center mb-4">
                        {initialData ? (
                            <PegawaiPhotoUpload pegawai={initialData} onSuccess={onSuccess} />
                        ) : (
                            <div className="text-center p-4 bg-slate-50 rounded border border-dashed text-slate-400 text-xs w-40">
                                Simpan dulu untuk upload foto
                            </div>
                        )}
                    </div>

                    {/* Nama & Gelar */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Gelar Depan</Label>
                            <Input {...register("gelar_depan")} placeholder="Dr." className="h-9" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Nama Lengkap <span className="text-red-500">*</span></Label>
                            <Input {...register("nama_lengkap", { required: true })} className="h-9" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Gelar Belakang</Label>
                            <Input {...register("gelar_belakang")} placeholder="S.E., M.M." className="h-9" />
                        </div>
                    </div>

                    <Separator />

                    {/* Kewarganegaraan */}
                    <div className="grid grid-cols-2 gap-3">
                        {renderSelect("kewarganegaraan", "Kewarganegaraan", KEWARGANEGARAAN)}
                    </div>

                    {/* WNI Fields */}
                    {isWNI && (
                        <div className="space-y-3 p-3 bg-blue-50 rounded border border-blue-200">
                            <h4 className="text-xs font-bold text-blue-800">Identitas WNI</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {(isASN) && renderInput("nip", "NIP (18 digit)", "text", "198001012005011001")}
                                {(isTNI_POLRI) && renderInput("nrp", "NRP", "text", "Nomor Registrasi Pokok")}
                                {renderInput("nik", "NIK (16 digit)", "text", "3201010101010001")}
                                {renderInput("npwp", "NPWP", "text", "12.345.678.9-012.000")}
                            </div>
                        </div>
                    )}

                    {/* WNA Fields */}
                    {!isWNI && (
                        <div className="space-y-3 p-3 bg-orange-50 rounded border border-orange-200">
                            <h4 className="text-xs font-bold text-orange-800">Identitas WNA</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {renderSelect("jenis_identitas_wna", "Jenis Identitas", JENIS_IDENTITAS_WNA)}
                                {renderInput("nomor_identitas_wna", "Nomor Identitas", "text", "Nomor PASPOR/KITAS/KITAP")}
                                {renderInput("npwp", "NPWP (opsional)", "text")}
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* ========== TAB 2: DATA PRIBADI ========== */}
                <TabsContent value="pribadi" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                        {renderSelect("jenis_kelamin", "Jenis Kelamin", JENIS_KELAMIN)}
                        {renderSelect("agama", "Agama", AGAMA)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {renderInput("tempat_lahir", "Tempat Lahir", "text", "Jakarta")}
                        {renderInput("tanggal_lahir", "Tanggal Lahir", "date")}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {renderSelect("status_perkawinan", "Status Perkawinan", STATUS_PERKAWINAN)}
                        {renderSelect("pendidikan_terakhir", "Pendidikan Terakhir", PENDIDIKAN)}
                    </div>
                </TabsContent>

                {/* ========== TAB 3: STATUS KEPEGAWAIAN ========== */}
                <TabsContent value="kepegawaian" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                        {renderSelect("status_kepegawaian", "Status Kepegawaian", STATUS_KEPEGAWAIAN)}
                        
                        {/* Pangkat/Golongan berdasarkan status */}
                        <div className="space-y-1">
                            <Label className="text-xs">Pangkat/Golongan</Label>
                            <select {...register("pangkat_golongan")} className="w-full h-9 border rounded px-2 text-sm bg-white">
                                <option value="">Pilih Pangkat...</option>
                                {(PANGKAT_GOLONGAN[statusKepegawaian] || PANGKAT_GOLONGAN['ASN']).map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {renderSelect("status_penempatan", "Status Penempatan", STATUS_PENEMPATAN)}
                        {renderSelect("status_jabatan", "Status Jabatan", STATUS_JABATAN)}
                    </div>

                    {/* Penugasan Fields */}
                    {isPenugasan && (
                        <div className="p-3 bg-purple-50 rounded border border-purple-200 space-y-3">
                            <h4 className="text-xs font-bold text-purple-800">Detail Penugasan</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {renderInput("instansi_asal", "Instansi Asal", "text", "Nama instansi asal")}
                                {renderInput("masa_penugasan_end", "Masa Penugasan Berakhir", "date")}
                            </div>
                        </div>
                    )}

                    {/* Non-ASN Fields */}
                    {isNonASN && (
                        <div className="p-3 bg-green-50 rounded border border-green-200 space-y-3">
                            <h4 className="text-xs font-bold text-green-800">Detail Non-ASN</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {renderSelect("jenis_non_asn", "Jenis Non-ASN", JENIS_NON_ASN)}
                                {renderSelect("sub_kategori_non_asn", "Sub-Kategori", SUB_KATEGORI_NON_ASN)}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {renderInput("tgl_mulai_kontrak", "Tgl Mulai Kontrak", "date")}
                                {renderInput("tgl_selesai_kontrak", "Tgl Selesai Kontrak", "date")}
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* Status Sistem */}
                    <div className="grid grid-cols-2 gap-3">
                        {renderSelect("status", "Status Sistem", STATUS_AKTIF)}
                        {renderInput("keterangan", "Keterangan", "text", "Catatan tambahan...")}
                    </div>
                </TabsContent>

                {/* ========== TAB 4: JABATAN & UNIT KERJA ========== */}
                <TabsContent value="jabatan" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                        {renderInput("jabatan", "Jabatan Struktural", "text", "Kepala Seksi Umum")}
                        {renderInput("jabatan_melekat", "Jabatan Fungsional Melekat", "text", "PPK, Bendahara")}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {renderSelect("kategori_pegawai", "Kategori Pegawai", KATEGORI_PEGAWAI)}
                    </div>

                    {/* Pimpinan Checkbox */}
                    {kategoriPegawai === 'Struktural' && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                            <div className="flex gap-4 items-center">
                                <div className="flex items-center space-x-2">
                                    <input type="checkbox" {...register("is_pimpinan_tertinggi")} id="chk_pimpinan" className="rounded" />
                                    <Label htmlFor="chk_pimpinan" className="text-xs cursor-pointer">Pimpinan Tertinggi / Wakil</Label>
                                </div>
                                {watch('is_pimpinan_tertinggi') && (
                                    <select {...register("jenis_pimpinan")} className="h-7 border rounded px-2 text-xs bg-white">
                                        <option value="Kepala">Kepala</option>
                                        <option value="Wakil">Wakil Kepala</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* Unit Kerja (Eselon) */}
                    <h4 className="text-xs font-bold text-slate-700">Unit Kerja</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Eselon 1</Label>
                            <select {...register("eselon1")} className="w-full h-9 border rounded px-2 text-sm bg-white">
                                <option value="">Pilih Eselon 1...</option>
                                {optEselon1.map(u => <option key={u.id} value={u.nama_unit}>{u.nama_unit}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Eselon 2</Label>
                            <select {...register("eselon2")} className="w-full h-9 border rounded px-2 text-sm bg-white" disabled={!watchEselon1}>
                                <option value="">Pilih Eselon 2...</option>
                                {optEselon2.map(u => <option key={u.id} value={u.nama_unit}>{u.nama_unit}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Eselon 3</Label>
                            <select {...register("eselon3")} className="w-full h-9 border rounded px-2 text-sm bg-white" disabled={!watchEselon2}>
                                <option value="">Pilih Eselon 3...</option>
                                {optEselon3.map(u => <option key={u.id} value={u.nama_unit}>{u.nama_unit}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Eselon 4</Label>
                            <select {...register("eselon4")} className="w-full h-9 border rounded px-2 text-sm bg-white" disabled={!watchEselon3}>
                                <option value="">Pilih Eselon 4...</option>
                                {optEselon4.map(u => <option key={u.id} value={u.nama_unit}>{u.nama_unit}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Eselon 5</Label>
                            <select {...register("eselon5")} className="w-full h-9 border rounded px-2 text-sm bg-white" disabled={!watchEselon4}>
                                <option value="">Pilih Eselon 5...</option>
                                {optEselon5.map(u => <option key={u.id} value={u.nama_unit}>{u.nama_unit}</option>)}
                            </select>
                        </div>
                    </div>
                </TabsContent>

                {/* ========== TAB 5: KONTAK & BANK ========== */}
                <TabsContent value="kontak" className="space-y-4 mt-4">
                    <h4 className="text-xs font-bold text-slate-700">Informasi Kontak</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {renderInput("no_telp", "No Telepon", "tel", "08123456789")}
                        {renderInput("email", "Email", "email", "nama@example.com")}
                    </div>

                    <Separator />

                    <h4 className="text-xs font-bold text-slate-700">Informasi Rekening Bank</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {renderSelect("nama_bank", "Nama Bank", banks.length > 0 ? banks : NAMA_BANK)}
                        {renderInput("no_rekening", "No Rekening", "text", "1234567890")}
                    </div>
                </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {initialData ? "Simpan Perubahan" : "Tambah Pegawai"}
                </Button>
            </DialogFooter>
        </form>
    );
}
