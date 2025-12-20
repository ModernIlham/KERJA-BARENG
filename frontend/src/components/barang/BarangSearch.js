import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import api from '../../api/axios';
import { Search } from 'lucide-react';

export default function BarangSearch({ type, onSelect, className }) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search.length > 1) doSearch();
            else setResults([]);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const doSearch = async () => {
        setLoading(true);
        try {
            const endpoint = type === 'persediaan' ? '/api/persediaan/' : '/api/barang';
            // Increased limit to 1000 to resolve "limited to 50 rows" issue
            const res = await api.get(endpoint, { params: { search, limit: 1000 } });
            setResults(res.data.data || []);
            setShowResults(true);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSelect = (item) => {
        onSelect(item);
        setSearch(item.nama_barang);
        setShowResults(false);
    };

    return (
        <div className={`relative ${className}`}>
            <Label>Cari Barang</Label>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                    placeholder="Ketik nama atau kode barang..." 
                    value={search} 
                    onChange={e => { setSearch(e.target.value); setShowResults(true); }}
                    className="pl-9"
                />
            </div>
            {showResults && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {results.map(item => (
                        <div 
                            key={item._id} 
                            className="p-2 text-sm hover:bg-slate-50 cursor-pointer border-b last:border-0"
                            onClick={() => handleSelect(item)}
                        >
                            <div className="font-bold text-slate-800">{item.nama_barang}</div>
                            <div className="text-xs text-slate-500 flex justify-between">
                                <span>{item.kode_barang}</span>
                                <span>Stok: {item.stok}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
