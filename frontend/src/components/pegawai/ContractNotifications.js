import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { AlertTriangle, Clock, FileText, Package, RefreshCw, Calendar, Building2, User, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function ContractNotifications({ onRefresh }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ critical: 0, high: 0, medium: 0 });
    
    // Renew Contract Dialog
    const [showRenewDialog, setShowRenewDialog] = useState(false);
    const [selectedPegawai, setSelectedPegawai] = useState(null);
    const [renewForm, setRenewForm] = useState({
        nomor_kontrak: '',
        tgl_mulai: '',
        tgl_selesai: '',
        keterangan: ''
    });
    const [renewing, setRenewing] = useState(false);
    
    // Contract History Dialog
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);
    const [contractHistory, setContractHistory] = useState(null);
    
    // Assets Dialog
    const [showAssetsDialog, setShowAssetsDialog] = useState(false);
    const [pegawaiAssets, setPegawaiAssets] = useState(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/pegawai/notifications/expiring');
            setNotifications(res.data.notifications || []);
            setStats({
                critical: res.data.critical || 0,
                high: res.data.high || 0,
                medium: res.data.medium || 0
            });
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        } finally {
            setLoading(false);
        }
    };

    const openRenewDialog = (notif) => {
        setSelectedPegawai(notif);
        setRenewForm({
            nomor_kontrak: '',
            tgl_mulai: new Date().toISOString().split('T')[0],
            tgl_selesai: '',
            keterangan: ''
        });
        setShowRenewDialog(true);
    };

    const handleRenewContract = async () => {
        if (!renewForm.nomor_kontrak || !renewForm.tgl_mulai || !renewForm.tgl_selesai) {
            toast.error('Mohon lengkapi semua field');
            return;
        }

        setRenewing(true);
        try {
            const formData = new FormData();
            formData.append('nomor_kontrak', renewForm.nomor_kontrak);
            formData.append('tgl_mulai', renewForm.tgl_mulai);
            formData.append('tgl_selesai', renewForm.tgl_selesai);
            formData.append('keterangan', renewForm.keterangan);

            await api.post(`/api/pegawai/${selectedPegawai.pegawai_id}/renew-contract`, formData);
            toast.success('Kontrak berhasil diperpanjang');
            setShowRenewDialog(false);
            fetchNotifications();
            if (onRefresh) onRefresh();
        } catch (e) {
            toast.error('Gagal memperpanjang kontrak');
        } finally {
            setRenewing(false);
        }
    };

    const viewContractHistory = async (pegawaiId) => {
        try {
            const res = await api.get(`/api/pegawai/${pegawaiId}/contract-history`);
            setContractHistory(res.data);
            setShowHistoryDialog(true);
        } catch (e) {
            toast.error('Gagal memuat riwayat kontrak');
        }
    };

    const viewPegawaiAssets = async (notif) => {
        try {
            const res = await api.get(`/api/pegawai/${notif.pegawai_id}/assets`);
            setPegawaiAssets({ ...res.data, pegawai: notif });
            setShowAssetsDialog(true);
        } catch (e) {
            toast.error('Gagal memuat data aset');
        }
    };

    const getUrgencyColor = (urgency) => {
        switch (urgency) {
            case 'critical': return 'bg-red-100 border-red-300 text-red-800';
            case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
            case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
            default: return 'bg-slate-100 border-slate-300 text-slate-800';
        }
    };

    const getUrgencyBadge = (urgency) => {
        switch (urgency) {
            case 'critical': return <Badge className="bg-red-500 text-white text-[10px]">KRITIS</Badge>;
            case 'high': return <Badge className="bg-orange-500 text-white text-[10px]">PENTING</Badge>;
            case 'medium': return <Badge className="bg-yellow-500 text-white text-[10px]">PERHATIAN</Badge>;
            default: return null;
        }
    };

    if (loading) {
        return (
            <Card className="border-slate-200">
                <CardContent className="p-6 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Memuat notifikasi...
                </CardContent>
            </Card>
        );
    }

    if (notifications.length === 0) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6 text-center text-green-700">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="font-medium">Tidak ada kontrak yang akan berakhir dalam 30 hari ke depan</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Notifikasi Kontrak & Penugasan
                        </CardTitle>
                        <div className="flex gap-2">
                            {stats.critical > 0 && <Badge className="bg-red-500">{stats.critical} Kritis</Badge>}
                            {stats.high > 0 && <Badge className="bg-orange-500">{stats.high} Penting</Badge>}
                            {stats.medium > 0 && <Badge className="bg-yellow-500">{stats.medium} Perhatian</Badge>}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <ScrollArea className="max-h-[400px]">
                        <div className="space-y-2">
                            {notifications.map((notif, idx) => (
                                <div 
                                    key={idx} 
                                    className={`p-3 rounded-lg border ${getUrgencyColor(notif.urgency)}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getUrgencyBadge(notif.urgency)}
                                                <span className="font-semibold">{notif.pegawai_nama}</span>
                                                <span className="text-xs opacity-75">({notif.nip || '-'})</span>
                                            </div>
                                            <p className="text-sm">{notif.message}</p>
                                            <div className="flex items-center gap-3 mt-2 text-xs opacity-75">
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {notif.status_kepegawaian}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {notif.end_date}
                                                </span>
                                                {notif.has_assets && (
                                                    <span className="flex items-center gap-1 text-red-600 font-medium">
                                                        <Package className="h-3 w-3" />
                                                        {notif.asset_count} Aset
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {notif.type === 'contract_expiring' && (
                                                <Button 
                                                    size="sm" 
                                                    className="text-xs h-7 bg-green-600 hover:bg-green-700"
                                                    onClick={() => openRenewDialog(notif)}
                                                >
                                                    <RefreshCw className="h-3 w-3 mr-1" />
                                                    Perpanjang
                                                </Button>
                                            )}
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="text-xs h-7"
                                                onClick={() => viewContractHistory(notif.pegawai_id)}
                                            >
                                                <FileText className="h-3 w-3 mr-1" />
                                                Riwayat
                                            </Button>
                                            {notif.has_assets && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="text-xs h-7 border-red-300 text-red-600 hover:bg-red-50"
                                                    onClick={() => viewPegawaiAssets(notif)}
                                                >
                                                    <Package className="h-3 w-3 mr-1" />
                                                    Cek Aset
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Renew Contract Dialog */}
            <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Perpanjang Kontrak</DialogTitle>
                    </DialogHeader>
                    {selectedPegawai && (
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="font-semibold">{selectedPegawai.pegawai_nama}</p>
                                <p className="text-sm text-slate-500">{selectedPegawai.nip || '-'}</p>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <Label>Nomor Kontrak Baru *</Label>
                                    <Input
                                        value={renewForm.nomor_kontrak}
                                        onChange={(e) => setRenewForm({...renewForm, nomor_kontrak: e.target.value})}
                                        placeholder="001/KONTRAK/2025"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label>Tanggal Mulai *</Label>
                                        <Input
                                            type="date"
                                            value={renewForm.tgl_mulai}
                                            onChange={(e) => setRenewForm({...renewForm, tgl_mulai: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <Label>Tanggal Selesai *</Label>
                                        <Input
                                            type="date"
                                            value={renewForm.tgl_selesai}
                                            onChange={(e) => setRenewForm({...renewForm, tgl_selesai: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>Keterangan</Label>
                                    <Input
                                        value={renewForm.keterangan}
                                        onChange={(e) => setRenewForm({...renewForm, keterangan: e.target.value})}
                                        placeholder="Catatan tambahan..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRenewDialog(false)}>Batal</Button>
                        <Button onClick={handleRenewContract} disabled={renewing} className="bg-green-600 hover:bg-green-700">
                            {renewing ? 'Menyimpan...' : 'Simpan Perpanjangan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Contract History Dialog */}
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Riwayat Kontrak</DialogTitle>
                    </DialogHeader>
                    {contractHistory && (
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="font-semibold">{contractHistory.nama}</p>
                                <p className="text-sm text-slate-500">Total perpanjangan: {contractHistory.total_renewals}x</p>
                            </div>
                            
                            {/* Current Contract */}
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-green-500">Kontrak Aktif</Badge>
                                </div>
                                <p className="font-medium">{contractHistory.current_contract.nomor_kontrak || '-'}</p>
                                <p className="text-sm text-slate-600">
                                    {contractHistory.current_contract.tgl_mulai || '-'} s/d {contractHistory.current_contract.tgl_selesai || '-'}
                                </p>
                            </div>
                            
                            {/* History */}
                            {contractHistory.history.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2 text-sm text-slate-600">Kontrak Sebelumnya</h4>
                                    <ScrollArea className="max-h-[200px]">
                                        <div className="space-y-2">
                                            {contractHistory.history.slice().reverse().map((h, idx) => (
                                                <div key={idx} className="p-2 bg-slate-50 rounded border text-sm">
                                                    <p className="font-medium">{h.nomor_kontrak || '-'}</p>
                                                    <p className="text-slate-500 text-xs">
                                                        {h.tgl_mulai || '-'} s/d {h.tgl_selesai || '-'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setShowHistoryDialog(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assets Dialog */}
            <Dialog open={showAssetsDialog} onOpenChange={setShowAssetsDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-amber-500" />
                            Aset yang Dipegang
                        </DialogTitle>
                    </DialogHeader>
                    {pegawaiAssets && (
                        <div className="space-y-4">
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="font-semibold">{pegawaiAssets.nama}</p>
                                <p className="text-sm text-amber-700">
                                    ⚠️ Pegawai ini memegang {pegawaiAssets.total_assets} aset yang harus dikembalikan/diserahterimakan
                                </p>
                            </div>
                            
                            <ScrollArea className="max-h-[300px]">
                                <div className="space-y-2">
                                    {pegawaiAssets.assets.map((asset, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border flex items-center gap-3">
                                            <div className="p-2 bg-slate-200 rounded">
                                                <Package className="h-4 w-4 text-slate-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{asset.nama_aset}</p>
                                                <p className="text-xs text-slate-500">
                                                    {asset.kode_aset || '-'} | {asset.kategori || '-'}
                                                </p>
                                            </div>
                                            <Badge variant="outline">{asset.kondisi || 'Baik'}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                <strong>Perhatian:</strong> Pastikan semua aset telah dikembalikan atau diserahterimakan sebelum kontrak berakhir.
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setShowAssetsDialog(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
