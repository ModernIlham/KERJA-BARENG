import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

/**
 * Custom hook untuk logging aktivitas dari frontend
 * 
 * Usage:
 * const { logActivity } = useActivityLogger();
 * logActivity('VIEW', 'Pegawai', null, 'Melihat daftar pegawai');
 */
export function useActivityLogger() {
    const { user } = useAuth();

    const logActivity = useCallback(async (action, module, targetId = null, details = null, metadata = null) => {
        // Jangan log jika tidak ada user (belum login)
        if (!user) return;

        try {
            await api.post('/api/activity/log', {
                action,
                module,
                target_id: targetId,
                details,
                metadata,
                page_url: window.location.pathname
            });
        } catch (error) {
            // Silent fail - logging tidak boleh mengganggu UX
            console.warn('Failed to log activity:', error);
        }
    }, [user]);

    // Pre-defined logging functions untuk kemudahan
    const logView = useCallback((module, details) => {
        logActivity('VIEW', module, null, details);
    }, [logActivity]);

    const logCreate = useCallback((module, targetId, details, metadata) => {
        logActivity('CREATE', module, targetId, details, metadata);
    }, [logActivity]);

    const logUpdate = useCallback((module, targetId, details, metadata) => {
        logActivity('UPDATE', module, targetId, details, metadata);
    }, [logActivity]);

    const logDelete = useCallback((module, targetId, details) => {
        logActivity('DELETE', module, targetId, details);
    }, [logActivity]);

    const logExport = useCallback((module, details, metadata) => {
        logActivity('EXPORT', module, null, details, metadata);
    }, [logActivity]);

    const logApprove = useCallback((module, targetId, details) => {
        logActivity('APPROVE', module, targetId, details);
    }, [logActivity]);

    const logReject = useCallback((module, targetId, details) => {
        logActivity('REJECT', module, targetId, details);
    }, [logActivity]);

    return {
        logActivity,
        logView,
        logCreate,
        logUpdate,
        logDelete,
        logExport,
        logApprove,
        logReject
    };
}

export default useActivityLogger;
