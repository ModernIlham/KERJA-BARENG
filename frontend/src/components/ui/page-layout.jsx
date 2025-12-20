import React from 'react';
import { Separator } from '@/components/ui/separator';

export const PageHeader = ({ title, description, actions }) => {
  return (
    <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

export const PageContainer = ({ children, className = "" }) => {
  return (
    <div className={`p-6 space-y-6 min-h-screen bg-slate-50/50 ${className}`}>
      {children}
    </div>
  );
};

export const SectionHeader = ({ title, icon: Icon, action }) => {
  return (
    <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-blue-600" />}
            {title}
        </h3>
        {action}
    </div>
  );
};
