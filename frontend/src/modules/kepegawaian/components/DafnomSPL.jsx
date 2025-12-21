import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, RefreshCw } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import api from '../../../api/axios';

const formatRupiah = (num) => {
    if (num === null || num === undefined) return '-';
    if (num === 0) return '-';
    return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
};

const DafnomSPLTable = ({ batches, holidays, cutiNasional, daysInMonth, employeeType, month, year, selectedPPK, reportTitle }) => {
    const componentRef = useRef();
    
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `DAFNOM_SPL_${employeeType}_${month}_${year}`,
        pageStyle: `
            @page { size: A4 landscape; margin: 5mm; }
            @media print {
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
        `
    });

    const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const monthName = monthNames[parseInt(month) - 1] || "-";

    const isHoliday = (day) => holidays.includes(day);
    const isCutiNasional = (day) => (cutiNasional || []).includes(day);

    // Filter batches by employee type
    const filteredBatches = batches.map(batch => ({
        ...batch,
        participants: (batch.participants || []).filter(p => {
            if (employeeType === 'ASN') {
                return p.employee_type === 'ASN';
            } else {
                return p.employee_type !== 'ASN';
            }
        })
    })).filter(batch => batch.participants.length > 0);

    // Calculate grand totals
    const grandTotals = filteredBatches.reduce((acc, batch) => ({
        participants: acc.participants + (batch.participants?.length || 0),
        jam_kerja: acc.jam_kerja + (batch.participants?.reduce((s, p) => s + (p.jam_hari_kerja || 0), 0) || 0),
        jam_libur: acc.jam_libur + (batch.participants?.reduce((s, p) => s + (p.jam_hari_libur || 0), 0) || 0),
        uang_lembur: acc.uang_lembur + batch.participants?.reduce((s, p) => s + ((p.gross_pay || 0) - (p.meal_allowance || 0)), 0),
        uang_makan: acc.uang_makan + batch.participants?.reduce((s, p) => s + (p.meal_allowance || 0), 0),
        jumlah_kotor: acc.jumlah_kotor + batch.participants?.reduce((s, p) => s + (p.gross_pay || 0), 0),
        potongan_pph: acc.potongan_pph + batch.participants?.reduce((s, p) => s + (p.tax_amount || 0), 0),
        jumlah_bersih: acc.jumlah_bersih + batch.participants?.reduce((s, p) => s + (p.net_pay || 0), 0)
    }), { participants: 0, jam_kerja: 0, jam_libur: 0, uang_lembur: 0, uang_makan: 0, jumlah_kotor: 0, potongan_pph: 0, jumlah_bersih: 0 });

    // Days split: 1-16 (first row), 17-31+1empty (second row) = 16 columns each
    const days1to16 = Array.from({ length: 16 }, (_, i) => i + 1);
    const days17to31 = Array.from({ length: 15 }, (_, i) => i + 17);

    // Cell styles
    const thStyle = { 
        border: '1px solid #000', 
        textAlign: 'center', 
        verticalAlign: 'middle', 
        padding: '2px 1px', 
        fontSize: '7px',
        backgroundColor: '#fff',
        fontWeight: 'bold',
        lineHeight: '1.2'
    };
    const tdStyle = { 
        border: '1px solid #000', 
        textAlign: 'center', 
        verticalAlign: 'middle', 
        padding: '2px 1px', 
        fontSize: '7px',
        backgroundColor: '#fff'
    };
    const dayColStyle = { ...thStyle, width: '18px', minWidth: '18px', maxWidth: '18px', padding: '1px' };
    const holidayBg = { backgroundColor: '#ffcccc' };  // Regular holiday - red
    const cutiNasionalBg = { backgroundColor: '#fff0f0' };  // Cuti Nasional - faded red
    const totalRowStyle = { ...tdStyle, backgroundColor: '#c8e6c9', fontWeight: 'bold', fontSize: '8px' };
    const grandTotalStyle = { ...tdStyle, backgroundColor: '#81c784', fontWeight: 'bold', fontSize: '8px' };
    const splColStyle = { ...tdStyle, backgroundColor: '#e3f2fd' };

    // Helper to get day background style
    const getDayBgStyle = (day) => {
        if (!isHoliday(day)) return {};
        if (isCutiNasional(day)) return cutiNasionalBg;
        return holidayBg;
    };

    if (filteredBatches.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                Tidak ada data {employeeType} untuk bulan ini
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-end mb-4 print:hidden">
                <Button onClick={handlePrint} className="bg-slate-800 text-white hover:bg-slate-700">
                    <Printer className="w-4 h-4 mr-2"/> Cetak {employeeType}
                </Button>
            </div>

            <div className="bg-white border shadow-sm overflow-x-auto" ref={componentRef}>
                <div style={{ padding: '10px', minWidth: '1200px', fontFamily: 'Arial, sans-serif', fontSize: '8px' }}>
                    {/* Title */}
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR</div>
                        <div style={{ fontWeight: 'bold', fontSize: '9px' }}>PEGAWAI {employeeType}</div>
                        <div style={{ fontWeight: 'bold', fontSize: '9px', marginTop: '4px' }}>{reportTitle}</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '8px' }}>
                        <div style={{ fontWeight: 'bold' }}>
                            <div>SATUAN KERJA : OTORITA IBU KOTA NUSANTARA (621001)</div>
                            <div>BULAN : {monthName} {year}</div>
                        </div>
                        <div>Nusantara, {new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</div>
                    </div>

                    {/* Table */}
                    <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '22px' }} /> {/* NO URT */}
                            <col style={{ width: '70px' }} /> {/* NO SPL */}
                            <col style={{ width: '70px' }} /> {/* Nama */}
                            <col style={{ width: '70px' }} /> {/* NIP */}
                            <col style={{ width: '22px' }} /> {/* GOL */}
                            {Array(16).fill(null).map((_, i) => <col key={i} style={{ width: '18px' }} />)} {/* 16 date columns */}
                            <col style={{ width: '26px' }} /> {/* Hari Kerja */}
                            <col style={{ width: '26px' }} /> {/* Hari Libur */}
                            <col style={{ width: '26px' }} /> {/* Jml Makan */}
                            <col style={{ width: '50px' }} /> {/* Uang Lembur */}
                            <col style={{ width: '45px' }} /> {/* Uang Makan */}
                            <col style={{ width: '52px' }} /> {/* Jumlah Kolom */}
                            <col style={{ width: '40px' }} /> {/* Pot PPH */}
                            <col style={{ width: '52px' }} /> {/* Jml Bersih */}
                            <col style={{ width: '70px' }} /> {/* TTD/NO REK */}
                        </colgroup>
                        <thead>
                            {/* Row 1: Main Headers */}
                            <tr>
                                <th rowSpan={3} style={thStyle}>NO.<br/>URT</th>
                                <th rowSpan={3} style={thStyle}>NOMOR<br/>SPL</th>
                                <th rowSpan={3} style={thStyle}>Nama</th>
                                <th rowSpan={3} style={thStyle}>NIP</th>
                                <th rowSpan={3} style={thStyle}>GOL</th>
                                <th colSpan={16} style={thStyle}>JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                <th colSpan={2} style={thStyle}>JUMLAH JAM</th>
                                <th rowSpan={3} style={thStyle}>JML<br/>MAKAN<br/>LEMBUR</th>
                                <th colSpan={2} style={thStyle}>JUMLAH UANG</th>
                                <th rowSpan={3} style={thStyle}>JUMLAH<br/>DARI<br/>KOLOM<br/>(10+11)</th>
                                <th rowSpan={3} style={thStyle}>POT.<br/>PPH</th>
                                <th rowSpan={3} style={thStyle}>JUMLAH<br/>BERSIH<br/>(12-13)</th>
                                <th rowSpan={3} style={{...thStyle, width: '70px'}}>TANDA<br/>TANGAN/<br/>NO REK</th>
                            </tr>

                            {/* Row 2: Days 1-16 + Sub-headers (rowSpan=2) */}
                            <tr>
                                {days1to16.map(day => {
                                    const valid = day <= daysInMonth;
                                    const holiday = valid && isHoliday(day);
                                    return (
                                        <th key={day} style={{...dayColStyle, ...getDayBgStyle(day)}}>
                                            {valid ? `${day}${holiday ? '-' : '+'}` : ''}
                                        </th>
                                    );
                                })}
                                <th rowSpan={2} style={thStyle}>HARI<br/>KERJA</th>
                                <th rowSpan={2} style={thStyle}>HARI<br/>LIBUR</th>
                                <th rowSpan={2} style={thStyle}>LEMBUR</th>
                                <th rowSpan={2} style={thStyle}>MAKAN</th>
                            </tr>

                            {/* Row 3: Days 17-31 + 1 empty cell */}
                            <tr>
                                {days17to31.map(day => {
                                    const valid = day <= daysInMonth;
                                    const holiday = valid && isHoliday(day);
                                    return (
                                        <th key={day} style={{...dayColStyle, ...getDayBgStyle(day)}}>
                                            {valid ? `${day}${holiday ? '-' : '+'}` : ''}
                                        </th>
                                    );
                                })}
                                {/* 1 empty cell to make 16 columns */}
                                <th style={dayColStyle}></th>
                            </tr>

                            {/* Row 4: All Column Identifiers */}
                            <tr>
                                <th style={thStyle}>(1)</th>
                                <th style={thStyle}>(2)</th>
                                <th style={thStyle}>(3)</th>
                                <th style={thStyle}>(4)</th>
                                <th style={thStyle}>(5)</th>
                                <th colSpan={16} style={{...thStyle, fontStyle: 'italic', fontSize: '6px'}}>(6) tanda "-" = Libur ; tanda "+" = Kerja</th>
                                <th style={thStyle}>(7)</th>
                                <th style={thStyle}>(8)</th>
                                <th style={thStyle}>(9)</th>
                                <th style={thStyle}>(10)</th>
                                <th style={thStyle}>(11)</th>
                                <th style={thStyle}>(12)</th>
                                <th style={thStyle}>(13)</th>
                                <th style={thStyle}>(14)</th>
                                <th style={thStyle}>(15)</th>
                            </tr>
                        </thead>
                        
                        <tbody>
                            {filteredBatches.map((batch, batchIdx) => {
                                const participants = batch.participants || [];
                                const batchMeal = participants.reduce((s, p) => s + (p.meal_allowance || 0), 0);
                                const batchJamKerja = participants.reduce((s, p) => s + (p.jam_hari_kerja || 0), 0);
                                const batchJamLibur = participants.reduce((s, p) => s + (p.jam_hari_libur || 0), 0);
                                
                                // Get day from batch date (YYYY-MM-DD)
                                const batchDay = batch.date ? parseInt(batch.date.split('-')[2]) : null;
                                
                                return (
                                    <React.Fragment key={batch.id || batchIdx}>
                                        {participants.map((p, pIdx) => {
                                            const uangLembur = (p.gross_pay || 0) - (p.meal_allowance || 0);
                                            const isFirst = pIdx === 0;
                                            const rowCount = participants.length;
                                            
                                            // Get participant's day
                                            const participantDay = p.date ? parseInt(p.date.split('-')[2]) : batchDay;
                                            
                                            return (
                                                <React.Fragment key={`${batch.id}-${pIdx}`}>
                                                    {/* Data Row 1: Days 1-16 */}
                                                    <tr>
                                                        {isFirst && (
                                                            <>
                                                                <td rowSpan={rowCount * 2} style={{...splColStyle, fontWeight: 'bold'}}>{batchIdx + 1}</td>
                                                                <td rowSpan={rowCount * 2} style={{...splColStyle, fontSize: '6px', fontWeight: 'bold'}}>{batch.nomor_spl}</td>
                                                            </>
                                                        )}
                                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'left', fontSize: '6px', paddingLeft: '2px'}}>{p.nama_lengkap}</td>
                                                        <td rowSpan={2} style={{...tdStyle, fontSize: '6px'}}>{p.nip || '-'}</td>
                                                        <td rowSpan={2} style={tdStyle}>{p.grade || '-'}</td>
                                                        
                                                        {/* Days 1-16 - show hours only on the participant's day */}
                                                        {days1to16.map(day => {
                                                            const valid = day <= daysInMonth;
                                                            const hours = (valid && participantDay === day) ? (p.duration_hours || 0) : 0;
                                                            return (
                                                                <td key={day} style={{...tdStyle, ...dayColStyle, ...getDayBgStyle(day)}}>
                                                                    {valid ? (hours > 0 ? Math.round(hours) : 0) : ''}
                                                                </td>
                                                            );
                                                        })}
                                                        
                                                        <td rowSpan={2} style={tdStyle}>{Math.round(p.jam_hari_kerja || 0)}</td>
                                                        <td rowSpan={2} style={tdStyle}>{Math.round(p.jam_hari_libur || 0)}</td>
                                                        <td rowSpan={2} style={tdStyle}>{p.meal_allowance > 0 ? '1' : '0'}</td>
                                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', paddingRight: '2px'}}>{formatRupiah(uangLembur)}</td>
                                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', paddingRight: '2px'}}>{formatRupiah(p.meal_allowance)}</td>
                                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold', paddingRight: '2px'}}>{formatRupiah(p.gross_pay)}</td>
                                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', paddingRight: '2px'}}>{formatRupiah(p.tax_amount)}</td>
                                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold', paddingRight: '2px'}}>{formatRupiah(p.net_pay)}</td>
                                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'left', fontSize: '5px', paddingLeft: '2px'}}>
                                                            {p.nama_bank && p.no_rekening ? (
                                                                <>
                                                                    <div style={{fontWeight: 'bold'}}>{p.nama_bank}</div>
                                                                    <div>{p.no_rekening}</div>
                                                                </>
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Data Row 2: Days 17-31 + 1 empty */}
                                                    <tr>
                                                        {days17to31.map(day => {
                                                            const valid = day <= daysInMonth;
                                                            const hours = (valid && participantDay === day) ? (p.duration_hours || 0) : 0;
                                                            return (
                                                                <td key={day} style={{...tdStyle, ...dayColStyle, ...getDayBgStyle(day)}}>
                                                                    {valid ? (hours > 0 ? Math.round(hours) : 0) : ''}
                                                                </td>
                                                            );
                                                        })}
                                                        {/* 1 empty cell */}
                                                        <td style={{...tdStyle, ...dayColStyle}}></td>
                                                    </tr>
                                                </React.Fragment>
                                            );
                                        })}
                                        
                                        {/* Sub Total per SPL */}
                                        <tr>
                                            <td colSpan={5} style={{...totalRowStyle, textAlign: 'right', paddingRight: '4px'}}>
                                                Sub Total {batch.nomor_spl}:
                                            </td>
                                            <td colSpan={16} style={totalRowStyle}></td>
                                            <td style={totalRowStyle}>{Math.round(batchJamKerja)}</td>
                                            <td style={totalRowStyle}>{Math.round(batchJamLibur)}</td>
                                            <td style={totalRowStyle}>{participants.filter(p => p.meal_allowance > 0).length}</td>
                                            <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(participants.reduce((s, p) => s + ((p.gross_pay || 0) - (p.meal_allowance || 0)), 0))}</td>
                                            <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(batchMeal)}</td>
                                            <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(participants.reduce((s, p) => s + (p.gross_pay || 0), 0))}</td>
                                            <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(participants.reduce((s, p) => s + (p.tax_amount || 0), 0))}</td>
                                            <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(participants.reduce((s, p) => s + (p.net_pay || 0), 0))}</td>
                                            <td style={totalRowStyle}></td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                            
                            {/* Grand Total */}
                            <tr>
                                <td colSpan={5} style={{...grandTotalStyle, textAlign: 'right', paddingRight: '4px'}}>
                                    JUMLAH TOTAL ({filteredBatches.length} SPL, {grandTotals.participants} orang):
                                </td>
                                <td colSpan={16} style={grandTotalStyle}></td>
                                <td style={grandTotalStyle}>{Math.round(grandTotals.jam_kerja)}</td>
                                <td style={grandTotalStyle}>{Math.round(grandTotals.jam_libur)}</td>
                                <td style={grandTotalStyle}>{filteredBatches.reduce((s, b) => s + (b.participants?.filter(p => p.meal_allowance > 0).length || 0), 0)}</td>
                                <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(grandTotals.uang_lembur)}</td>
                                <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(grandTotals.uang_makan)}</td>
                                <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(grandTotals.jumlah_kotor)}</td>
                                <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(grandTotals.potongan_pph)}</td>
                                <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(grandTotals.jumlah_bersih)}</td>
                                <td style={grandTotalStyle}></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer - PPK Signature */}
                    <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ textAlign: 'center', fontSize: '8px', width: '180px' }}>
                            <div>Mengetahui:</div>
                            <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Pejabat Pembuat Komitmen</div>
                            {selectedPPK ? (
                                <>
                                    <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{selectedPPK.nama_lengkap}</div>
                                    <div>NIP. {selectedPPK.nip || '-'}</div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>_____________________</div>
                                    <div>NIP. _____________________</div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DafnomSPL = ({ month, year }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState('all');
    const [employeeTypeFilter, setEmployeeTypeFilter] = useState('ASN');
    const [ppkList, setPpkList] = useState([]);
    const [selectedPPKId, setSelectedPPKId] = useState('');

    useEffect(() => {
        fetchData();
        fetchPPKList();
    }, [month, year]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            const res = await api.get(`/api/kepegawaian/overtime/recap-by-spl?month=${monthStr}`);
            setData(res.data || {});
        } catch (err) {
            console.error('Error fetching data:', err);
        }
        setLoading(false);
    };

    const fetchPPKList = async () => {
        try {
            const res = await api.get('/api/pegawai/pejabat?role=PPK');
            setPpkList(res.data || []);
        } catch (err) {
            console.error('Error fetching PPK list:', err);
        }
    };

    const batches = data?.batches || [];
    const holidays = data?.holidays || [];
    const daysInMonth = data?.days_in_month || 31;

    // Filter batches by selection
    const displayBatches = selectedBatch === 'all' 
        ? batches 
        : batches.filter(b => b.nomor_spl === selectedBatch);

    // Get report title based on selected SPL
    const getReportTitle = () => {
        if (selectedBatch === 'all') {
            return 'PER SURAT PERINTAH LEMBUR';
        }
        const batch = batches.find(b => b.nomor_spl === selectedBatch);
        return batch?.description || 'PER SURAT PERINTAH LEMBUR';
    };

    // Get selected PPK object
    const selectedPPK = ppkList.find(p => p.id === selectedPPKId || p._id === selectedPPKId);

    if (loading) {
        return <div className="text-center py-8">Memuat data Dafnom SPL...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Pilih SPL:</span>
                        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                            <SelectTrigger className="w-48 h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua SPL</SelectItem>
                                {batches.map(b => (
                                    <SelectItem key={b.nomor_spl} value={b.nomor_spl}>
                                        {b.nomor_spl}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Penanda Tangan (PPK):</span>
                        <Select value={selectedPPKId || "none"} onValueChange={(val) => setSelectedPPKId(val === "none" ? "" : val)}>
                            <SelectTrigger className="w-56 h-9">
                                <SelectValue placeholder="Pilih PPK..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- Pilih PPK --</SelectItem>
                                {ppkList.map(p => (
                                    <SelectItem key={p.id || p._id} value={p.id || p._id}>
                                        {p.nama_lengkap}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <Button variant="ghost" size="icon" onClick={fetchData}>
                        <RefreshCw size={16} />
                    </Button>
                </div>
            </div>

            {/* Tabs for ASN/NON-ASN */}
            <Tabs value={employeeTypeFilter} onValueChange={setEmployeeTypeFilter} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="ASN">Pegawai ASN</TabsTrigger>
                    <TabsTrigger value="NON_ASN">Pegawai NON-ASN</TabsTrigger>
                </TabsList>
                
                <TabsContent value="ASN" className="mt-4">
                    <DafnomSPLTable 
                        batches={displayBatches} 
                        holidays={holidays} 
                        daysInMonth={daysInMonth}
                        employeeType="ASN"
                        month={month}
                        year={year}
                        selectedPPK={selectedPPK}
                        reportTitle={getReportTitle()}
                    />
                </TabsContent>
                
                <TabsContent value="NON_ASN" className="mt-4">
                    <DafnomSPLTable 
                        batches={displayBatches} 
                        holidays={holidays} 
                        daysInMonth={daysInMonth}
                        employeeType="NON-ASN"
                        month={month}
                        year={year}
                        selectedPPK={selectedPPK}
                        reportTitle={getReportTitle()}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DafnomSPL;
