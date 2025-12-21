import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, RefreshCw, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import api from '../../../api/axios';

const formatRupiah = (num) => {
    if (num === null || num === undefined) return '-';
    if (num === 0) return '-';
    return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
};

const DafnomTable = ({ employees, holidays, cutiNasional, daysInMonth, employeeType, month, year, selectedPPK }) => {
    const componentRef = useRef();
    
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `DAFNOM_LEMBUR_${employeeType}_${month}_${year}`,
        pageStyle: `
            @page { size: A4 landscape; margin: 5mm; }
            @media print {
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
        `
    });

    const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const monthName = monthNames[parseInt(month) - 1] || "-";

    // Filter employees by type
    const filteredEmployees = employees.filter(e => {
        if (employeeType === 'ASN') {
            return e.employee_type === 'ASN';
        } else {
            return e.employee_type !== 'ASN';
        }
    });

    const totals = {
        jam_kerja: filteredEmployees.reduce((acc, e) => acc + (e.jam_hari_kerja || 0), 0),
        jam_libur: filteredEmployees.reduce((acc, e) => acc + (e.jam_hari_libur || 0), 0),
        jumlah_makan: filteredEmployees.reduce((acc, e) => acc + (e.jumlah_makan || 0), 0),
        uang_lembur: filteredEmployees.reduce((acc, e) => acc + (e.uang_lembur || 0), 0),
        uang_makan: filteredEmployees.reduce((acc, e) => acc + (e.uang_makan || 0), 0),
        jumlah_kotor: filteredEmployees.reduce((acc, e) => acc + (e.jumlah_kotor || 0), 0),
        potongan_pph: filteredEmployees.reduce((acc, e) => acc + (e.potongan_pph || 0), 0),
        jumlah_bersih: filteredEmployees.reduce((acc, e) => acc + (e.jumlah_bersih || 0), 0),
    };

    const isHoliday = (day) => holidays.includes(day);
    const isCutiNasional = (day) => (cutiNasional || []).includes(day);
    
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

    // Helper to get day background style
    const getDayBgStyle = (day) => {
        if (!isHoliday(day)) return {};
        if (isCutiNasional(day)) return cutiNasionalBg;
        return holidayBg;
    };

    if (filteredEmployees.length === 0) {
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
                <div style={{ padding: '10px', minWidth: '1100px', fontFamily: 'Arial, sans-serif', fontSize: '8px' }}>
                    {/* Title */}
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR</div>
                        <div style={{ fontWeight: 'bold', fontSize: '9px' }}>PEGAWAI {employeeType}</div>
                        <div style={{ fontWeight: 'bold', fontSize: '9px', marginTop: '4px' }}>PER PEGAWAI</div>
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
                            <col style={{ width: '70px' }} /> {/* Nama */}
                            <col style={{ width: '75px' }} /> {/* NIP */}
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
                                <th rowSpan={3} style={thStyle}>Nama</th>
                                <th rowSpan={3} style={thStyle}>NIP</th>
                                <th rowSpan={3} style={thStyle}>GOL</th>
                                <th colSpan={16} style={thStyle}>JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                <th colSpan={2} style={thStyle}>JUMLAH JAM</th>
                                <th rowSpan={3} style={thStyle}>JML<br/>MAKAN<br/>LEMBUR</th>
                                <th colSpan={2} style={thStyle}>JUMLAH UANG</th>
                                <th rowSpan={3} style={thStyle}>JUMLAH<br/>DARI<br/>KOLOM<br/>(9+10)</th>
                                <th rowSpan={3} style={thStyle}>POT.<br/>PPH</th>
                                <th rowSpan={3} style={thStyle}>JUMLAH<br/>BERSIH<br/>(11-12)</th>
                                <th rowSpan={3} style={{...thStyle, width: '70px'}}>TANDA<br/>TANGAN/<br/>NO REK</th>
                            </tr>

                            {/* Row 2: Days 1-16 + Sub-headers */}
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
                                <th style={dayColStyle}></th>
                            </tr>

                            {/* Row 4: Column numbers */}
                            <tr>
                                <th style={thStyle}>(1)</th>
                                <th style={thStyle}>(2)</th>
                                <th style={thStyle}>(3)</th>
                                <th style={thStyle}>(4)</th>
                                <th colSpan={16} style={{...thStyle, fontStyle: 'italic', fontSize: '6px'}}>(5) tanda "-" = Libur ; tanda "+" = Kerja</th>
                                <th style={thStyle}>(6)</th>
                                <th style={thStyle}>(7)</th>
                                <th style={thStyle}>(8)</th>
                                <th style={thStyle}>(9)</th>
                                <th style={thStyle}>(10)</th>
                                <th style={thStyle}>(11)</th>
                                <th style={thStyle}>(12)</th>
                                <th style={thStyle}>(13)</th>
                                <th style={thStyle}>(14)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.map((emp, idx) => (
                                <React.Fragment key={emp.pegawai_id || idx}>
                                    {/* Row 1: Days 1-16 */}
                                    <tr>
                                        <td rowSpan={2} style={tdStyle}>{idx + 1}</td>
                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'left', fontSize: '6px', paddingLeft: '2px'}}>{emp.nama}</td>
                                        <td rowSpan={2} style={{...tdStyle, fontSize: '6px'}}>{emp.nip || '-'}</td>
                                        <td rowSpan={2} style={tdStyle}>{emp.golongan || '-'}</td>
                                        
                                        {days1to16.map(day => {
                                            const valid = day <= daysInMonth;
                                            const dayData = emp.daily_hours?.[String(day)] || { hours: 0 };
                                            return (
                                                <td key={day} style={{...tdStyle, ...dayColStyle, ...getDayBgStyle(day)}}>
                                                    {valid ? (dayData.hours > 0 ? Math.round(dayData.hours) : 0) : ''}
                                                </td>
                                            );
                                        })}
                                        
                                        <td rowSpan={2} style={tdStyle}>{Math.round(emp.jam_hari_kerja || 0)}</td>
                                        <td rowSpan={2} style={tdStyle}>{Math.round(emp.jam_hari_libur || 0)}</td>
                                        <td rowSpan={2} style={tdStyle}>{emp.jumlah_makan || 0}</td>
                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', paddingRight: '2px'}}>{formatRupiah(emp.uang_lembur)}</td>
                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', paddingRight: '2px'}}>{formatRupiah(emp.uang_makan)}</td>
                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold', paddingRight: '2px'}}>{formatRupiah(emp.jumlah_kotor)}</td>
                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', paddingRight: '2px'}}>{formatRupiah(emp.potongan_pph)}</td>
                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold', paddingRight: '2px'}}>{formatRupiah(emp.jumlah_bersih)}</td>
                                        <td rowSpan={2} style={{...tdStyle, textAlign: 'left', fontSize: '5px', paddingLeft: '2px'}}>
                                            {emp.bank_name && emp.bank_account ? (
                                                <>
                                                    <div style={{fontWeight: 'bold'}}>{emp.bank_name}</div>
                                                    <div>{emp.bank_account}</div>
                                                </>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                    
                                    {/* Row 2: Days 17-31 */}
                                    <tr>
                                        {days17to31.map(day => {
                                            const valid = day <= daysInMonth;
                                            const dayData = emp.daily_hours?.[String(day)] || { hours: 0 };
                                            return (
                                                <td key={day} style={{...tdStyle, ...dayColStyle, ...getDayBgStyle(day)}}>
                                                    {valid ? (dayData.hours > 0 ? Math.round(dayData.hours) : 0) : ''}
                                                </td>
                                            );
                                        })}
                                        <td style={{...tdStyle, ...dayColStyle}}></td>
                                    </tr>
                                </React.Fragment>
                            ))}
                            
                            {/* Total row */}
                            <tr>
                                <td colSpan={4} style={{...totalRowStyle, textAlign: 'right', paddingRight: '4px'}}>JUMLAH ({filteredEmployees.length} orang):</td>
                                <td colSpan={16} style={totalRowStyle}></td>
                                <td style={totalRowStyle}>{Math.round(totals.jam_kerja)}</td>
                                <td style={totalRowStyle}>{Math.round(totals.jam_libur)}</td>
                                <td style={totalRowStyle}>{totals.jumlah_makan}</td>
                                <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(totals.uang_lembur)}</td>
                                <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(totals.uang_makan)}</td>
                                <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(totals.jumlah_kotor)}</td>
                                <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(totals.potongan_pph)}</td>
                                <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '2px'}}>{formatRupiah(totals.jumlah_bersih)}</td>
                                <td style={totalRowStyle}></td>
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

const DafnomLembur = ({ month, year }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [employeeTypeFilter, setEmployeeTypeFilter] = useState('ASN');
    const [ppkList, setPpkList] = useState([]);
    const [selectedPPKId, setSelectedPPKId] = useState('');

    useEffect(() => {
        fetchDafnomData();
        fetchPPKList();
    }, [month, year]);

    const fetchDafnomData = async () => {
        setLoading(true);
        try {
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            const res = await api.get(`/api/kepegawaian/overtime/dafnom?month=${monthStr}`);
            setData(res.data || {});
        } catch (err) {
            console.error('Error fetching dafnom:', err);
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

    const daysInMonth = data?.days_in_month || 31;
    const holidays = data?.holidays || [];
    const cutiNasional = data?.cuti_nasional || [];
    const employees = data?.employees || [];

    // Get selected PPK object
    const selectedPPK = ppkList.find(p => p.id === selectedPPKId || p._id === selectedPPKId);

    if (loading) {
        return <div className="text-center py-8">Memuat data Dafnom...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
                <div className="flex items-center gap-3 flex-wrap">
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
                    
                    <Button variant="ghost" size="icon" onClick={fetchDafnomData}>
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
                    <DafnomTable 
                        employees={employees} 
                        holidays={holidays}
                        cutiNasional={cutiNasional}
                        daysInMonth={daysInMonth}
                        employeeType="ASN"
                        month={month}
                        year={year}
                        selectedPPK={selectedPPK}
                    />
                </TabsContent>
                
                <TabsContent value="NON_ASN" className="mt-4">
                    <DafnomTable 
                        employees={employees} 
                        holidays={holidays}
                        cutiNasional={cutiNasional}
                        daysInMonth={daysInMonth}
                        employeeType="NON-ASN"
                        month={month}
                        year={year}
                        selectedPPK={selectedPPK}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DafnomLembur;
