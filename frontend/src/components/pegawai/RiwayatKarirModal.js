import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Loader2, History, Briefcase } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function RiwayatKarirModal({ isOpen, onClose, pegawai }) {
    if (!pegawai) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-slate-500"/>
                        Riwayat Karir & Mutasi
                    </DialogTitle>
                    <DialogDescription>
                        Perjalanan karir <strong>{pegawai.nama_lengkap}</strong> (NIP: {pegawai.nip})
                    </DialogDescription>
                </DialogHeader>

                <div className="relative border-l border-slate-200 ml-3 space-y-8 py-4">
                    {/* Current Position (Top) */}
                    <div className="relative pl-8">
                        <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-green-500 ring-4 ring-white" />
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">{pegawai.jabatan}</h3>
                                <p className="text-xs text-slate-600">{pegawai.eselon1} / {pegawai.eselon2}</p>
                                <div className="mt-1 flex gap-2">
                                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Saat Ini</Badge>
                                    {pegawai.pangkat_golongan && <Badge variant="secondary" className="text-[10px]">{pegawai.pangkat_golongan}</Badge>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* History Items */}
                    {pegawai.riwayat_karir && pegawai.riwayat_karir.length > 0 ? (
                        [...pegawai.riwayat_karir].reverse().map((item, idx) => (
                            <div key={idx} className="relative pl-8">
                                <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-slate-200 ring-4 ring-white" />
                                <div className="flex flex-col gap-1 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{item.jenis}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {item.tanggal ? format(new Date(item.tanggal), 'dd MMMM yyyy', { locale: idLocale }) : '-'}
                                        </span>
                                    </div>
                                    
                                    <h4 className="text-sm font-bold text-slate-800 mt-1">{item.jabatan_baru || 'Jabatan Tidak Diketahui'}</h4>
                                    
                                    {item.unit_kerja_baru && (
                                        <p className="text-xs text-slate-600 flex items-center gap-1">
                                            <Briefcase size={12}/> {item.unit_kerja_baru}
                                        </p>
                                    )}
                                    
                                    {item.deskripsi && (
                                        <p className="text-xs text-slate-500 italic mt-1 border-t border-slate-200 pt-1">
                                            "{item.deskripsi}"
                                        </p>
                                    )}
                                    
                                    {item.sk_ref && (
                                        <div className="mt-1 text-[10px] text-slate-400">Ref SK: {item.sk_ref}</div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="relative pl-8 pb-4">
                            <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-slate-200 ring-4 ring-white" />
                            <p className="text-sm text-slate-400 italic">Belum ada riwayat tercatat.</p>
                        </div>
                    )}
                    
                    {/* Start Marker */}
                    <div className="relative pl-8">
                        <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-slate-300 ring-4 ring-white" />
                        <div className="text-xs text-slate-500 font-medium">Awal Terdaftar</div>
                        <div className="text-[10px] text-slate-400">{format(new Date(pegawai.created_at || new Date()), 'dd MMM yyyy')}</div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}