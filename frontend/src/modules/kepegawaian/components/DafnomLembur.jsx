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
        content: () => componentRef.current,
        documentTitle: `DAFNOM_LEMBUR_${month}_${year}`,
        pageStyle: `
            @page { 
                size: A4 landscape; 
                margin: 5mm; 
            }
            @media print {
                body { 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important;
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

    // Split days into two rows: 1-15 and 16-31
    const daysRow1 = Array.from({ length: 15 }, (_, i) => i + 1);
    const daysRow2 = Array.from({ length: Math.min(16, daysInMonth - 15) }, (_, i) => i + 16);

    // Calculate totals
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

    // Helper to check if a day is a holiday
    const isHoliday = (day) => holidays.includes(day);

    // Get cell style for day cells
    const getDayCellStyle = (day) => {
        return isHoliday(day) ? { backgroundColor: '#ffcccc' } : {};
    };

    if (loading) {
        return <div className="text-center py-8">Memuat data Dafnom...</div>;
    }

    return (
        <div>
            {/* PRINT BUTTON */}
            <div className="flex justify-end mb-4 gap-2 print:hidden">
                <Button onClick={handlePrint} className="bg-slate-800 text-white">
                    <Printer className="w-4 h-4 mr-2"/> Cetak / PDF
                </Button>
            </div>

            {/* PRINT AREA */}
            <div 
                className="bg-white border shadow-sm overflow-x-auto" 
                ref={componentRef}
                style={{ fontFamily: 'Arial, sans-serif' }}
            >
                <div className="p-4 min-w-[1400px]">
                    {/* HEADER SECTION */}
                    <div className="mb-4 text-center">
                        <h1 className="font-bold text-sm uppercase">
                            DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR
                        </h1>
                        <h2 className="font-bold text-xs uppercase">
                            LEMBUR KEGIATAN INVENTARISASI DAN PELABELAN BMN TAHUNAN
                        </h2>
                    </div>
                    
                    {/* Second Row: Left info + Right date */}
                    <div className="flex justify-between mb-3 text-[10px]">
                        <div className="font-bold">
                            <p>SATUAN KERJA : OTORITA IBU KOTA NUSANTARA (621001)</p>
                            <p>BULAN : {monthName} {year}</p>
                        </div>
                        <div className="text-right">
                            <p>Nusantara, {new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</p>
                        </div>
                    </div>

                    {/* MAIN TABLE */}
                    <table className="w-full border-collapse text-[8px]" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            {/* Header Row 1 - Main categories */}
                            <tr>
                                <th rowSpan="4" className="border border-black p-1 w-8 text-center align-middle bg-white">NO.<br/>URT</th>
                                <th rowSpan="4" className="border border-black p-1 min-w-[90px] text-center align-middle bg-white">Nama</th>
                                <th rowSpan="4" className="border border-black p-1 min-w-[100px] text-center align-middle bg-white">NIP</th>
                                <th rowSpan="4" className="border border-black p-1 w-8 text-center align-middle bg-white">GOL</th>
                                <th colSpan="15" className="border border-black p-1 text-center bg-white" rowSpan="1">JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                <th colSpan="2" rowSpan="2" className="border border-black p-1 text-center align-middle bg-white">JUMLAH JAM</th>
                                <th rowSpan="3" className="border border-black p-1 text-center align-middle bg-white w-10">JUMLAH<br/>MAKAN<br/>LEMBUR</th>
                                <th colSpan="2" rowSpan="2" className="border border-black p-1 text-center align-middle bg-white">JUMLAH UANG</th>
                                <th rowSpan="3" className="border border-black p-1 text-center align-middle bg-white w-14">JUMLAH<br/>DARI<br/>KOLOM</th>
                                <th rowSpan="3" className="border border-black p-1 text-center align-middle bg-white w-12">POTONGAN<br/>PPH</th>
                                <th rowSpan="3" className="border border-black p-1 text-center align-middle bg-white w-14">JUMLAH<br/>BERSIH</th>
                                <th rowSpan="4" className="border border-black p-1 text-center align-middle bg-white min-w-[70px]">TANDA TANGAN<br/>/<br/>NO REKENING</th>
                            </tr>
                            
                            {/* Header Row 2 - Days 1-15 */}
                            <tr>
                                {daysRow1.map(day => (
                                    <th 
                                        key={day} 
                                        className="border border-black p-0 w-5 text-center text-[7px]"
                                        style={getDayCellStyle(day)}
                                    >
                                        {day}{isHoliday(day) ? '-' : '+'}
                                    </th>
                                ))}
                            </tr>
                            
                            {/* Header Row 3 - Days 16-31 + summary headers */}
                            <tr>
                                {daysRow2.map(day => (
                                    <th 
                                        key={day} 
                                        className="border border-black p-0 w-5 text-center text-[7px]"
                                        style={getDayCellStyle(day)}
                                    >
                                        {day}{isHoliday(day) ? '-' : '+'}
                                    </th>
                                ))}
                                {/* Fill remaining cells if less than 16 days in row 2 */}
                                {Array.from({ length: Math.max(0, 15 - daysRow2.length) }, (_, i) => (
                                    <th key={`empty-${i}`} className="border border-black p-0 w-5"></th>
                                ))}
                                <th className="border border-black p-1 text-center w-8 text-[7px]">HARI<br/>KERJA</th>
                                <th className="border border-black p-1 text-center w-8 text-[7px]">HARI<br/>LIBUR</th>
                                <th className="border border-black p-1 text-center w-14 text-[7px]">LEMBUR</th>
                                <th className="border border-black p-1 text-center w-12 text-[7px]">MAKAN<br/>LEMBUR</th>
                            </tr>
                            
                            {/* Header Row 4 - Column numbers + Note */}
                            <tr className="text-[7px]">
                                <td colSpan="15" className="border border-black p-0 text-center italic">
                                    5 (tanda '-' = Libur ; tanda '+' = Kerja)
                                </td>
                                <td className="border border-black p-0 text-center font-bold">6</td>
                                <td className="border border-black p-0 text-center font-bold">7</td>
                                <td className="border border-black p-0 text-center font-bold">8</td>
                                <td className="border border-black p-0 text-center font-bold">9</td>
                                <td className="border border-black p-0 text-center font-bold">10</td>
                                <td className="border border-black p-0 text-center font-bold">11</td>
                                <td className="border border-black p-0 text-center font-bold">12</td>
                                <td className="border border-black p-0 text-center font-bold">13</td>
                            </tr>
                            
                            {/* Header Row 5 - Column numbers for first columns */}
                            <tr className="text-[7px]">
                                <td className="border border-black p-0 text-center font-bold">1</td>
                                <td className="border border-black p-0 text-center font-bold">2</td>
                                <td className="border border-black p-0 text-center font-bold">3</td>
                                <td className="border border-black p-0 text-center font-bold">4</td>
                                {/* Empty cells for days columns */}
                                <td colSpan="15" className="border border-black p-0"></td>
                                <td colSpan="8" className="border border-black p-0"></td>
                                <td className="border border-black p-0 text-center font-bold">14</td>
                            </tr>
                        </thead>
                        
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan="28" className="border border-black p-4 text-center text-gray-500">
                                        Tidak ada data lembur yang disetujui untuk bulan ini
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp, idx) => (
                                    <tr key={emp.pegawai_id || idx}>
                                        {/* NO. URT */}
                                        <td className="border border-black p-1 text-center">{idx + 1}</td>
                                        
                                        {/* Nama */}
                                        <td className="border border-black p-1 text-left text-[7px]">{emp.nama}</td>
                                        
                                        {/* NIP */}
                                        <td className="border border-black p-1 text-left text-[7px]">
                                            {emp.nip && emp.nip !== '-' ? emp.nip : '-'}
                                        </td>
                                        
                                        {/* GOL */}
                                        <td className="border border-black p-1 text-center">
                                            {emp.golongan ? emp.golongan.split('/')[0] : '-'}
                                        </td>
                                        
                                        {/* Daily Hours Row 1 (1-15) */}
                                        {daysRow1.map(day => {
                                            const dayStr = String(day);
                                            const hours = emp.daily_hours?.[dayStr]?.hours || 0;
                                            return (
                                                <td 
                                                    key={day} 
                                                    className="border border-black p-0 text-center text-[7px]"
                                                    style={getDayCellStyle(day)}
                                                >
                                                    {hours > 0 ? Math.round(hours) : 0}
                                                </td>
                                            );
                                        })}
                                        
                                        {/* These cells span to the next row - we need a different approach */}
                                        <td rowSpan="1" className="border border-black p-1 text-center" style={{display: 'none'}}></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Simplified approach - single row per employee with 2 rows of dates inline */}
                    
                    {/* FOOTER / SIGNATURE SECTION */}
                    <div className="mt-8 flex justify-end">
                        <div className="text-center text-[10px] w-64">
                            <p className="mb-1">Mengetahui:</p>
                            <p className="font-bold mb-12">Pejabat Pembuat Komitmen</p>
                            <p className="font-bold underline">AMBAR TRI BAWONO</p>
                            <p>NIP. 198112082009011008</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DafnomLembur;
