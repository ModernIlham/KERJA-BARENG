import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, RefreshCw } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import api from '../../../api/axios';

const formatRupiah = (num) => {
    if (num === null || num === undefined) return '-';
    if (num === 0) return '-';
    return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
};

const DafnomSPL = ({ month, year }) => {
    const componentRef = useRef();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState('all');
    
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `DAFNOM_SPL_${selectedBatch === 'all' ? 'ALL' : selectedBatch}_${month}_${year}`,
        pageStyle: `
            @page { size: A4 landscape; margin: 5mm; }
            @media print {
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
        `
    });

    useEffect(() => {
        fetchData();
    }, [month, year]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            const res = await api.get(`/api/kepegawaian/overtime/recap-by-spl?month=${monthStr}`);
            setBatches(res.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
        setLoading(false);
    };

    const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const monthName = monthNames[parseInt(month) - 1] || "-";

    // Filter batches based on selection
    const displayBatches = selectedBatch === 'all' 
        ? batches 
        : batches.filter(b => b.nomor_spl === selectedBatch);

    // Create SPL columns (max 16 columns like the date columns)
    const allSPLs = batches.map(b => b.nomor_spl);
    const splRow1 = allSPLs.slice(0, 16);
    const splRow2 = allSPLs.slice(16, 31);
    // Pad to 16 columns
    while (splRow1.length < 16) splRow1.push(null);
    while (splRow2.length < 15) splRow2.push(null);

    // Build employee data with SPL hours
    const employeeMap = {};
    displayBatches.forEach(batch => {
        batch.participants?.forEach(p => {
            const key = p.nip || p.nama_lengkap;
            if (!employeeMap[key]) {
                employeeMap[key] = {
                    nama: p.nama_lengkap,
                    nip: p.nip,
                    employee_type: p.employee_type,
                    grade: p.grade,
                    spl_hours: {},
                    total_jam: 0,
                    uang_lembur: 0,
                    uang_makan: 0,
                    jumlah_kotor: 0,
                    potongan_pph: 0,
                    jumlah_bersih: 0,
                    jumlah_makan: 0
                };
            }
            employeeMap[key].spl_hours[batch.nomor_spl] = p.duration_hours;
            employeeMap[key].total_jam += p.duration_hours || 0;
            employeeMap[key].uang_lembur += (p.gross_pay || 0) - (p.meal_allowance || 0);
            employeeMap[key].uang_makan += p.meal_allowance || 0;
            employeeMap[key].jumlah_kotor += p.gross_pay || 0;
            employeeMap[key].potongan_pph += p.tax_amount || 0;
            employeeMap[key].jumlah_bersih += p.net_pay || 0;
            if (p.meal_allowance > 0) employeeMap[key].jumlah_makan += 1;
        });
    });
    const employees = Object.values(employeeMap);

    // Calculate totals
    const totals = {
        total_jam: employees.reduce((acc, e) => acc + (e.total_jam || 0), 0),
        jumlah_makan: employees.reduce((acc, e) => acc + (e.jumlah_makan || 0), 0),
        uang_lembur: employees.reduce((acc, e) => acc + (e.uang_lembur || 0), 0),
        uang_makan: employees.reduce((acc, e) => acc + (e.uang_makan || 0), 0),
        jumlah_kotor: employees.reduce((acc, e) => acc + (e.jumlah_kotor || 0), 0),
        potongan_pph: employees.reduce((acc, e) => acc + (e.potongan_pph || 0), 0),
        jumlah_bersih: employees.reduce((acc, e) => acc + (e.jumlah_bersih || 0), 0),
    };

    // Cell styles (same as DafnomLembur)
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
    const splColStyle = { ...thStyle, width: '40px', minWidth: '40px', maxWidth: '40px', padding: '1px', fontSize: '5px' };
    const totalRowStyle = { ...tdStyle, backgroundColor: '#c8e6c9', fontWeight: 'bold', fontSize: '8px' };

    if (loading) {
        return <div className="text-center py-8">Memuat data Dafnom SPL...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4 print:hidden">
                <div className="flex items-center gap-3">
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
                    <Button variant="ghost" size="icon" onClick={fetchData}>
                        <RefreshCw size={16} />
                    </Button>
                </div>
                <Button onClick={handlePrint} className="bg-slate-800 text-white hover:bg-slate-700">
                    <Printer className="w-4 h-4 mr-2"/> Cetak / PDF
                </Button>
            </div>

            <div className="bg-white border shadow-sm overflow-x-auto" ref={componentRef}>
                <div style={{ padding: '10px', minWidth: '1100px', fontFamily: 'Arial, sans-serif', fontSize: '8px' }}>
                    {/* Title */}
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR</div>
                        <div style={{ fontWeight: 'bold', fontSize: '9px' }}>LEMBUR KEGIATAN INVENTARISASI DAN PELABELAN BMN TAHUNAN</div>
                        <div style={{ fontWeight: 'bold', fontSize: '9px', color: '#1e40af' }}>(BERDASARKAN NOMOR SPL)</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '8px' }}>
                        <div style={{ fontWeight: 'bold' }}>
                            <div>SATUAN KERJA : OTORITA IBU KOTA NUSANTARA (621001)</div>
                            <div>BULAN : {monthName} {year}</div>
                        </div>
                        <div>Nusantara, {new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</div>
                    </div>

                    {batches.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#666', border: '1px solid #ddd', borderRadius: '4px' }}>
                            Tidak ada data SPL untuk bulan ini
                        </div>
                    ) : (
                        <>
                            {/* Table */}
                            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '22px' }} /> {/* NO URT */}
                                    <col style={{ width: '70px' }} /> {/* Nama */}
                                    <col style={{ width: '80px' }} /> {/* NIP */}
                                    <col style={{ width: '22px' }} /> {/* GOL */}
                                    {Array(16).fill(null).map((_, i) => <col key={i} style={{ width: '40px' }} />)} {/* 16 SPL columns */}
                                    <col style={{ width: '30px' }} /> {/* Total Jam */}
                                    <col style={{ width: '26px' }} /> {/* Jml Makan */}
                                    <col style={{ width: '55px' }} /> {/* Uang Lembur */}
                                    <col style={{ width: '50px' }} /> {/* Uang Makan */}
                                    <col style={{ width: '58px' }} /> {/* Jumlah Kolom */}
                                    <col style={{ width: '45px' }} /> {/* Pot PPH */}
                                    <col style={{ width: '58px' }} /> {/* Jml Bersih */}
                                    <col style={{ width: '55px' }} /> {/* TTD/NoRek */}
                                </colgroup>
                                <thead>
                                    {/* Row 1: Main Headers */}
                                    <tr>
                                        <th rowSpan={3} style={thStyle}>NO.<br/>URT</th>
                                        <th rowSpan={3} style={thStyle}>Nama</th>
                                        <th rowSpan={3} style={thStyle}>NIP</th>
                                        <th rowSpan={3} style={thStyle}>GOL</th>
                                        <th colSpan={16} style={thStyle}>JUMLAH JAM KEGIATAN LEMBUR PADA NOMOR SPL</th>
                                        <th rowSpan={3} style={thStyle}>TOTAL<br/>JAM</th>
                                        <th rowSpan={3} style={thStyle}>JML<br/>MAKAN<br/>LEMBUR</th>
                                        <th colSpan={2} style={thStyle}>JUMLAH UANG</th>
                                        <th rowSpan={3} style={thStyle}>JUMLAH<br/>DARI<br/>KOLOM<br/>(8+9)</th>
                                        <th rowSpan={3} style={thStyle}>POT.<br/>PPH</th>
                                        <th rowSpan={3} style={thStyle}>JUMLAH<br/>BERSIH<br/>(10-11)</th>
                                        <th rowSpan={3} style={thStyle}>TANDA<br/>TANGAN<br/>/<br/>NO REK</th>
                                    </tr>

                                    {/* Row 2: SPL Numbers Row 1 (1-16) + Sub-headers */}
                                    <tr>
                                        {splRow1.map((spl, idx) => (
                                            <th key={idx} style={{...splColStyle, backgroundColor: spl ? '#e0f2fe' : '#fff'}}>
                                                {spl ? spl.replace('SPL-', '').replace(`${year}-`, '') : ''}
                                            </th>
                                        ))}
                                        <th rowSpan={2} style={thStyle}>LEMBUR</th>
                                        <th rowSpan={2} style={thStyle}>MAKAN</th>
                                    </tr>

                                    {/* Row 3: SPL Numbers Row 2 (17-31) + empty */}
                                    <tr>
                                        {splRow2.map((spl, idx) => (
                                            <th key={idx} style={{...splColStyle, backgroundColor: spl ? '#e0f2fe' : '#fff'}}>
                                                {spl ? spl.replace('SPL-', '').replace(`${year}-`, '') : ''}
                                            </th>
                                        ))}
                                        {/* 1 empty cell to make 16 columns */}
                                        <th style={splColStyle}></th>
                                    </tr>

                                    {/* Row 4: All Column Identifiers */}
                                    <tr>
                                        <th style={thStyle}>(1)</th>
                                        <th style={thStyle}>(2)</th>
                                        <th style={thStyle}>(3)</th>
                                        <th style={thStyle}>(4)</th>
                                        <th colSpan={16} style={{...thStyle, fontStyle: 'italic', fontSize: '6px'}}>(5) Jam lembur per nomor SPL</th>
                                        <th style={thStyle}>(6)</th>
                                        <th style={thStyle}>(7)</th>
                                        <th style={thStyle}>(8)</th>
                                        <th style={thStyle}>(9)</th>
                                        <th style={thStyle}>(10)=(8+9)</th>
                                        <th style={thStyle}>(11)</th>
                                        <th style={thStyle}>(12)</th>
                                        <th style={thStyle}>(13)</th>
                                    </tr>
                                </thead>
                                
                                <tbody>
                                    {employees.length === 0 ? (
                                        <tr>
                                            <td colSpan={28} style={{...tdStyle, padding: '15px', color: '#666'}}>
                                                Tidak ada data lembur yang disetujui untuk bulan ini
                                            </td>
                                        </tr>
                                    ) : (
                                        employees.map((emp, idx) => (
                                            <React.Fragment key={emp.nip || idx}>
                                                {/* Data Row 1: SPL 1-16 */}
                                                <tr>
                                                    <td rowSpan={2} style={tdStyle}>{idx + 1}</td>
                                                    <td rowSpan={2} style={{...tdStyle, textAlign: 'left', fontSize: '6px'}}>{emp.nama}</td>
                                                    <td rowSpan={2} style={{...tdStyle, textAlign: 'left', fontSize: '6px'}}>{emp.nip || '-'}</td>
                                                    <td rowSpan={2} style={tdStyle}>{emp.grade?.split('/')[0] || '-'}</td>
                                                    
                                                    {splRow1.map((spl, sIdx) => {
                                                        const hours = spl ? (emp.spl_hours[spl] || 0) : 0;
                                                        return (
                                                            <td key={sIdx} style={{...tdStyle, ...splColStyle, backgroundColor: spl && hours > 0 ? '#e0f2fe' : '#fff'}}>
                                                                {spl ? (hours > 0 ? Math.round(hours) : '-') : ''}
                                                            </td>
                                                        );
                                                    })}
                                                    
                                                    <td rowSpan={2} style={tdStyle}>{Math.round(emp.total_jam || 0)}</td>
                                                    <td rowSpan={2} style={tdStyle}>{emp.jumlah_makan || 0}</td>
                                                    <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px'}}>{formatRupiah(emp.uang_lembur)}</td>
                                                    <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px'}}>{formatRupiah(emp.uang_makan)}</td>
                                                    <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_kotor)}</td>
                                                    <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px'}}>{formatRupiah(emp.potongan_pph)}</td>
                                                    <td rowSpan={2} style={{...tdStyle, textAlign: 'right', fontSize: '6px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_bersih)}</td>
                                                    <td rowSpan={2} style={{...tdStyle, fontSize: '5px'}}>-<br/>Mandiri</td>
                                                </tr>
                                                
                                                {/* Data Row 2: SPL 17-31 + empty */}
                                                <tr>
                                                    {splRow2.map((spl, sIdx) => {
                                                        const hours = spl ? (emp.spl_hours[spl] || 0) : 0;
                                                        return (
                                                            <td key={sIdx} style={{...tdStyle, ...splColStyle, backgroundColor: spl && hours > 0 ? '#e0f2fe' : '#fff'}}>
                                                                {spl ? (hours > 0 ? Math.round(hours) : '-') : ''}
                                                            </td>
                                                        );
                                                    })}
                                                    {/* 1 empty cell */}
                                                    <td style={{...tdStyle, ...splColStyle}}></td>
                                                </tr>
                                            </React.Fragment>
                                        ))
                                    )}
                                    
                                    {/* Total Row */}
                                    <tr>
                                        <td colSpan={4} style={totalRowStyle}>JUMLAH TOTAL</td>
                                        <td colSpan={16} style={totalRowStyle}></td>
                                        <td style={totalRowStyle}>{Math.round(totals.total_jam)}</td>
                                        <td style={totalRowStyle}>{totals.jumlah_makan}</td>
                                        <td style={{...totalRowStyle, textAlign: 'right'}}>{formatRupiah(totals.uang_lembur)}</td>
                                        <td style={{...totalRowStyle, textAlign: 'right'}}>{formatRupiah(totals.uang_makan)}</td>
                                        <td style={{...totalRowStyle, textAlign: 'right'}}>{formatRupiah(totals.jumlah_kotor)}</td>
                                        <td style={{...totalRowStyle, textAlign: 'right'}}>{formatRupiah(totals.potongan_pph)}</td>
                                        <td style={{...totalRowStyle, textAlign: 'right'}}>{formatRupiah(totals.jumlah_bersih)}</td>
                                        <td style={totalRowStyle}></td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* SPL Legend */}
                            <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '7px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Keterangan Nomor SPL:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {allSPLs.map((spl, idx) => {
                                        const batch = batches.find(b => b.nomor_spl === spl);
                                        return (
                                            <span key={idx} style={{ backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '3px' }}>
                                                <strong>{spl.replace('SPL-', '').replace(`${year}-`, '')}</strong>: {batch?.date} ({batch?.start_time}-{batch?.end_time})
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Footer */}
                    <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ textAlign: 'center', fontSize: '8px', width: '160px' }}>
                            <div>Mengetahui:</div>
                            <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Pejabat Pembuat Komitmen</div>
                            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>AMBAR TRI BAWONO</div>
                            <div>NIP. 198112082009011008</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DafnomSPL;
