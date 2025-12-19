import React from 'react';

export const StockOpnamePrintView = React.forwardRef(({ 
    items, 
    groupedItems, 
    instansi, 
    period, 
    signatories,
    date // Date object
}, ref) => {
    
    // Helper to format date
    const formatDate = (dateObj) => {
        if (!dateObj) return "";
        return new Date(dateObj).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getDayName = (dateObj) => {
        if (!dateObj) return "";
        return new Date(dateObj).toLocaleDateString('id-ID', { weekday: 'long' });
    };

    return (
        <div className="hidden print:block font-serif text-black" ref={ref}>
            <style>{`
                @media print {
                    @page { 
                        size: A4; 
                        margin: 1.5cm; 
                    }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        color: black !important;
                    }
                    .page-break { 
                        page-break-before: always; 
                    }
                    .print-table th, .print-table td {
                        border: 1px solid black;
                        padding: 4px 8px;
                        font-size: 11px;
                    }
                    .print-table th {
                        background-color: #f0f0f0 !important;
                        font-weight: bold;
                        text-align: center;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>

            {Object.entries(groupedItems).map(([group, groupItems], groupIdx) => (
                <div key={group} className={groupIdx > 0 ? "page-break" : "mb-8"}>
                    {/* KOP SURAT */}
                    <div className="border-b-4 border-double border-black pb-2 mb-4 flex items-center gap-4">
                        {instansi?.logo_url && (
                            <img src={instansi.logo_url} alt="Logo" className="h-20 w-auto object-contain" />
                        )}
                        <div className="flex-1 text-center">
                            <h2 className="font-bold text-lg uppercase">{instansi?.nama_instansi || "NAMA INSTANSI PEMERINTAH"}</h2>
                            <p className="text-sm">{instansi?.alamat || "Alamat Instansi"}</p>
                            <div className="flex justify-center gap-4 text-xs mt-1">
                                {instansi?.telepon && <span>Telp: {instansi.telepon}</span>}
                                {instansi?.email && <span>Email: {instansi.email}</span>}
                            </div>
                        </div>
                    </div>

                    {/* JUDUL BERITA ACARA */}
                    <div className="text-center mb-6">
                        <h3 className="font-bold text-base underline uppercase">BERITA ACARA STOCK OPNAME PERSEDIAAN</h3>
                        <p className="text-sm mt-1">Nomor: .......................................</p>
                    </div>

                    {/* KALIMAT PEMBUKA */}
                    <div className="text-sm mb-4 text-justify leading-relaxed">
                        <p>
                            Pada hari ini <strong>{getDayName(date)}</strong> tanggal <strong>{formatDate(date)}</strong>, 
                            kami yang bertanda tangan di bawah ini telah melakukan Stock Opname (Pencacahan Fisik) 
                            terhadap persediaan barang <strong>Sub Kelompok: {group}</strong> pada Gudang Persediaan.
                        </p>
                        <p className="mt-2">
                            Adapun hasil pencacahan fisik adalah sebagai berikut:
                        </p>
                    </div>

                    {/* TABEL DATA */}
                    <table className="w-full print-table border-collapse mb-6">
                        <thead>
                            <tr>
                                <th rowSpan="2" className="w-[5%]">No</th>
                                <th rowSpan="2" className="w-[15%]">Kode Barang</th>
                                <th rowSpan="2" className="w-[30%]">Nama Barang</th>
                                <th rowSpan="2" className="w-[10%]">Satuan</th>
                                <th colSpan="3">Jumlah Barang</th>
                                <th rowSpan="2" className="w-[15%]">Keterangan</th>
                            </tr>
                            <tr>
                                <th className="w-[8%]">Admin</th>
                                <th className="w-[8%]">Fisik</th>
                                <th className="w-[8%]">Selisih</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupItems.map((item, idx) => {
                                // Calculate values
                                const stokSistem = item.stok;
                                const stokFisik = item.fisik !== undefined ? parseInt(item.fisik) : ""; // From user input attached to item
                                const selisih = (stokFisik !== "" && !isNaN(stokFisik)) ? stokFisik - stokSistem : "";
                                
                                return (
                                    <tr key={item._id || idx}>
                                        <td className="text-center">{idx + 1}</td>
                                        <td className="text-center">{item.kode_barang}</td>
                                        <td>{item.nama_barang}</td>
                                        <td className="text-center">{item.satuan}</td>
                                        <td className="text-center">{stokSistem}</td>
                                        <td className="text-center font-bold">{stokFisik}</td>
                                        <td className="text-center">{selisih !== 0 && selisih !== "" ? (selisih > 0 ? `+${selisih}` : selisih) : "-"}</td>
                                        <td>{item.keterangan || ""}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* PENUTUP */}
                    <p className="text-sm mb-8 text-justify">
                        Demikian Berita Acara Stock Opname ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
                    </p>

                    {/* TANDA TANGAN */}
                    <div className="grid grid-cols-3 gap-4 text-center text-sm break-inside-avoid">
                        {/* Kolom 1: Pengurus Barang */}
                        <div>
                            <p className="mb-16">Pengurus Barang,</p>
                            <p className="font-bold underline">{signatories?.pengurus?.nama || "( ........................... )"}</p>
                            <p>NIP. {signatories?.pengurus?.nip || "..........................."}</p>
                        </div>

                        {/* Kolom 2: Pejabat Penatausahaan */}
                        <div>
                            <p className="mb-16">Mengetahui,<br/>Pejabat Penatausahaan</p>
                            <p className="font-bold underline">{signatories?.pejabat?.nama || "( ........................... )"}</p>
                            <p>NIP. {signatories?.pejabat?.nip || "..........................."}</p>
                        </div>

                        {/* Kolom 3: Kuasa Pengguna Barang */}
                        <div>
                            <p className="mb-16">Menyetujui,<br/>Kuasa Pengguna Barang</p>
                            <p className="font-bold underline">{signatories?.kuasa?.nama || "( ........................... )"}</p>
                            <p>NIP. {signatories?.kuasa?.nip || "..........................."}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
});

export default StockOpnamePrintView;
