import React from 'react';
import KanbanBoard from '../components/KanbanBoard';

const ManajemenTugas = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Manajemen Tugas Tim</h1>
                <p className="text-slate-500 text-sm">Kanban board untuk memantau aktivitas dan tugas tim.</p>
            </div>
            <KanbanBoard />
        </div>
    );
};

export default ManajemenTugas;
