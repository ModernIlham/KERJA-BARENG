import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { RefreshCw, Eye, CheckCircle, XCircle, Users, Clock, Calendar, FileText, DollarSign, ChevronDown, ChevronRight, Sun, Moon, CalendarRange } from 'lucide-react';
import api from '../../../api/axios';
import { formatCurrency } from '../../../lib/utils';

const OvertimeBatchList = ({ refreshTrigger }) => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [userRole, setUserRole] = useState('user');
    const [expandedDates, setExpandedDates] = useState({});

    useEffect(() => {
        fetchBatches();
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
            // Expand first date by default
            if (res.data.records_by_date && Object.keys(res.data.records_by_date).length > 0) {
                setExpandedDates({ [Object.keys(res.data.records_by_date)[0]]: true });
            }
        } catch (e) {
            toast.error("Gagal memuat detail");
        }
    };

    const handleApproveReject = async (batchId, action) => {
        try {
            await api.patch(`/api/kepegawaian/overtime/batch/${batchId}/${action}`);
            toast.success(action === 'approve' ? 'Lembur disetujui' : 'Lembur ditolak');
            fetchBatches();
            // Refresh detail
            if (selectedBatch) {
                const res = await api.get(`/api/kepegawaian/overtime/batch/${batchId}`);
                setSelectedBatch(res.data);
            }
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal memproses");
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            'Pending': { variant: 'outline', className: 'border-yellow-500 text-yellow-700 bg-yellow-50' },
            'Approved': { variant: 'outline', className: 'border-green-500 text-green-700 bg-green-50' },
            'Rejected': { variant: 'outline', className: 'border-red-500 text-red-700 bg-red-50' },
            'Partial': { variant: 'outline', className: 'border-orange-500 text-orange-700 bg-orange-50' }
        };
        const c = config[status] || config['Pending'];
        return <Badge variant={c.variant} className={c.className}>{status}</Badge>;
    };

    const getRecordStatusBadge = (status) => {
        if (status === 'Approved') {
            return <Badge variant="outline" className="text-[10px] border-green-500 text-green-700 bg-green-50">✓</Badge>;
        } else if (status === 'Rejected') {
            return <Badge variant="outline" className="text-[10px] border-red-500 text-red-700 bg-red-50">✗ Ditolak</Badge>;
        }
        return <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-700 bg-yellow-50">Pending</Badge>;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const formatDateShort = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'short', day: 'numeric', month: 'short'
        });
    };

    const toggleDate = (date) => {
        setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
    };

    // Group records by date for display
    const groupRecordsByDate = (records) => {
        if (!records || records.length === 0) return {};
        
        const grouped = {};
        records.forEach(rec => {
            const date = rec.date;
            if (!grouped[date]) {
                grouped[date] = {
                    date,
                    is_holiday: rec.is_holiday,
                    records: [],
                    total_hours: 0,
                    total_gross: 0,
                    total_net: 0
                };
            }
            grouped[date].records.push(rec);
            grouped[date].total_hours += rec.duration_hours || 0;
            grouped[date].total_gross += rec.gross_pay || 0;
            grouped[date].total_net += rec.net_pay || 0;
        });
        
        // Sort by date
        return Object.keys(grouped)
            .sort()
            .reduce((obj, key) => {
                obj[key] = grouped[key];
                return obj;
            }, {});
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
                                            </div>
                                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">{batch.description}</p>
                                            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <CalendarRange className="w-3 h-3" />
                                                    {batch.start_date === batch.end_date 
                                                        ? formatDate(batch.start_date || batch.date)
                                                        : `${formatDateShort(batch.start_date)} - ${formatDateShort(batch.end_date)}`
                                                    }
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {batch.total_days || 1} hari
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {batch.total_participants || batch.participant_count} peserta
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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Detail SPL: {selectedBatch?.nomor_spl}
                            {selectedBatch && getStatusBadge(selectedBatch.status)}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedBatch && (
                        <div className="space-y-4">
                            {/* Info Section */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <span className="text-xs text-slate-500">Rentang Tanggal</span>
                                    <div className="font-medium text-sm">
                                        {selectedBatch.start_date === selectedBatch.end_date 
                                            ? formatDate(selectedBatch.start_date || selectedBatch.date)
                                            : `${formatDateShort(selectedBatch.start_date)} - ${formatDateShort(selectedBatch.end_date)}`
                                        }
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500">Total Hari</span>
                                    <div className="font-medium">{selectedBatch.total_days || 1} hari</div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500">Total Peserta</span>
                                    <div className="font-medium">{selectedBatch.total_participants || selectedBatch.participant_count} orang</div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500">Pembuat SPL</span>
                                    <div className="font-medium">{selectedBatch.creator_name}</div>
                                </div>
                            </div>

                            {/* Rejection Warning */}
                            {selectedBatch.has_rejections && (
                                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-orange-600" />
                                    <div>
                                        <span className="text-sm text-orange-700 font-medium">
                                            SPL ini memiliki {selectedBatch.rejected_count} record yang ditolak
                                        </span>
                                        <span className="text-xs text-orange-600 block">
                                            Record yang ditolak ditandai dengan warna merah
                                        </span>
                                    </div>
                                </div>
                            )}
                                </div>
                            </div>

                            <div>
                                <span className="text-xs text-slate-500">Deskripsi Kegiatan</span>
                                <div className="p-3 bg-slate-50 rounded-lg mt-1 text-sm">{selectedBatch.description}</div>
                            </div>

                            {/* Records grouped by date */}
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Detail Per Tanggal
                                </h4>
                                
                                {(() => {
                                    const grouped = groupRecordsByDate(selectedBatch.records);
                                    const dates = Object.keys(grouped);
                                    
                                    if (dates.length === 0) {
                                        return (
                                            <div className="text-center py-4 text-slate-500 text-sm">
                                                Tidak ada data peserta
                                            </div>
                                        );
                                    }
                                    
                                    return (
                                        <div className="border rounded-lg divide-y">
                                            {dates.map(date => {
                                                const dayData = grouped[date];
                                                return (
                                                    <Collapsible
                                                        key={date}
                                                        open={expandedDates[date]}
                                                        onOpenChange={() => toggleDate(date)}
                                                    >
                                                        <CollapsibleTrigger className="w-full">
                                                            <div className={`flex items-center justify-between p-3 hover:bg-slate-50 ${
                                                                dayData.is_holiday ? 'bg-red-50' : ''
                                                            }`}>
                                                                <div className="flex items-center gap-3">
                                                                    {expandedDates[date] ? 
                                                                        <ChevronDown className="w-4 h-4" /> : 
                                                                        <ChevronRight className="w-4 h-4" />
                                                                    }
                                                                    <span className="font-medium text-sm">
                                                                        {formatDate(date)}
                                                                    </span>
                                                                    {dayData.is_holiday ? (
                                                                        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">
                                                                            <Moon className="w-3 h-3 mr-1" /> Libur (2x)
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
                                                                            <Sun className="w-3 h-3 mr-1" /> Kerja
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                                                    <span>{dayData.records.length} orang</span>
                                                                    <span>{dayData.total_hours.toFixed(1)} jam</span>
                                                                    <span className="font-medium text-green-700">{formatCurrency(dayData.total_net)}</span>
                                                                </div>
                                                            </div>
                                                        </CollapsibleTrigger>
                                                        
                                                        <CollapsibleContent>
                                                            <div className="p-3 bg-slate-50 border-t">
                                                                <table className="w-full text-xs">
                                                                    <thead className="bg-white">
                                                                        <tr>
                                                                            <th className="text-left p-2 font-medium">No</th>
                                                                            <th className="text-left p-2 font-medium">Nama</th>
                                                                            <th className="text-left p-2 font-medium">NIP</th>
                                                                            <th className="text-center p-2 font-medium">Tipe</th>
                                                                            <th className="text-center p-2 font-medium">Jam Kerja</th>
                                                                            <th className="text-right p-2 font-medium">Durasi</th>
                                                                            <th className="text-right p-2 font-medium">Bruto</th>
                                                                            <th className="text-right p-2 font-medium">Neto</th>
                                                                            <th className="text-center p-2 font-medium">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y">
                                                                        {dayData.records.map((rec, idx) => {
                                                                            const isRejected = rec.status === 'Rejected';
                                                                            return (
                                                                                <tr key={rec.id || idx} className={`${isRejected ? 'bg-red-50 opacity-60' : 'bg-white'} hover:bg-slate-50`}>
                                                                                    <td className="p-2">{idx + 1}</td>
                                                                                    <td className={`p-2 font-medium ${isRejected ? 'line-through text-red-700' : ''}`}>{rec.nama_lengkap}</td>
                                                                                    <td className="p-2">{rec.nip || '-'}</td>
                                                                                    <td className="p-2 text-center">
                                                                                        <Badge variant="outline" className={`text-[10px] ${rec.employee_type === 'ASN' ? 'text-blue-700' : 'text-orange-700'}`}>
                                                                                            {rec.employee_type}
                                                                                        </Badge>
                                                                                    </td>
                                                                                    <td className="p-2 text-center">{rec.start_time} - {rec.end_time}</td>
                                                                                    <td className="p-2 text-right">{rec.duration_hours} jam</td>
                                                                                    <td className={`p-2 text-right ${isRejected ? 'line-through' : ''}`}>{formatCurrency(rec.gross_pay)}</td>
                                                                                    <td className={`p-2 text-right font-medium ${isRejected ? 'line-through text-red-700' : 'text-green-700'}`}>{formatCurrency(rec.net_pay)}</td>
                                                                                    <td className="p-2 text-center">{getRecordStatusBadge(rec.status)}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                    <tfoot className="bg-green-50 font-semibold">
                                                                        <tr>
                                                                            <td colSpan={5} className="p-2 text-right">Sub Total (Approved):</td>
                                                                            <td className="p-2 text-right">{dayData.records.filter(r => r.status !== 'Rejected').reduce((s,r) => s + (r.duration_hours || 0), 0).toFixed(1)} jam</td>
                                                                            <td className="p-2 text-right">{formatCurrency(dayData.records.filter(r => r.status !== 'Rejected').reduce((s,r) => s + (r.gross_pay || 0), 0))}</td>
                                                                            <td className="p-2 text-right">{formatCurrency(dayData.records.filter(r => r.status !== 'Rejected').reduce((s,r) => s + (r.net_pay || 0), 0))}</td>
                                                                            <td></td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Grand Total */}
                            <div className="p-4 bg-green-100 rounded-lg">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-xs text-green-700">Total Bruto</div>
                                        <div className="text-lg font-bold text-green-800">{formatCurrency(selectedBatch.total_gross)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-green-700">Total Pajak</div>
                                        <div className="text-lg font-bold text-green-800">{formatCurrency(selectedBatch.total_tax)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-green-700">Total Neto</div>
                                        <div className="text-xl font-bold text-green-800">{formatCurrency(selectedBatch.total_net)}</div>
                                    </div>
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
                                        Tolak Semua
                                    </Button>
                                    <Button 
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleApproveReject(selectedBatch.id, 'approve')}
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Setujui Semua
                                    </Button>
                                </div>
                            )}

                            {selectedBatch.status === 'Approved' && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                                    <p className="text-sm text-green-700">SPL ini telah disetujui oleh {selectedBatch.approver_name}</p>
                                </div>
                            )}

                            {selectedBatch.status === 'Rejected' && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                                    <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                                    <p className="text-sm text-red-700">SPL ini ditolak oleh {selectedBatch.approver_name}</p>
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
