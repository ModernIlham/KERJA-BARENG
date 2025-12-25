import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Search, ChevronRight, ChevronDown, Loader2, Check, X, FolderTree, Package } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * HierarchicalKodeBarangPicker
 * 
 * A dynamic, searchable, hierarchical picker for Kode Barang
 * that syncs with "Referensi Kodefikasi BMN"
 */
export default function HierarchicalKodeBarangPicker({ 
  golongan,
  value,
  onChange,
  disabled = false,
  placeholder = "Pilih Kode Barang..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch all hierarchical data when golongan changes
  useEffect(() => {
    if (golongan && isOpen) {
      fetchHierarchicalData();
    }
  }, [golongan, isOpen]);

  // Update selected item display when value changes
  useEffect(() => {
    if (value && allItems.length > 0) {
      const found = allItems.find(item => item.kode === value);
      setSelectedItem(found || null);
    } else if (!value) {
      setSelectedItem(null);
    }
  }, [value, allItems]);

  const fetchHierarchicalData = async () => {
    setLoading(true);
    try {
      // Fetch all levels for this golongan from Referensi Kodefikasi BMN
      const res = await api.get(`/api/referensi/all-levels/${golongan}`);
      setAllItems(res.data || []);
      
      // Auto-expand first 2 levels
      const toExpand = new Set();
      res.data.forEach(item => {
        if (item.level <= 2) {
          toExpand.add(item.kode);
        }
      });
      setExpandedNodes(toExpand);
    } catch (e) {
      console.error('Error fetching hierarchical data:', e);
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical tree structure
  const treeData = useMemo(() => {
    if (!allItems.length) return [];
    
    // Group by level and build parent-child relationships
    const itemsByKode = {};
    allItems.forEach(item => {
      itemsByKode[item.kode] = { ...item, children: [] };
    });

    // Determine parent for each item based on kode prefix
    const roots = [];
    allItems.forEach(item => {
      const node = itemsByKode[item.kode];
      let parentKode = null;
      
      // Find parent based on level hierarchy
      if (item.level === 2) parentKode = item.kode.substring(0, 1);
      else if (item.level === 3) parentKode = item.kode.substring(0, 3);
      else if (item.level === 4) parentKode = item.kode.substring(0, 5);
      else if (item.level === 5) parentKode = item.kode.substring(0, 7);
      
      if (parentKode && itemsByKode[parentKode]) {
        itemsByKode[parentKode].children.push(node);
      } else if (item.level === 1) {
        roots.push(node);
      } else {
        // If no parent found, add to roots
        roots.push(node);
      }
    });

    return roots;
  }, [allItems]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems;
    
    const searchLower = search.toLowerCase();
    return allItems.filter(item => 
      item.kode.toLowerCase().includes(searchLower) ||
      item.uraian.toLowerCase().includes(searchLower)
    );
  }, [allItems, search]);

  // When searching, show flat list; otherwise show tree
  const isSearching = search.trim().length > 0;

  const toggleExpand = (kode) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(kode)) {
      newExpanded.delete(kode);
    } else {
      newExpanded.add(kode);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelect = (item) => {
    // Only allow selecting level 5 items (sub-sub kelompok)
    if (item.level === 5) {
      setSelectedItem(item);
      onChange(item.kode);
      setIsOpen(false);
      setSearch('');
    } else {
      // Toggle expand for non-leaf nodes
      toggleExpand(item.kode);
    }
  };

  const getLevelInfo = (level) => {
    const levels = {
      1: { name: 'Golongan', color: 'bg-blue-100 text-blue-800', icon: '📁' },
      2: { name: 'Bidang', color: 'bg-purple-100 text-purple-800', icon: '📂' },
      3: { name: 'Kelompok', color: 'bg-green-100 text-green-800', icon: '📂' },
      4: { name: 'Sub Kelompok', color: 'bg-orange-100 text-orange-800', icon: '📂' },
      5: { name: 'Sub-Sub Kelompok', color: 'bg-cyan-100 text-cyan-800', icon: '📄' }
    };
    return levels[level] || { name: `Level ${level}`, color: 'bg-slate-100', icon: '📄' };
  };

  // Render tree node recursively
  const renderTreeNode = useCallback((node, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.kode);
    const isSelectable = node.level === 5;
    const isSelected = value === node.kode;
    const levelInfo = getLevelInfo(node.level);

    return (
      <div key={node.kode}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-2 rounded cursor-pointer transition-colors",
            isSelected ? "bg-blue-100 border-l-4 border-blue-500" : "hover:bg-slate-50",
            !isSelectable && "text-slate-700"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleSelect(node)}
        >
          {/* Expand/Collapse icon */}
          {hasChildren ? (
            <button 
              className="p-0.5 hover:bg-slate-200 rounded"
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.kode); }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-5" />
          )}
          
          {/* Icon */}
          <span className="text-sm">{levelInfo.icon}</span>
          
          {/* Kode */}
          <span className="font-mono text-xs font-medium text-slate-600 min-w-[80px]">
            {node.kode}
          </span>
          
          {/* Uraian */}
          <span className={cn(
            "flex-1 text-sm truncate",
            isSelectable ? "font-medium" : ""
          )}>
            {node.uraian}
          </span>
          
          {/* Level badge */}
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", levelInfo.color)}>
            {levelInfo.name}
          </Badge>
          
          {/* Selected indicator */}
          {isSelected && <Check size={16} className="text-blue-600" />}
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedNodes, value]);

  // Render flat search results
  const renderSearchResults = () => {
    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500">
          Tidak ditemukan kode barang dengan kata kunci &quot;{search}&quot;
        </div>
      );
    }

    return filteredItems.map(item => {
      const isSelectable = item.level === 5;
      const isSelected = value === item.kode;
      const levelInfo = getLevelInfo(item.level);

      return (
        <div
          key={item.kode}
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors border-b",
            isSelected ? "bg-blue-100 border-l-4 border-blue-500" : "hover:bg-slate-50",
            !isSelectable && "opacity-60"
          )}
          onClick={() => isSelectable && handleSelect(item)}
        >
          <span className="font-mono text-xs font-bold text-slate-700 min-w-[90px]">
            {item.kode}
          </span>
          <span className={cn("flex-1 text-sm", isSelectable ? "font-medium" : "")}>
            {item.uraian}
          </span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", levelInfo.color)}>
            {levelInfo.name}
          </Badge>
          {isSelected && <Check size={16} className="text-blue-600 shrink-0" />}
        </div>
      );
    });
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    setSelectedItem(null);
    onChange('');
  };

  return (
    <div className="space-y-2">
      {/* Trigger Button */}
      <div 
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors",
          disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "hover:border-slate-400",
          !golongan && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && golongan && setIsOpen(true)}
      >
        {selectedItem ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Package size={14} className="text-blue-600 shrink-0" />
            <span className="font-mono text-xs font-bold text-blue-600">{selectedItem.kode}</span>
            <span className="text-sm truncate">{selectedItem.uraian}</span>
          </div>
        ) : (
          <span className="text-slate-500 text-sm">{placeholder}</span>
        )}
        
        <div className="flex items-center gap-1 shrink-0">
          {selectedItem && !disabled && (
            <button 
              className="p-1 hover:bg-slate-100 rounded"
              onClick={clearSelection}
            >
              <X size={14} className="text-slate-400" />
            </button>
          )}
          <FolderTree size={16} className="text-slate-400" />
        </div>
      </div>

      {/* Dialog Picker */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="text-blue-600" />
              Pilih Kode Barang Baru
            </DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              placeholder="Cari berdasarkan kode atau nama barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {search && (
              <button 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setSearch('')}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              {isSearching 
                ? `${filteredItems.filter(i => i.level === 5).length} item ditemukan` 
                : `${allItems.filter(i => i.level === 5).length} kode barang tersedia`}
            </span>
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] bg-cyan-50">Sub-Sub Kelompok</Badge>
              = dapat dipilih
            </span>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-2 min-h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-blue-600 mr-2" />
                  <span className="text-slate-500">Memuat data dari Referensi Kodefikasi BMN...</span>
                </div>
              ) : isSearching ? (
                renderSearchResults()
              ) : treeData.length > 0 ? (
                treeData.map(node => renderTreeNode(node))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Tidak ada data kode barang untuk golongan ini.
                  <br />
                  <span className="text-xs">Pastikan data sudah diimpor di halaman Referensi Kodefikasi BMN.</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-between items-center pt-2 border-t">
            <div className="text-xs text-slate-500">
              💡 Tip: Gunakan pencarian untuk menemukan kode barang dengan cepat
            </div>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
