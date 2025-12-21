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
                .page-break { page-break-before: always; }
            }
        `
    });

    useEffect(() => {
        fetchData();
    }, [month, year]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
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

    // Cell styles
    const thStyle = { 
        border: '1px solid #000', 
        textAlign: 'center', 
        verticalAlign: 'middle', 
        padding: '4px 3px', 
        fontSize: '8px',
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold',
        lineHeight: '1.3'
    };
    const tdStyle = { 
        border: '1px solid #000', 
        textAlign: 'center', 
        verticalAlign: 'middle', 
        padding: '3px 2px', 
        fontSize: '8px',
        backgroundColor: '#fff'
    };
    const totalRowStyle = { ...tdStyle, backgroundColor: '#c8e6c9', fontWeight: 'bold' };
    const grandTotalStyle = { ...tdStyle, backgroundColor: '#81c784', fontWeight: 'bold', fontSize: '9px' };

    // Calculate grand totals
    const grandTotals = displayBatches.reduce((acc, batch) => ({
        participants: acc.participants + (batch.participants?.length || 0),
        gross: acc.gross + (batch.total_gross || 0),
        tax: acc.tax + (batch.total_tax || 0),
        net: acc.net + (batch.total_net || 0),
        meal: acc.meal + (batch.participants?.reduce((m, p) => m + (p.meal_allowance || 0), 0) || 0)
    }), { participants: 0, gross: 0, tax: 0, net: 0, meal: 0 });

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

            {batches.length === 0 ? (
                <div className="text-center py-8 text-slate-500 border rounded-lg">
                    Tidak ada data SPL untuk bulan ini
                </div>
            ) : (
                <div className="bg-white border shadow-sm overflow-x-auto" ref={componentRef}>
                    <div style={{ padding: '10px', minWidth: '1000px', fontFamily: 'Arial, sans-serif', fontSize: '8px' }}>
                        {/* Title */}
                        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '11px' }}>DAFTAR NOMINATIF LEMBUR BERDASARKAN NOMOR SPL</div>
                            <div style={{ fontWeight: 'bold', fontSize: '10px' }}>LEMBUR KEGIATAN INVENTARISASI DAN PELABELAN BMN TAHUNAN</div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '9px' }}>
                            <div style={{ fontWeight: 'bold' }}>
                                <div>SATUAN KERJA : OTORITA IBU KOTA NUSANTARA (621001)</div>
                                <div>BULAN : {monthName} {year}</div>
                            </div>
                            <div>Nusantara, {new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</div>
                        </div>

                        {/* Per SPL Tables */}
                        {displayBatches.map((batch, batchIdx) => (
                            <div key={batch.id || batchIdx} className={batchIdx > 0 ? 'page-break' : ''} style={{ marginBottom: '20px' }}>
                                {/* SPL Header */}
                                <div style={{ 
                                    backgroundColor: '#1e40af', 
                                    color: 'white', 
                                    padding: '6px 10px', 
                                    fontWeight: 'bold',
                                    fontSize: '10px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '0'
                                }}>
                                    <span>{batch.nomor_spl}</span>
                                    <span style={{ fontSize: '9px', fontWeight: 'normal' }}>
                                        Tanggal: {new Date(batch.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})} | 
                                        Waktu: {batch.start_time} - {batch.end_time} ({batch.duration_hours} jam) |
                                        Status: {batch.status}
                                    </span>
                                </div>
                                
                                <div style={{ 
                                    backgroundColor: '#dbeafe', 
                                    padding: '5px 10px', 
                                    fontSize: '9px',
                                    borderLeft: '1px solid #000',
                                    borderRight: '1px solid #000'
                                }}>
                                    <strong>Kegiatan:</strong> {batch.description}
                                </div>

                                {/* Table for this SPL */}
                                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th style={{...thStyle, width: '30px'}}>NO</th>
                                            <th style={{...thStyle, width: '180px'}}>NAMA PEGAWAI</th>
                                            <th style={{...thStyle, width: '120px'}}>NIP</th>
                                            <th style={{...thStyle, width: '60px'}}>TIPE</th>
                                            <th style={{...thStyle, width: '50px'}}>GOL</th>
                                            <th style={{...thStyle, width: '40px'}}>JAM</th>
                                            <th style={{...thStyle, width: '90px'}}>UANG LEMBUR</th>
                                            <th style={{...thStyle, width: '80px'}}>UANG MAKAN</th>
                                            <th style={{...thStyle, width: '90px'}}>JUMLAH BRUTO</th>
                                            <th style={{...thStyle, width: '70px'}}>POT. PPH</th>
                                            <th style={{...thStyle, width: '100px'}}>JUMLAH NETO</th>
                                        </tr>
                                        <tr>
                                            <th style={thStyle}>(1)</th>
                                            <th style={thStyle}>(2)</th>
                                            <th style={thStyle}>(3)</th>
                                            <th style={thStyle}>(4)</th>
                                            <th style={thStyle}>(5)</th>
                                            <th style={thStyle}>(6)</th>
                                            <th style={thStyle}>(7)</th>
                                            <th style={thStyle}>(8)</th>
                                            <th style={thStyle}>(9)=(7+8)</th>
                                            <th style={thStyle}>(10)</th>
                                            <th style={thStyle}>(11)=(9-10)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batch.participants?.map((p, idx) => {
                                            const uangLembur = (p.gross_pay || 0) - (p.meal_allowance || 0);
                                            return (
                                                <tr key={idx}>
                                                    <td style={tdStyle}>{idx + 1}</td>
                                                    <td style={{...tdStyle, textAlign: 'left', paddingLeft: '5px'}}>{p.nama_lengkap}</td>
                                                    <td style={{...tdStyle, fontSize: '7px'}}>{p.nip || '-'}</td>
                                                    <td style={tdStyle}>
                                                        <span style={{
                                                            padding: '1px 4px',
                                                            borderRadius: '3px',
                                                            backgroundColor: p.employee_type === 'ASN' ? '#dbeafe' : '#fed7aa',
                                                            color: p.employee_type === 'ASN' ? '#1e40af' : '#c2410c',
                                                            fontSize: '7px'
                                                        }}>
                                                            {p.employee_type}
                                                        </span>
                                                    </td>
                                                    <td style={tdStyle}>{p.grade || '-'}</td>
                                                    <td style={tdStyle}>{p.duration_hours}</td>
                                                    <td style={{...tdStyle, textAlign: 'right', paddingRight: '5px'}}>{formatRupiah(uangLembur)}</td>
                                                    <td style={{...tdStyle, textAlign: 'right', paddingRight: '5px'}}>{formatRupiah(p.meal_allowance)}</td>
                                                    <td style={{...tdStyle, textAlign: 'right', paddingRight: '5px', fontWeight: 'bold'}}>{formatRupiah(p.gross_pay)}</td>
                                                    <td style={{...tdStyle, textAlign: 'right', paddingRight: '5px'}}>{formatRupiah(p.tax_amount)}</td>
                                                    <td style={{...tdStyle, textAlign: 'right', paddingRight: '5px', fontWeight: 'bold'}}>{formatRupiah(p.net_pay)}</td>
                                                </tr>
                                            );
                                        })}
                                        
                                        {/* Sub Total for this SPL */}
                                        <tr>
                                            <td colSpan={6} style={{...totalRowStyle, textAlign: 'right', paddingRight: '10px'}}>
                                                SUB TOTAL {batch.nomor_spl} ({batch.participants?.length || 0} orang):
                                            </td>
                                            <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '5px'}}>
                                                {formatRupiah((batch.total_gross || 0) - (batch.participants?.reduce((m, p) => m + (p.meal_allowance || 0), 0) || 0))}
                                            </td>
                                            <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '5px'}}>
                                                {formatRupiah(batch.participants?.reduce((m, p) => m + (p.meal_allowance || 0), 0) || 0)}
                                            </td>
                                            <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '5px'}}>{formatRupiah(batch.total_gross)}</td>
                                            <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '5px'}}>{formatRupiah(batch.total_tax)}</td>
                                            <td style={{...totalRowStyle, textAlign: 'right', paddingRight: '5px'}}>{formatRupiah(batch.total_net)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ))}

                        {/* Grand Total */}
                        {displayBatches.length > 0 && (
                            <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '10px' }}>
                                <tbody>
                                    <tr>
                                        <td colSpan={6} style={{...grandTotalStyle, textAlign: 'right', paddingRight: '10px', width: '480px'}}>
                                            GRAND TOTAL {selectedBatch === 'all' ? `(${displayBatches.length} SPL, ${grandTotals.participants} orang)` : ''}:
                                        </td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '5px', width: '90px'}}>
                                            {formatRupiah(grandTotals.gross - grandTotals.meal)}
                                        </td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '5px', width: '80px'}}>
                                            {formatRupiah(grandTotals.meal)}
                                        </td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '5px', width: '90px'}}>
                                            {formatRupiah(grandTotals.gross)}
                                        </td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '5px', width: '70px'}}>
                                            {formatRupiah(grandTotals.tax)}
                                        </td>
                                        <td style={{...grandTotalStyle, textAlign: 'right', paddingRight: '5px', width: '100px'}}>
                                            {formatRupiah(grandTotals.net)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        )}

                        {/* Footer */}
                        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ textAlign: 'center', fontSize: '9px', width: '180px' }}>
                                <div>Mengetahui:</div>
                                <div style={{ fontWeight: 'bold', marginBottom: '40px' }}>Pejabat Pembuat Komitmen</div>
                                <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>AMBAR TRI BAWONO</div>
                                <div>NIP. 198112082009011008</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DafnomSPL;
