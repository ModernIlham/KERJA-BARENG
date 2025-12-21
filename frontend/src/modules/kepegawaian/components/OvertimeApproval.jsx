import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { 
    RefreshCw, CheckCircle, XCircle, Users, Clock, Calendar, FileText, 
    DollarSign, ChevronDown, ChevronRight, Sun, Moon, CalendarRange,
    User, AlertCircle
} from 'lucide-react';
import api from '../../../api/axios';
import { formatCurrency } from '../../../lib/utils';

const OvertimeApproval = ({ refreshTrigger }) => {
    const [pendingBatches, setPendingBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBatches, setExpandedBatches] = useState({});
    const [expandedDates, setExpandedDates] = useState({});
    const [selectedRecords, setSelectedRecords] = useState({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchPendingBatches();
    }, [refreshTrigger]);

    const fetchPendingBatches = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/kepegawaian/overtime/batches?status=Pending');
            const batches = res.data || [];
            
            // Fetch details for each batch
            const batchesWithDetails = await Promise.all(
                batches.map(async (batch) => {
                    try {
                        const detailRes = await api.get(`/api/kepegawaian/overtime/batch/${batch.id}`);
                        return detailRes.data;
                    } catch {
                        return batch;
                    }
                })
            );
            
            setPendingBatches(batchesWithDetails);
            
            // Initialize selected records (all selected by default)
            const initialSelected = {};
            batchesWithDetails.forEach(batch => {
                initialSelected[batch.id] = {};
                (batch.records || []).forEach(rec => {
                    initialSelected[batch.id][rec.id] = true;
                });
            });
            setSelectedRecords(initialSelected);
        } catch (e) {
            toast.error("Gagal memuat data");
        } finally {
            setLoading(false);
        }
    };

    const toggleBatch = (batchId) => {
        setExpandedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }));
    };

    const toggleDate = (key) => {
        setExpandedDates(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleRecord = (batchId, recordId) => {
        setSelectedRecords(prev => ({
            ...prev,
            [batchId]: {
                ...prev[batchId],
                [recordId]: !prev[batchId]?.[recordId]
            }
        }));
    };

    const toggleAllInBatch = (batchId, records) => {
        const allSelected = records.every(r => selectedRecords[batchId]?.[r.id]);
        const newSelection = {};
        records.forEach(r => {
            newSelection[r.id] = !allSelected;
        });
        setSelectedRecords(prev => ({
            ...prev,
            [batchId]: newSelection
        }));
    };

    const toggleAllInDate = (batchId, records) => {
        const allSelected = records.every(r => selectedRecords[batchId]?.[r.id]);
        setSelectedRecords(prev => {
            const updated = { ...prev[batchId] };
            records.forEach(r => {
                updated[r.id] = !allSelected;
            });
            return { ...prev, [batchId]: updated };
        });
    };

    const handleBatchAction = async (batchId, action) => {
        setProcessing(true);
        try {
            await api.patch(`/api/kepegawaian/overtime/batch/${batchId}/${action}`);
            toast.success(action === 'approve' ? 'SPL disetujui' : 'SPL ditolak');
            fetchPendingBatches();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal memproses");
        } finally {
            setProcessing(false);
        }
    };

    const handlePartialApprove = async (batchId, approveIds, rejectIds) => {
        setProcessing(true);
        try {
            await api.post(`/api/kepegawaian/overtime/batch/${batchId}/partial`, {
                approve_ids: approveIds,
                reject_ids: rejectIds
            });
            toast.success('Persetujuan sebagian berhasil');
            fetchPendingBatches();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal memproses");
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const formatDateShort = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'short', day: 'numeric', month: 'short'
        });
    };

    // Group records by date
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
                    total_net: 0
                };
            }
            grouped[date].records.push(rec);
            grouped[date].total_hours += rec.duration_hours || 0;
            grouped[date].total_net += rec.net_pay || 0;
        });
        
        return Object.keys(grouped)
            .sort()
            .reduce((obj, key) => {
                obj[key] = grouped[key];
                return obj;
            }, {});
    };

    const getSelectedCount = (batchId, records) => {
        return records.filter(r => selectedRecords[batchId]?.[r.id]).length;
    };

    const getSelectedTotal = (batchId, records) => {
        return records
            .filter(r => selectedRecords[batchId]?.[r.id])
            .reduce((sum, r) => sum + (r.net_pay || 0), 0);
    };

    if (loading) {
        return (
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-8 text-center text-slate-500">
                    Memuat data...
                </CardContent>
            </Card>
        );
    }

    if (pendingBatches.length === 0) {
        return (
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Menunggu Persetujuan
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center">
                    <div className="text-slate-400 mb-2">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-200" />
                    </div>
                    <p className="text-slate-500">Tidak ada pengajuan lembur yang menunggu persetujuan</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                <div>
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                        Menunggu Persetujuan ({pendingBatches.length} SPL)
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                        Klik SPL untuk melihat detail dan menyetujui per orang atau keseluruhan
                    </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchPendingBatches}>
                    <RefreshCw size={16} />
                </Button>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-4">
                    {pendingBatches.map(batch => {
                        const records = batch.records || [];
                        const grouped = groupRecordsByDate(records);
                        const dates = Object.keys(grouped);
                        const selectedCount = getSelectedCount(batch.id, records);
                        const selectedTotal = getSelectedTotal(batch.id, records);
                        
                        return (
                            <Collapsible
                                key={batch.id}
                                open={expandedBatches[batch.id]}
                                onOpenChange={() => toggleBatch(batch.id)}
                            >
                                <div className="border rounded-lg overflow-hidden">
                                    <CollapsibleTrigger className="w-full">
                                        <div className="flex items-center justify-between p-4 bg-yellow-50 hover:bg-yellow-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                {expandedBatches[batch.id] ? 
                                                    <ChevronDown className="w-5 h-5" /> : 
                                                    <ChevronRight className="w-5 h-5" />
                                                }
                                                <div className="text-left">
                                                    <div className="font-bold text-blue-700 flex items-center gap-2">
                                                        {batch.nomor_spl}
                                                        <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50 text-xs">
                                                            Pending
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-slate-600 mt-1">{batch.description}</div>
                                                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <CalendarRange className="w-3 h-3" />
                                                            {batch.start_date === batch.end_date 
                                                                ? formatDateShort(batch.start_date || batch.date)
                                                                : `${formatDateShort(batch.start_date)} - ${formatDateShort(batch.end_date)}`
                                                            }
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {dates.length} hari
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {records.length} record
                                                        </span>
                                                        <span className="flex items-center gap-1 font-medium text-green-600">
                                                            <DollarSign className="w-3 h-3" />
                                                            {formatCurrency(batch.total_net)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                                    onClick={() => handleBatchAction(batch.id, 'reject')}
                                                    disabled={processing}
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" /> Tolak
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleBatchAction(batch.id, 'approve')}
                                                    disabled={processing}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" /> Setujui
                                                </Button>
                                            </div>
                                        </div>
                                    </CollapsibleTrigger>
                                    
                                    <CollapsibleContent>
                                        <div className="border-t">
                                            {/* Selection Summary */}
                                            <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox 
                                                        checked={selectedCount === records.length}
                                                        onCheckedChange={() => toggleAllInBatch(batch.id, records)}
                                                    />
                                                    <span className="text-sm">
                                                        {selectedCount === records.length 
                                                            ? "Semua dipilih" 
                                                            : `${selectedCount}/${records.length} dipilih`
                                                        }
                                                    </span>
                                                    <span className="text-sm font-medium text-green-600">
                                                        Total: {formatCurrency(selectedTotal)}
                                                    </span>
                                                </div>
                                                {selectedCount > 0 && selectedCount < records.length && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs"
                                                        onClick={() => {
                                                            const approveIds = records.filter(r => selectedRecords[batch.id]?.[r.id]).map(r => r.id);
                                                            const rejectIds = records.filter(r => !selectedRecords[batch.id]?.[r.id]).map(r => r.id);
                                                            handlePartialApprove(batch.id, approveIds, rejectIds);
                                                        }}
                                                        disabled={processing}
                                                    >
                                                        Setujui {selectedCount} Terpilih
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Records by Date */}
                                            <div className="divide-y">
                                                {dates.map(date => {
                                                    const dayData = grouped[date];
                                                    const dateKey = `${batch.id}-${date}`;
                                                    const dateSelectedCount = dayData.records.filter(r => selectedRecords[batch.id]?.[r.id]).length;
                                                    
                                                    return (
                                                        <Collapsible
                                                            key={date}
                                                            open={expandedDates[dateKey] !== false}
                                                            onOpenChange={() => toggleDate(dateKey)}
                                                        >
                                                            <CollapsibleTrigger className="w-full">
                                                                <div className={`flex items-center justify-between p-3 hover:bg-slate-50 ${
                                                                    dayData.is_holiday ? 'bg-red-50' : ''
                                                                }`}>
                                                                    <div className="flex items-center gap-3">
                                                                        <Checkbox 
                                                                            checked={dateSelectedCount === dayData.records.length}
                                                                            onCheckedChange={() => toggleAllInDate(batch.id, dayData.records)}
                                                                            onClick={e => e.stopPropagation()}
                                                                        />
                                                                        {expandedDates[dateKey] !== false ? 
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
                                                                        <span>{dateSelectedCount}/{dayData.records.length} orang</span>
                                                                        <span>{dayData.total_hours.toFixed(1)} jam</span>
                                                                        <span className="font-medium text-green-600">{formatCurrency(dayData.total_net)}</span>
                                                                    </div>
                                                                </div>
                                                            </CollapsibleTrigger>
                                                            
                                                            <CollapsibleContent>
                                                                <div className="px-3 pb-3">
                                                                    <div className="bg-white border rounded-lg divide-y">
                                                                        {dayData.records.map((rec, idx) => (
                                                                            <div 
                                                                                key={rec.id || idx}
                                                                                className={`flex items-center gap-3 p-2 hover:bg-slate-50 ${
                                                                                    !selectedRecords[batch.id]?.[rec.id] ? 'opacity-50 bg-slate-100' : ''
                                                                                }`}
                                                                            >
                                                                                <Checkbox 
                                                                                    checked={selectedRecords[batch.id]?.[rec.id] || false}
                                                                                    onCheckedChange={() => toggleRecord(batch.id, rec.id)}
                                                                                />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <User className="w-4 h-4 text-slate-400" />
                                                                                        <span className="font-medium text-sm">{rec.nama_lengkap}</span>
                                                                                        <Badge variant="outline" className={`text-[10px] ${rec.employee_type === 'ASN' ? 'text-blue-700' : 'text-orange-700'}`}>
                                                                                            {rec.employee_type}
                                                                                        </Badge>
                                                                                    </div>
                                                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                                                        {rec.nip || '-'} • {rec.start_time} - {rec.end_time} ({rec.duration_hours} jam)
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <div className="text-xs text-slate-500">Bruto: {formatCurrency(rec.gross_pay)}</div>
                                                                                    <div className="font-medium text-sm text-green-600">{formatCurrency(rec.net_pay)}</div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </CollapsibleContent>
                                                        </Collapsible>
                                                    );
                                                })}
                                            </div>

                                            {/* Footer Actions */}
                                            <div className="p-3 bg-slate-50 border-t flex items-center justify-between">
                                                <div className="text-sm text-slate-600">
                                                    Dibuat oleh: <span className="font-medium">{batch.creator_name}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="border-red-300 text-red-700 hover:bg-red-50"
                                                        onClick={() => handleBatchAction(batch.id, 'reject')}
                                                        disabled={processing}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" /> Tolak Semua
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleBatchAction(batch.id, 'approve')}
                                                        disabled={processing}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" /> Setujui Semua
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default OvertimeApproval;
