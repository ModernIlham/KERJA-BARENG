import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCw, Eye, CheckCircle, XCircle, Users, Clock, Calendar, FileText, DollarSign } from 'lucide-react';
import api from '../../../api/axios';
import { formatCurrency } from '../../../lib/utils';

const OvertimeBatchList = ({ refreshTrigger }) => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [userRole, setUserRole] = useState('user');

    useEffect(() => {
        fetchBatches();
        // Get user role from localStorage or context
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(user.role || 'user');
    }, [refreshTrigger]);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            let url = '/api/kepegawaian/overtime/batches';
            if (statusFilter !== 'all') {
                url += `?status=${statusFilter}`;
            }
            const res = await api.get(url);
            setBatches(res.data);
        } catch (e) {
            toast.error("Gagal memuat data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBatches();
    }, [statusFilter]);

    const viewDetail = async (batch) => {
        try {
            const res = await api.get(`/api/kepegawaian/overtime/batch/${batch.id}`);
            setSelectedBatch(res.data);
            setDetailOpen(true);
        } catch (e) {
            toast.error("Gagal memuat detail");
        }
    };

    const handleApproveReject = async (batchId, action) => {
        try {
            await api.patch(`/api/kepegawaian/overtime/batch/${batchId}/${action}`);
            toast.success(action === 'approve' ? 'Lembur disetujui' : 'Lembur ditolak');
            fetchBatches();
            setDetailOpen(false);
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal memproses");
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            'Pending': { variant: 'outline', className: 'border-yellow-500 text-yellow-700 bg-yellow-50' },
            'Approved': { variant: 'outline', className: 'border-green-500 text-green-700 bg-green-50' },
            'Rejected': { variant: 'outline', className: 'border-red-500 text-red-700 bg-red-50' }
        };
        const c = config[status] || config['Pending'];
        return <Badge variant={c.variant} className={c.className}>{status}</Badge>;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    return (
        <>
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Daftar Pengajuan Lembur (SPL)
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Approved">Disetujui</SelectItem>
                                <SelectItem value="Rejected">Ditolak</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={fetchBatches}>
                            <RefreshCw size={16} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Memuat...</div>
                    ) : batches.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            Belum ada pengajuan lembur
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {batches.map(batch => (
                                <div 
                                    key={batch.id}
                                    className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-bold text-blue-700">{batch.nomor_spl}</span>
                                                {getStatusBadge(batch.status)}
                                                {batch.is_holiday && (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 text-[10px]">
                                                        Hari Libur
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">{batch.description}</p>
                                            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(batch.date)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {batch.start_time} - {batch.end_time} ({batch.duration_hours} jam)
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {batch.participant_count} orang
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    {formatCurrency(batch.total_net)}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs text-slate-400">
                                                Dibuat oleh: {batch.creator_name}
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => viewDetail(batch)}>
                                            <Eye className="w-4 h-4 mr-1" /> Detail
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Detail SPL: {selectedBatch?.nomor_spl}
                            {selectedBatch && getStatusBadge(selectedBatch.status)}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedBatch && (
                        <div className="space-y-4">
                            {/* Info Section */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <span className="text-xs text-slate-500">Tanggal Lembur</span>
                                    <div className="font-medium">{formatDate(selectedBatch.date)}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500">Waktu</span>
                                    <div className="font-medium">{selectedBatch.start_time} - {selectedBatch.end_time} ({selectedBatch.duration_hours} jam)</div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500">Pembuat SPL</span>
                                    <div className="font-medium">{selectedBatch.creator_name}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500">Jenis Hari</span>
                                    <div className="font-medium">{selectedBatch.is_holiday ? 'Hari Libur' : 'Hari Kerja'}</div>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs text-slate-500">Deskripsi Kegiatan</span>
                                <div className="p-3 bg-slate-50 rounded-lg mt-1">{selectedBatch.description}</div>
                            </div>

                            {/* Participants Table */}
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Daftar Peserta ({selectedBatch.records?.length || 0} orang)
                                </h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100">
                                            <tr>
                                                <th className="text-left p-2 font-medium">No</th>
                                                <th className="text-left p-2 font-medium">Nama</th>
                                                <th className="text-left p-2 font-medium">NIP</th>
                                                <th className="text-left p-2 font-medium">Tipe</th>
                                                <th className="text-right p-2 font-medium">Jam</th>
                                                <th className="text-right p-2 font-medium">Bruto</th>
                                                <th className="text-right p-2 font-medium">Pajak</th>
                                                <th className="text-right p-2 font-medium">Neto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {selectedBatch.records?.map((rec, idx) => (
                                                <tr key={rec.id || idx} className="hover:bg-slate-50">
                                                    <td className="p-2">{idx + 1}</td>
                                                    <td className="p-2">{rec.nama_lengkap}</td>
                                                    <td className="p-2 text-xs">{rec.nip || '-'}</td>
                                                    <td className="p-2">
                                                        <Badge variant="outline" className={rec.employee_type === 'ASN' ? 'text-blue-700' : 'text-orange-700'}>
                                                            {rec.employee_type}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-2 text-right">{rec.duration_hours}</td>
                                                    <td className="p-2 text-right text-xs">{formatCurrency(rec.gross_pay)}</td>
                                                    <td className="p-2 text-right text-xs">{formatCurrency(rec.tax_amount)}</td>
                                                    <td className="p-2 text-right font-medium">{formatCurrency(rec.net_pay)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-green-50 font-semibold">
                                            <tr>
                                                <td colSpan={5} className="p-2 text-right">TOTAL:</td>
                                                <td className="p-2 text-right">{formatCurrency(selectedBatch.total_gross)}</td>
                                                <td className="p-2 text-right">{formatCurrency(selectedBatch.total_tax)}</td>
                                                <td className="p-2 text-right">{formatCurrency(selectedBatch.total_net)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Approval Actions */}
                            {userRole === 'admin' && selectedBatch.status === 'Pending' && (
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    <Button 
                                        variant="outline" 
                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                        onClick={() => handleApproveReject(selectedBatch.id, 'reject')}
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Tolak
                                    </Button>
                                    <Button 
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleApproveReject(selectedBatch.id, 'approve')}
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Setujui
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default OvertimeBatchList;
