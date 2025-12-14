import React from 'react';
import { TableCell, TableRow } from './table';
import { Skeleton } from './skeleton'; // Assuming you have or will use a basic skeleton div

// Fallback basic skeleton if shadcn skeleton not available
const BasicSkeleton = ({ className }) => (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

export function TableSkeleton({ columns = 5, rows = 10 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={j}>
              <BasicSkeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
