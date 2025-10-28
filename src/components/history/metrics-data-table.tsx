'use client';

import { useState, useMemo } from 'react';
import { ProductionMetric } from '@/context/DataProvider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Search,
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';
import { getLSFBadgeVariant, getTemperatureStatus } from '@/lib/thresholds';

interface MetricsDataTableProps {
  data: ProductionMetric[];
}

type SortField = keyof ProductionMetric;
type SortDirection = 'asc' | 'desc' | null;

export function MetricsDataTable({ data }: MetricsDataTableProps) {
  const [sortField, setSortField] = useState<SortField | null>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="w-4 h-4 text-primary" />;
    }
    return <ArrowUp className="w-4 h-4 text-primary" />;
  };

  const processedData = useMemo(() => {
    let filtered = [...data];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((metric) => {
        return (
          metric.timestamp.toLowerCase().includes(query) ||
          metric.plant_id.toLowerCase().includes(query) ||
          metric.kiln_temp.toString().includes(query) ||
          metric.lsf.toString().includes(query)
        );
      });
    }

    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, sortField, sortDirection]);

  const handleExport = () => {
    const headers = [
      'Timestamp',
      'Plant ID',
      'Kiln Temp (°C)',
      'Feed Rate (TPH)',
      'LSF (%)',
      'CaO (%)',
      'SiO₂ (%)',
      'Al₂O₃ (%)',
      'Fe₂O₃ (%)',
      'C₃S (%)',
      'C₂S (%)',
      'C₃A (%)',
      'C₄AF (%)',
    ];

    const rows = processedData.map((m) => [
      new Date(m.timestamp).toISOString(),
      m.plant_id,
      m.kiln_temp,
      m.feed_rate,
      m.lsf,
      m.cao,
      m.sio2,
      m.al2o3,
      m.fe2o3,
      m.c3s,
      m.c2s,
      m.c3a,
      m.c4af,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `production-metrics-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full md:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by timestamp, plant ID, or values..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground font-mono">
          Showing <span className="font-bold text-foreground">{processedData.length}</span> of{' '}
          <span className="font-bold text-foreground">{data.length}</span> records
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-secondary/50">
                <TableHead
                  className="cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center gap-2 font-mono uppercase text-xs">
                    Timestamp
                    {getSortIcon('timestamp')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => handleSort('kiln_temp')}
                >
                  <div className="flex items-center gap-2 font-mono uppercase text-xs">
                    Kiln Temp
                    {getSortIcon('kiln_temp')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => handleSort('feed_rate')}
                >
                  <div className="flex items-center gap-2 font-mono uppercase text-xs">
                    Feed Rate
                    {getSortIcon('feed_rate')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => handleSort('lsf')}
                >
                  <div className="flex items-center gap-2 font-mono uppercase text-xs">
                    LSF
                    {getSortIcon('lsf')}
                  </div>
                </TableHead>
                <TableHead className="font-mono uppercase text-xs">CaO</TableHead>
                <TableHead className="font-mono uppercase text-xs">SiO₂</TableHead>
                <TableHead className="font-mono uppercase text-xs">Al₂O₃</TableHead>
                <TableHead className="font-mono uppercase text-xs">Fe₂O₃</TableHead>
                <TableHead className="font-mono uppercase text-xs">C₃S</TableHead>
                <TableHead className="font-mono uppercase text-xs">C₂S</TableHead>
                <TableHead className="font-mono uppercase text-xs">C₃A</TableHead>
                <TableHead className="font-mono uppercase text-xs">C₄AF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12">
                    <p className="text-muted-foreground text-sm">No records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                processedData.map((metric) => {
                  const tempStatus = getTemperatureStatus(metric.kiln_temp);
                  const lsfBadge = getLSFBadgeVariant(metric.lsf);

                  return (
                    <TableRow key={metric.id} className="hover:bg-secondary/50 transition-colors border-b border-border/50">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatTimestamp(metric.timestamp)}
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono text-xs font-bold ${tempStatus.color}`}>
                          {formatNumber(metric.kiln_temp, { decimals: 1 })}°C
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold">
                        {formatNumber(metric.feed_rate, { decimals: 1 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={lsfBadge} className="font-mono text-xs">
                          {formatNumber(metric.lsf, { decimals: 1 })}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatNumber(metric.cao, { decimals: 2 })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatNumber(metric.sio2, { decimals: 2 })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatNumber(metric.al2o3, { decimals: 2 })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatNumber(metric.fe2o3, { decimals: 2 })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatNumber(metric.c3s, { decimals: 1 })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatNumber(metric.c2s, { decimals: 1 })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatNumber(metric.c3a, { decimals: 1 })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatNumber(metric.c4af, { decimals: 1 })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}