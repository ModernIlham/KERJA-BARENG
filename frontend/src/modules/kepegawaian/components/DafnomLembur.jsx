import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatRupiah = (num) => {
    if (num === null || num === undefined) return '-';
    if (num === 0) return '-';
    return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
};

const DafnomLembur = ({ month, year }) => {
    const componentRef = useRef();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `DAFNOM_LEMBUR_${month}_${year}`,
        pageStyle: `
            @page { 
                size: A4 landscape; 
                margin: 3mm; 
            }
            @media print {
                body { 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important;
                    font-size: 6px !important;
                }
                table { 
                    font-size: 6px !important; 
                    width: 100% !important;
                }
                .print-container {
                    padding: 2mm !important;
                }
            }
        `
    });

    useEffect(() => {
        fetchDafnomData();
    }, [month, year]);

    const fetchDafnomData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            const res = await fetch(`${API_URL}/api/kepegawaian/overtime/dafnom?month=${monthStr}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error('Error fetching dafnom:', err);
        }
        setLoading(false);
    };

    const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const monthName = monthNames[parseInt(month) - 1] || "-";
    
    const daysInMonth = data?.days_in_month || 31;
    const holidays = data?.holidays || [];
    const employees = data?.employees || [];

    const totals = {
        jam_kerja: employees.reduce((acc, e) => acc + (e.jam_hari_kerja || 0), 0),
        jam_libur: employees.reduce((acc, e) => acc + (e.jam_hari_libur || 0), 0),
        jumlah_makan: employees.reduce((acc, e) => acc + (e.jumlah_makan || 0), 0),
        uang_lembur: employees.reduce((acc, e) => acc + (e.uang_lembur || 0), 0),
        uang_makan: employees.reduce((acc, e) => acc + (e.uang_makan || 0), 0),
        jumlah_kotor: employees.reduce((acc, e) => acc + (e.jumlah_kotor || 0), 0),
        potongan_pph: employees.reduce((acc, e) => acc + (e.potongan_pph || 0), 0),
        jumlah_bersih: employees.reduce((acc, e) => acc + (e.jumlah_bersih || 0), 0),
    };

    const isHoliday = (day) => holidays.includes(day);
    const days1to15 = Array.from({ length: 15 }, (_, i) => i + 1);
    const days16to31 = Array.from({ length: 16 }, (_, i) => i + 16).filter(d => d <= daysInMonth);

    // Styles
    const borderStyle = '1px solid #000';
    const cellBase = { border: borderStyle, textAlign: 'center', verticalAlign: 'middle', padding: '1px' };
    const dayCell = { ...cellBase, width: '14px', minWidth: '14px', maxWidth: '14px', fontSize: '5px' };
    const holidayBg = { backgroundColor: '#ffcccc' };

    if (loading) {
        return <div className="text-center py-8">Memuat data Dafnom...</div>;
    }

    return (
        <div>
            <div className="flex justify-end mb-4 gap-2 print:hidden">
                <Button onClick={handlePrint} className="bg-slate-800 text-white hover:bg-slate-700">
                    <Printer className="w-4 h-4 mr-2"/> Cetak / PDF
                </Button>
            </div>

            <div className="bg-white border shadow-sm overflow-x-auto print-container" ref={componentRef}>
                <div style={{ padding: '8px', minWidth: '1100px', fontFamily: 'Arial, sans-serif', fontSize: '7px' }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase' }}>
                            DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '8px', textTransform: 'uppercase' }}>
                            LEMBUR KEGIATAN INVENTARISASI DAN PELABELAN BMN TAHUNAN
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '7px' }}>
                        <div style={{ fontWeight: 'bold' }}>
                            <div>SATUAN KERJA : OTORITA IBU KOTA NUSANTARA (621001)</div>
                            <div>BULAN : {monthName} {year}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            Nusantara, {new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}
                        </div>
                    </div>

                    {/* Main Table */}
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '6px', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '20px' }} /> {/* NO URT */}
                            <col style={{ width: '60px' }} /> {/* Nama - REDUCED */}
                            <col style={{ width: '70px' }} /> {/* NIP - REDUCED */}
                            <col style={{ width: '18px' }} /> {/* GOL */}
                            {/* Days 1-15 */}
                            {days1to15.map((_, i) => <col key={`d1-${i}`} style={{ width: '14px' }} />)}
                            <col style={{ width: '22px' }} /> {/* Hari Kerja */}
                            <col style={{ width: '22px' }} /> {/* Hari Libur */}
                            <col style={{ width: '22px' }} /> {/* Jml Makan */}
                            <col style={{ width: '45px' }} /> {/* Uang Lembur */}
                            <col style={{ width: '40px' }} /> {/* Uang Makan */}
                            <col style={{ width: '48px' }} /> {/* Jumlah Kolom */}
                            <col style={{ width: '38px' }} /> {/* PPH */}
                            <col style={{ width: '48px' }} /> {/* Bersih */}
                            <col style={{ width: '50px' }} /> {/* Tanda Tangan */}
                        </colgroup>
                        <thead>
                            {/* Row 1: Main Headers */}
                            <tr>
                                <th rowSpan="4" style={cellBase}>NO.<br/>URT</th>
                                <th rowSpan="4" style={cellBase}>Nama</th>
                                <th rowSpan="4" style={cellBase}>NIP</th>
                                <th rowSpan="4" style={cellBase}>GOL</th>
                                <th colSpan="15" style={cellBase}>JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                <th colSpan="2" rowSpan="2" style={cellBase}>JUMLAH JAM</th>
                                <th rowSpan="3" style={cellBase}>JML<br/>MAKAN<br/>LEMBUR</th>
                                <th colSpan="2" rowSpan="2" style={cellBase}>JUMLAH UANG</th>
                                <th rowSpan="3" style={cellBase}>JUMLAH<br/>DARI<br/>KOLOM</th>
                                <th rowSpan="3" style={cellBase}>POT.<br/>PPH</th>
                                <th rowSpan="3" style={cellBase}>JUMLAH<br/>BERSIH</th>
                                <th rowSpan="4" style={cellBase}>TTD/<br/>NO REK</th>
                            </tr>

                            {/* Row 2: Days 1-15 */}
                            <tr>
                                {days1to15.map(day => (
                                    <th key={day} style={{...dayCell, ...(isHoliday(day) ? holidayBg : {})}}>
                                        {day}{isHoliday(day) ? '-' : '+'}
                                    </th>
                                ))}
                            </tr>

                            {/* Row 3: Days 16-31 + Sub headers */}
                            <tr>
                                {days16to31.map(day => (
                                    <th key={day} style={{...dayCell, ...(isHoliday(day) ? holidayBg : {})}}>
                                        {day}{isHoliday(day) ? '-' : '+'}
                                    </th>
                                ))}
                                {Array.from({ length: 15 - days16to31.length }, (_, i) => (
                                    <th key={`pad-${i}`} style={dayCell}></th>
                                ))}
                                <th style={{...cellBase, fontSize: '5px'}}>HARI<br/>KERJA</th>
                                <th style={{...cellBase, fontSize: '5px'}}>HARI<br/>LIBUR</th>
                                <th style={{...cellBase, fontSize: '5px'}}>LEMBUR</th>
                                <th style={{...cellBase, fontSize: '5px'}}>MAKAN</th>
                            </tr>

                            {/* Row 4: Note + Column Numbers */}
                            <tr>
                                <td colSpan="15" style={{...cellBase, fontStyle: 'italic', fontSize: '5px'}}>
                                    5 (tanda '-' = Libur ; tanda '+' = Kerja)
                                </td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>6</td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>7</td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>8</td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>9</td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>10</td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>11</td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>12</td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>13</td>
                            </tr>

                            {/* Row 5: Column IDs */}
                            <tr>
                                <td style={{...cellBase, fontWeight: 'bold'}}>1</td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>2</td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>3</td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>4</td>
                                <td colSpan="15" style={cellBase}></td>
                                <td colSpan="8" style={cellBase}></td>
                                <td style={{...cellBase, fontWeight: 'bold'}}>14</td>
                            </tr>
                        </thead>
                        
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan="28" style={{...cellBase, padding: '10px', color: '#888'}}>
                                        Tidak ada data lembur yang disetujui untuk bulan ini
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp, idx) => (
                                    <React.Fragment key={emp.pegawai_id || idx}>
                                        {/* Employee Row 1: Days 1-15 */}
                                        <tr>
                                            <td rowSpan="2" style={cellBase}>{idx + 1}</td>
                                            <td rowSpan="2" style={{...cellBase, textAlign: 'left', fontSize: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                                {emp.nama}
                                            </td>
                                            <td rowSpan="2" style={{...cellBase, textAlign: 'left', fontSize: '5px', overflow: 'hidden'}}>
                                                {emp.nip || '-'}
                                            </td>
                                            <td rowSpan="2" style={cellBase}>{emp.golongan?.split('/')[0] || '-'}</td>
                                            
                                            {days1to15.map(day => {
                                                const hours = emp.daily_hours?.[String(day)]?.hours || 0;
                                                return (
                                                    <td key={day} style={{...dayCell, ...(isHoliday(day) ? holidayBg : {})}}>
                                                        {hours > 0 ? Math.round(hours) : 0}
                                                    </td>
                                                );
                                            })}
                                            
                                            <td rowSpan="2" style={cellBase}>{Math.round(emp.jam_hari_kerja || 0)}</td>
                                            <td rowSpan="2" style={cellBase}>{Math.round(emp.jam_hari_libur || 0)}</td>
                                            <td rowSpan="2" style={cellBase}>{emp.jumlah_makan || 0}</td>
                                            <td rowSpan="2" style={{...cellBase, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(emp.uang_lembur)}</td>
                                            <td rowSpan="2" style={{...cellBase, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(emp.uang_makan)}</td>
                                            <td rowSpan="2" style={{...cellBase, textAlign: 'right', fontSize: '5px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_kotor)}</td>
                                            <td rowSpan="2" style={{...cellBase, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(emp.potongan_pph)}</td>
                                            <td rowSpan="2" style={{...cellBase, textAlign: 'right', fontSize: '5px', fontWeight: 'bold'}}>{formatRupiah(emp.jumlah_bersih)}</td>
                                            <td rowSpan="2" style={{...cellBase, fontSize: '5px'}}>
                                                {emp.bank_account || '-'}<br/>{emp.bank_name || 'Mandiri'}
                                            </td>
                                        </tr>
                                        
                                        {/* Employee Row 2: Days 16-31 */}
                                        <tr>
                                            {days16to31.map(day => {
                                                const hours = emp.daily_hours?.[String(day)]?.hours || 0;
                                                return (
                                                    <td key={day} style={{...dayCell, ...(isHoliday(day) ? holidayBg : {})}}>
                                                        {hours > 0 ? Math.round(hours) : 0}
                                                    </td>
                                                );
                                            })}
                                            {Array.from({ length: 15 - days16to31.length }, (_, i) => (
                                                <td key={`pad-${i}`} style={dayCell}>0</td>
                                            ))}
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                            
                            {/* Total Row */}
                            <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                                <td colSpan="4" style={cellBase}>JUMLAH TOTAL</td>
                                <td colSpan="15" style={cellBase}></td>
                                <td style={cellBase}>{Math.round(totals.jam_kerja)}</td>
                                <td style={cellBase}>{Math.round(totals.jam_libur)}</td>
                                <td style={cellBase}>{totals.jumlah_makan}</td>
                                <td style={{...cellBase, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.uang_lembur)}</td>
                                <td style={{...cellBase, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.uang_makan)}</td>
                                <td style={{...cellBase, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.jumlah_kotor)}</td>
                                <td style={{...cellBase, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.potongan_pph)}</td>
                                <td style={{...cellBase, textAlign: 'right', fontSize: '5px'}}>{formatRupiah(totals.jumlah_bersih)}</td>
                                <td style={cellBase}></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ textAlign: 'center', fontSize: '7px', width: '180px' }}>
                            <div style={{ marginBottom: '4px' }}>Mengetahui:</div>
                            <div style={{ fontWeight: 'bold', marginBottom: '40px' }}>Pejabat Pembuat Komitmen</div>
                            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>AMBAR TRI BAWONO</div>
                            <div>NIP. 198112082009011008</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DafnomLembur;
