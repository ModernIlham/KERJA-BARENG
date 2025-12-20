import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatRupiah = (num) => {
    if (num === null || num === undefined || num === 0) return '-';
    return `Rp ${num.toLocaleString('id-ID')}`;
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
                    <div className="mb-4">
                        {/* Top Row: Title Centered */}
                        <div className="text-center mb-2">
                            <h1 className="font-bold text-sm uppercase">
                                DAFTAR/REKAP PEMBAYARAN PERHITUNGAN LEMBUR DAN UANG MAKAN LEMBUR
                            </h1>
                            <h2 className="font-bold text-xs uppercase">
                                LEMBUR KEGIATAN INVENTARISASI DAN PELABELAN BMN TAHUNAN
                            </h2>
                        </div>
                        
                        {/* Second Row: Left info + Right date */}
                        <div className="flex justify-between mt-3 text-[10px]">
                            <div className="font-bold">
                                <p>SATUAN KERJA : OTORITA IBU KOTA NUSANTARA (621001)</p>
                                <p>BULAN : {monthName} {year}</p>
                            </div>
                            <div className="text-right">
                                <p>Nusantara, {new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</p>
                            </div>
                        </div>
                    </div>

                    {/* MAIN TABLE */}
                    <table className="w-full border-collapse text-[8px]" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            {/* Header Row 1 - Main categories */}
                            <tr className="bg-gray-100">
                                <th rowSpan="3" className="border border-black p-1 w-8 text-center align-middle">NO.<br/>URT</th>
                                <th rowSpan="3" className="border border-black p-1 min-w-[100px] text-center align-middle">Nama</th>
                                <th rowSpan="3" className="border border-black p-1 min-w-[90px] text-center align-middle">NIP</th>
                                <th rowSpan="3" className="border border-black p-1 w-8 text-center align-middle">GOL</th>
                                <th colSpan={daysInMonth} className="border border-black p-1 text-center">JUMLAH JAM KEGIATAN LEMBUR PADA TANGGAL</th>
                                <th colSpan="2" className="border border-black p-1 text-center">JUMLAH JAM</th>
                                <th rowSpan="2" className="border border-black p-1 text-center align-middle w-10">JML<br/>MAKAN<br/>LEMBUR</th>
                                <th colSpan="2" className="border border-black p-1 text-center">JUMLAH UANG</th>
                                <th rowSpan="2" className="border border-black p-1 text-center align-middle w-16">JUMLAH<br/>DARI<br/>KOLOM<br/>(9+10)</th>
                                <th rowSpan="2" className="border border-black p-1 text-center align-middle w-14">POTONGAN<br/>PPH</th>
                                <th rowSpan="2" className="border border-black p-1 text-center align-middle w-16">JUMLAH<br/>BERSIH<br/>(11-12)</th>
                                <th rowSpan="3" className="border border-black p-1 text-center align-middle min-w-[80px]">TANDA TANGAN<br/>/<br/>NO REKENING</th>
                            </tr>
                            
                            {/* Header Row 2 - Date numbers with +/- indicators */}
                            <tr className="bg-gray-50">
                                {[...Array(daysInMonth)].map((_, i) => {
                                    const day = i + 1;
                                    const isHoliday = holidays.includes(day);
                                    return (
                                        <th 
                                            key={day} 
                                            className={`border border-black p-0 w-5 text-center text-[7px] ${isHoliday ? 'bg-red-200' : ''}`}
                                        >
                                            {day}{isHoliday ? '-' : '+'}
                                        </th>
                                    );
                                })}
                                <th className="border border-black p-1 text-center w-10">HARI<br/>KERJA</th>
                                <th className="border border-black p-1 text-center w-10">HARI<br/>LIBUR</th>
                                <th className="border border-black p-1 text-center w-14">LEMBUR</th>
                                <th className="border border-black p-1 text-center w-14">MAKAN<br/>LEMBUR</th>
                            </tr>
                            
                            {/* Header Row 3 - Column numbers */}
                            <tr className="bg-gray-100 text-[7px]">
                                <th className="border border-black p-0 text-center">1</th>
                                <th className="border border-black p-0 text-center">2</th>
                                <th className="border border-black p-0 text-center">3</th>
                                <th className="border border-black p-0 text-center">4</th>
                                {[...Array(daysInMonth)].map((_, i) => (
                                    <th key={i} className="border border-black p-0 text-center">5</th>
                                ))}
                                <th className="border border-black p-0 text-center">6</th>
                                <th className="border border-black p-0 text-center">7</th>
                                <th className="border border-black p-0 text-center">8</th>
                                <th className="border border-black p-0 text-center">9</th>
                                <th className="border border-black p-0 text-center">10</th>
                                <th className="border border-black p-0 text-center">11</th>
                                <th className="border border-black p-0 text-center">12</th>
                                <th className="border border-black p-0 text-center">13</th>
                                <th className="border border-black p-0 text-center">14</th>
                            </tr>
                            
                            {/* Header Row 4 - Note about +/- symbols */}
                            <tr className="text-[6px] italic">
                                <td colSpan="4" className="border border-black p-0 text-center"></td>
                                <td colSpan={daysInMonth} className="border border-black p-0 text-center">
                                    (tanda '-' = Libur ; tanda '+' = Kerja)
                                </td>
                                <td colSpan="9" className="border border-black p-0"></td>
                            </tr>
                        </thead>
                        
                        <tbody>
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan={daysInMonth + 13} className="border border-black p-4 text-center text-gray-500">
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
                                        
                                        {/* NIP - with apostrophe prefix for Excel compatibility */}
                                        <td className="border border-black p-1 text-left text-[7px]">
                                            {emp.nip && emp.nip !== '-' ? `'${emp.nip}` : '-'}
                                        </td>
                                        
                                        {/* GOL */}
                                        <td className="border border-black p-1 text-center">
                                            {emp.golongan ? emp.golongan.split('/')[0] : '-'}
                                        </td>
                                        
                                        {/* Daily Hours (1-31) */}
                                        {[...Array(daysInMonth)].map((_, i) => {
                                            const day = String(i + 1);
                                            const dayData = emp.daily_hours?.[day] || { hours: 0, is_holiday: false };
                                            const hours = dayData.hours || 0;
                                            const isHoliday = holidays.includes(i + 1) || dayData.is_holiday;
                                            
                                            return (
                                                <td 
                                                    key={day} 
                                                    className={`border border-black p-0 text-center text-[7px] ${isHoliday ? 'bg-red-100' : ''}`}
                                                >
                                                    {hours > 0 ? Math.round(hours) : ''}
                                                </td>
                                            );
                                        })}
                                        
                                        {/* JUMLAH JAM HARI KERJA */}
                                        <td className="border border-black p-1 text-center">
                                            {emp.jam_hari_kerja > 0 ? Math.round(emp.jam_hari_kerja) : 0}
                                        </td>
                                        
                                        {/* JUMLAH JAM HARI LIBUR */}
                                        <td className="border border-black p-1 text-center">
                                            {emp.jam_hari_libur > 0 ? Math.round(emp.jam_hari_libur) : 0}
                                        </td>
                                        
                                        {/* JUMLAH MAKAN LEMBUR */}
                                        <td className="border border-black p-1 text-center">
                                            {emp.jumlah_makan || 0}
                                        </td>
                                        
                                        {/* UANG LEMBUR */}
                                        <td className="border border-black p-1 text-right text-[7px] whitespace-nowrap">
                                            {formatRupiah(emp.uang_lembur)}
                                        </td>
                                        
                                        {/* UANG MAKAN LEMBUR */}
                                        <td className="border border-black p-1 text-right text-[7px] whitespace-nowrap">
                                            {formatRupiah(emp.uang_makan)}
                                        </td>
                                        
                                        {/* JUMLAH DARI KOLOM (9+10) */}
                                        <td className="border border-black p-1 text-right font-bold text-[7px] whitespace-nowrap">
                                            {formatRupiah(emp.jumlah_kotor)}
                                        </td>
                                        
                                        {/* POTONGAN PPH */}
                                        <td className="border border-black p-1 text-right text-[7px] whitespace-nowrap">
                                            {formatRupiah(emp.potongan_pph)}
                                        </td>
                                        
                                        {/* JUMLAH BERSIH */}
                                        <td className="border border-black p-1 text-right font-bold text-[7px] whitespace-nowrap">
                                            {formatRupiah(emp.jumlah_bersih)}
                                        </td>
                                        
                                        {/* TANDA TANGAN / NO REKENING */}
                                        <td className="border border-black p-1 text-center text-[7px]">
                                            <div className="h-6 border-b border-dotted mb-1"></div>
                                            <div>{emp.bank_account || '-'}</div>
                                            <div>{emp.bank_name || ''}</div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            
                            {/* TOTAL ROW */}
                            <tr className="font-bold bg-gray-200">
                                <td colSpan={4 + daysInMonth} className="border border-black p-1 text-center">
                                    JUMLAH TOTAL
                                </td>
                                <td className="border border-black p-1 text-center">{Math.round(totals.jam_kerja)}</td>
                                <td className="border border-black p-1 text-center">{Math.round(totals.jam_libur)}</td>
                                <td className="border border-black p-1 text-center">{totals.jumlah_makan}</td>
                                <td className="border border-black p-1 text-right text-[7px] whitespace-nowrap">{formatRupiah(totals.uang_lembur)}</td>
                                <td className="border border-black p-1 text-right text-[7px] whitespace-nowrap">{formatRupiah(totals.uang_makan)}</td>
                                <td className="border border-black p-1 text-right text-[7px] whitespace-nowrap">{formatRupiah(totals.jumlah_kotor)}</td>
                                <td className="border border-black p-1 text-right text-[7px] whitespace-nowrap">{formatRupiah(totals.potongan_pph)}</td>
                                <td className="border border-black p-1 text-right text-[7px] whitespace-nowrap">{formatRupiah(totals.jumlah_bersih)}</td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        </tbody>
                    </table>

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
