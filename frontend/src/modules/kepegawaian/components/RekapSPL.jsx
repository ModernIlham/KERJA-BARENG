import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RefreshCw, Printer, FileText, Users, Calendar, DollarSign } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import api from '../../../api/axios';
import { formatCurrency } from '../../../lib/utils';

const RekapSPL = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    const componentRef = useRef();

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Rekap_SPL_${selectedMonth}_${selectedYear}`,
        pageStyle: `
            @page { size: A4 landscape; margin: 10mm; }
            @media print {
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
        `
    });

    const months = [
        { value: '01', label: 'Januari' },
        { value: '02', label: 'Februari' },
        { value: '03', label: 'Maret' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Mei' },
        { value: '06', label: 'Juni' },
        { value: '07', label: 'Juli' },
        { value: '08', label: 'Agustus' },
        { value: '09', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' }
    ];

    const years = Array.from({ length: 5 }, (_, i) => ({
        value: String(new Date().getFullYear() - 2 + i),
        label: String(new Date().getFullYear() - 2 + i)
    }));

    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedYear]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const month = `${selectedYear}-${selectedMonth}`;
            const res = await api.get(`/api/kepegawaian/overtime/recap-by-spl?month=${month}`);
            // Response now has {batches, holidays, days_in_month, ...}
            setData(res.data?.batches || []);
        } catch (e) {
            toast.error("Gagal memuat data rekap SPL");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const config = {
            'Pending': { className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
            'Approved': { className: 'bg-green-100 text-green-800 border-green-300' },
            'Rejected': { className: 'bg-red-100 text-red-800 border-red-300' }
        };
        const c = config[status] || config['Pending'];
        return <Badge variant="outline" className={c.className}>{status}</Badge>;
    };

    // Calculate totals
    const grandTotal = data.reduce((acc, batch) => ({
        participants: acc.participants + (batch.participant_count || 0),
        gross: acc.gross + (batch.total_gross || 0),
        tax: acc.tax + (batch.total_tax || 0),
        net: acc.net + (batch.total_net || 0)
    }), { participants: 0, gross: 0, tax: 0, net: 0 });

    const monthName = months.find(m => m.value === selectedMonth)?.label || '';

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Rekapitulasi Lembur per Nomor SPL
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => (
                                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={fetchData}>
                        <RefreshCw size={16} />
                    </Button>
                    <Button onClick={handlePrint} size="sm" className="bg-slate-800 text-white hover:bg-slate-700">
                        <Printer className="w-4 h-4 mr-2" /> Cetak
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Memuat...</div>
                ) : (
                    <div ref={componentRef} className="overflow-x-auto">
                        <div className="min-w-[900px] p-2" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {/* Print Header */}
                            <div className="text-center mb-4 print:block hidden">
                                <div className="font-bold text-lg">REKAPITULASI LEMBUR BERDASARKAN NOMOR SPL</div>
                                <div className="text-sm">Bulan {monthName} {selectedYear}</div>
                            </div>

                            {data.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    Tidak ada data SPL untuk bulan ini
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {data.map((batch, idx) => (
                                        <div key={batch.id || idx} className="border rounded-lg overflow-hidden">
                                            {/* Batch Header */}
                                            <div className="bg-slate-100 p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-blue-700">{batch.nomor_spl}</span>
                                                    {getStatusBadge(batch.status)}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(batch.date)}
                                                    </span>
                                                    <span>{batch.start_time} - {batch.end_time}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        {batch.participant_count} orang
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Batch Description */}
                                            <div className="px-3 py-2 bg-slate-50 text-sm border-b">
                                                <strong>Kegiatan:</strong> {batch.description}
                                            </div>

                                            {/* Participants Table */}
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="text-left p-2 font-medium w-10">No</th>
                                                        <th className="text-left p-2 font-medium">Nama Pegawai</th>
                                                        <th className="text-left p-2 font-medium">NIP</th>
                                                        <th className="text-center p-2 font-medium">Tipe</th>
                                                        <th className="text-center p-2 font-medium">Gol</th>
                                                        <th className="text-center p-2 font-medium">Jam</th>
                                                        <th className="text-right p-2 font-medium">Bruto</th>
                                                        <th className="text-right p-2 font-medium">Uang Makan</th>
                                                        <th className="text-right p-2 font-medium">Pajak</th>
                                                        <th className="text-right p-2 font-medium">Neto</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {batch.participants?.map((p, pIdx) => (
                                                        <tr key={pIdx} className="hover:bg-slate-50">
                                                            <td className="p-2">{pIdx + 1}</td>
                                                            <td className="p-2 font-medium">{p.nama_lengkap}</td>
                                                            <td className="p-2 text-xs text-slate-600">{p.nip || '-'}</td>
                                                            <td className="p-2 text-center">
                                                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                    p.employee_type === 'ASN' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                    {p.employee_type}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 text-center text-xs">{p.grade || '-'}</td>
                                                            <td className="p-2 text-center">{p.duration_hours}</td>
                                                            <td className="p-2 text-right">{formatCurrency(p.gross_pay)}</td>
                                                            <td className="p-2 text-right">{formatCurrency(p.meal_allowance)}</td>
                                                            <td className="p-2 text-right">{formatCurrency(p.tax_amount)}</td>
                                                            <td className="p-2 text-right font-medium">{formatCurrency(p.net_pay)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-blue-50 font-semibold">
                                                    <tr>
                                                        <td colSpan={6} className="p-2 text-right">Sub Total SPL {batch.nomor_spl}:</td>
                                                        <td className="p-2 text-right">{formatCurrency(batch.total_gross)}</td>
                                                        <td className="p-2 text-right">-</td>
                                                        <td className="p-2 text-right">{formatCurrency(batch.total_tax)}</td>
                                                        <td className="p-2 text-right">{formatCurrency(batch.total_net)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    ))}

                                    {/* Grand Total */}
                                    <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-green-800 flex items-center gap-2">
                                                <DollarSign className="w-5 h-5" />
                                                GRAND TOTAL BULAN {monthName.toUpperCase()} {selectedYear}
                                            </div>
                                            <div className="flex items-center gap-6 text-sm">
                                                <div className="text-center">
                                                    <div className="text-xs text-green-600">Total SPL</div>
                                                    <div className="font-bold text-green-800">{data.length}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-green-600">Total Peserta</div>
                                                    <div className="font-bold text-green-800">{grandTotal.participants}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-green-600">Total Bruto</div>
                                                    <div className="font-bold text-green-800">{formatCurrency(grandTotal.gross)}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-green-600">Total Pajak</div>
                                                    <div className="font-bold text-green-800">{formatCurrency(grandTotal.tax)}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-green-600">Total Neto</div>
                                                    <div className="font-bold text-lg text-green-800">{formatCurrency(grandTotal.net)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RekapSPL;
