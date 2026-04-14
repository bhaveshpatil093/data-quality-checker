/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  BarChart3, 
  Table as TableIcon,
  X,
  RefreshCcw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnalysisResult {
  fileName: string;
  fileSize: number;
  rowCount: number;
  colCount: number;
  columns: ColumnInfo[];
  duplicateRows: number;
  missingValuesTotal: number;
  healthScore: number;
  overallInsight: string;
  recommendations: string[];
}

interface ColumnInfo {
  name: string;
  type: 'numeric' | 'string' | 'date' | 'boolean' | 'unknown';
  isMixedType: boolean;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  outlierCount: number;
  recommendation?: string;
  stats?: {
    min: number;
    max: number;
    mean: number;
  };
}

export default function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);

  const ingestData = async (file: File): Promise<any[]> => {
    setPipelineStatus("Ingesting data...");
    
    if (file.size === 0) {
      throw new Error("The uploaded file is empty. Please provide a valid dataset.");
    }

    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            reject(new Error("The CSV file appears to be corrupted or improperly formatted."));
          } else if (results.data.length === 0) {
            reject(new Error("No data records found in the file. Ensure it contains more than just headers."));
          } else {
            resolve(results.data);
          }
        },
        error: (err) => reject(new Error(`Failed to parse CSV: ${err.message}`))
      });
    });
  };

  const processData = async (data: any[]): Promise<ColumnInfo[]> => {
    setPipelineStatus("Processing data pipeline...");
    // Simulate a small delay for "large-scale" feel
    await new Promise(r => setTimeout(r, 800));

    if (!data || data.length === 0) {
      throw new Error("Processing failed: No data available for analysis.");
    }

    const headers = Object.keys(data[0]);
    if (headers.length === 0) {
      throw new Error("The file contains no recognizable columns.");
    }

    const rowCount = data.length;

    return headers.map(header => {
      const values = data.map(row => row[header]);
      const nonMissingValues = values.filter(v => v !== null && v !== undefined && v !== '');
      const missingCount = values.length - nonMissingValues.length;
      const uniqueCount = new Set(nonMissingValues).size;

      const typesFound = new Set<ColumnInfo['type']>();
      nonMissingValues.forEach(val => {
        if (!isNaN(Number(val)) && typeof val !== 'boolean' && val !== '') {
          typesFound.add('numeric');
        } else if (typeof val === 'boolean' || val === 'true' || val === 'false') {
          typesFound.add('boolean');
        } else if (!isNaN(Date.parse(val)) && isNaN(Number(val))) {
          typesFound.add('date');
        } else {
          typesFound.add('string');
        }
      });

      const isMixedType = typesFound.size > 1;
      const type: ColumnInfo['type'] = typesFound.size === 1 ? Array.from(typesFound)[0] : (typesFound.size > 1 ? 'string' : 'unknown');

      let stats;
      let outlierCount = 0;
      if (type === 'numeric' || typesFound.has('numeric')) {
        const numericValues = nonMissingValues.map(v => Number(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
        if (numericValues.length > 0) {
          const min = numericValues[0];
          const max = numericValues[numericValues.length - 1];
          const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          stats = { min, max, mean };

          if (numericValues.length >= 4) {
            const q1 = numericValues[Math.floor(numericValues.length * 0.25)];
            const q3 = numericValues[Math.floor(numericValues.length * 0.75)];
            const iqr = q3 - q1;
            outlierCount = numericValues.filter(v => v < (q1 - 1.5 * iqr) || v > (q3 + 1.5 * iqr)).length;
          }
        }
      }

      let recommendation;
      if (missingCount > 0) {
        recommendation = type === 'numeric' ? "Consider filling missing values using mean or median." : "Review missing entries to ensure complete data records.";
      } else if (isMixedType) {
        recommendation = "Standardize formats to ensure consistent data types.";
      } else if (outlierCount > 0) {
        recommendation = "Verify high/low values to confirm they are not errors.";
      }

      return {
        name: header,
        type,
        isMixedType,
        missingCount,
        missingPercentage: (missingCount / rowCount) * 100,
        uniqueCount,
        outlierCount,
        recommendation,
        stats
      };
    });
  };

  const generateOutput = (data: any[], columns: ColumnInfo[], fileName: string, fileSize: number): AnalysisResult => {
    setPipelineStatus("Generating output...");
    const rowCount = data.length;
    const colCount = columns.length;
    
    const stringifiedRows = data.map(row => JSON.stringify(row));
    const duplicateRows = rowCount - new Set(stringifiedRows).size;
    const missingValuesTotal = columns.reduce((acc, c) => acc + c.missingCount, 0);

    const totalCells = rowCount * colCount;
    const mixedColumnsCount = columns.filter(c => c.isMixedType).length;
    const totalOutliers = columns.reduce((acc, c) => acc + c.outlierCount, 0);

    const missingPenalty = (missingValuesTotal / totalCells) * 60;
    const duplicatePenalty = (duplicateRows / rowCount) * 20;
    const inconsistencyPenalty = (totalOutliers / totalCells) * 10 + (mixedColumnsCount / colCount) * 10;
    const healthScore = Math.max(0, Math.round(100 - missingPenalty - duplicatePenalty - inconsistencyPenalty));

    let overallInsight = "Your dataset is in good condition and ready for analysis.";
    if (rowCount < 5) {
      overallInsight = "Dataset size is very small. Statistical insights may be limited.";
    } else if (healthScore < 50) {
      overallInsight = "Significant data quality issues detected. Critical cleaning is required before use.";
    } else if (healthScore < 80) {
      overallInsight = "Moderate quality issues found. Some cleaning will improve reliability.";
    }

    return {
      fileName,
      fileSize,
      rowCount,
      colCount,
      columns,
      duplicateRows,
      missingValuesTotal,
      healthScore,
      overallInsight,
      recommendations: [] // Not used in UI currently but kept for interface
    };
  };

  const runDatabricksPipeline = async (file: File | string) => {
    setError(null);
    setIsLoading(true);
    setResult(null);

    if (typeof file === 'string') {
      setCurrentFileName("sample_dataset.csv");
    } else {
      setCurrentFileName(file.name);
    }

    try {
      let data;
      if (typeof file === 'string') {
        setPipelineStatus("Ingesting sample data...");
        await new Promise(r => setTimeout(r, 600));
        data = Papa.parse(file, { header: true, skipEmptyLines: true }).data;
      } else {
        data = await ingestData(file);
      }

      const columns = await processData(data);
      const output = generateOutput(data, columns, typeof file === 'string' ? "sample_dataset.csv" : file.name, typeof file === 'string' ? 1024 * 45 : file.size);
      
      setResult(output);
    } catch (err: any) {
      setError(`Pipeline Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setPipelineStatus(null);
    }
  };

  const loadSampleData = () => {
    const sampleCsv = `id,name,email,age,status
1,John Doe,john@example.com,28,active
2,Jane Smith,jane@example.com,,active
3,Bob Wilson,bob@example.com,45,pending
4,Alice Brown,alice@example.com,32,active
5,John Doe,john@example.com,28,active
6,Charlie Davis,charlie@invalid,twenty,active
7,Eva Green,,24,pending
8,Frank White,frank@example.com,150,active
9,Grace Hopper,grace@example.com,85,active
10,Grace Hopper,grace@example.com,85,active`;
    runDatabricksPipeline(sampleCsv);
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError("Invalid file type. Please upload a CSV file.");
      return;
    }
    runDatabricksPipeline(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return { label: 'Good', color: 'text-green-600' };
    if (score >= 50) return { label: 'Moderate', color: 'text-yellow-600' };
    return { label: 'Poor', color: 'text-accent' };
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setCurrentFileName(null);
    setPipelineStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background p-8 md:p-24 pb-24 md:pb-32 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* Top Section */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-black tracking-tighter uppercase mb-4">
            Data Quality Checker
          </h1>
          <p className="text-primary/70 text-lg font-medium">
            Upload a dataset to instantly evaluate its quality.
          </p>
        </motion.header>

        <main className="space-y-16">
          {/* Center Section: Upload Box */}
          <section>
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={`
                border-2 border-primary p-20 md:p-32 flex flex-col items-center justify-center transition-all
                ${isDragging ? 'bg-accent/10 border-accent' : 'bg-white border-primary'}
                ${isLoading ? 'opacity-50 pointer-events-none cursor-wait' : 'cursor-pointer'}
              `}
              onClick={() => !isLoading && document.getElementById('fileInput')?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".csv"
                className="hidden"
                disabled={isLoading}
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <div className="text-center">
                {isLoading ? (
                  <div className="space-y-4">
                    <p className="text-sm font-mono text-primary/40 uppercase tracking-widest animate-pulse">
                      {currentFileName}
                    </p>
                    <p className="text-2xl font-bold uppercase">
                      {pipelineStatus || 'Analyzing dataset...'}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold uppercase mb-2">
                      Click or Drag CSV File
                    </p>
                    <p className="text-primary/40 font-mono text-xs uppercase tracking-widest">
                      Supported format: .CSV
                    </p>
                  </>
                )}
              </div>
            </div>

            {!isLoading && !result && (
              <div className="mt-8 text-center">
                <button 
                  onClick={loadSampleData}
                  className="text-[10px] font-mono text-primary/40 uppercase tracking-[0.2em] hover:text-accent transition-colors border-b border-transparent hover:border-accent"
                >
                  Try with sample dataset
                </button>
              </div>
            )}

            {error && (
              <div className="mt-6 border-2 border-accent p-6 flex items-center justify-between bg-white shadow-[4px_4px_0px_0px_rgba(215,118,85,1)]">
                <div className="flex items-center gap-4">
                  <AlertCircle className="text-accent" size={24} />
                  <div>
                    <p className="text-xs font-mono text-accent uppercase font-bold mb-1">System Error</p>
                    <p className="text-sm font-bold uppercase text-primary">{error}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="hover:bg-accent/10 p-2 transition-colors"
                >
                  <X size={20} className="text-accent" />
                </button>
              </div>
            )}
          </section>

          {/* Bottom Section: Results Panel */}
          <AnimatePresence>
            {result && (
              <motion.section
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-16 pt-16 border-t border-primary/10"
              >
                {/* Header & Score */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-6xl font-black uppercase tracking-tighter">
                        {result.healthScore}
                        <span className="text-2xl text-primary/30 ml-1">/100</span>
                      </h2>
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 border border-current w-fit ${getHealthLabel(result.healthScore).color}`}>
                          {getHealthLabel(result.healthScore).label}
                        </span>
                        <p className="text-[10px] font-mono text-primary/40 uppercase mt-1 tracking-widest">Data Health Score</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-primary/60 uppercase tracking-tight max-w-md">
                        {result.overallInsight}
                      </p>
                      <p className="text-[9px] font-mono text-primary/30 uppercase tracking-[0.2em]">
                        Processed using Databricks-powered data pipeline
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={reset}
                    className="bg-accent text-white px-8 py-3 text-sm font-bold uppercase hover:opacity-90 transition-opacity shadow-[4px_4px_0px_0px_rgba(31,31,30,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    New Analysis
                  </button>
                </div>

                {/* Issues Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border-2 border-primary p-6 bg-white">
                    <p className="text-[10px] font-mono text-primary/40 uppercase mb-4 tracking-widest">Missing Values</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold">{result.missingValuesTotal.toLocaleString()}</p>
                      <p className="text-xs font-bold text-primary/40 uppercase">Total Cells</p>
                    </div>
                  </div>
                  <div className="border-2 border-primary p-6 bg-white">
                    <p className="text-[10px] font-mono text-primary/40 uppercase mb-4 tracking-widest">Duplicate Rows</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold">{result.duplicateRows.toLocaleString()}</p>
                      <p className="text-xs font-bold text-primary/40 uppercase">Identical Entries</p>
                    </div>
                  </div>
                  <div className="border-2 border-primary p-6 bg-white">
                    <p className="text-[10px] font-mono text-primary/40 uppercase mb-4 tracking-widest">Inconsistencies</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold">
                        {result.columns.reduce((acc, c) => acc + (c.isMixedType ? 1 : 0) + c.outlierCount, 0).toLocaleString()}
                      </p>
                      <p className="text-xs font-bold text-primary/40 uppercase">Flags Detected</p>
                    </div>
                  </div>
                </div>

                {/* Column Insights */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold uppercase tracking-tight border-b-2 border-primary pb-2">Column-Level Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.columns.filter(c => c.missingCount > 0 || c.isMixedType || c.outlierCount > 0).length > 0 ? (
                      result.columns
                        .filter(c => c.missingCount > 0 || c.isMixedType || c.outlierCount > 0)
                        .map((col, idx) => (
                          <div key={idx} className="border border-primary/20 p-5 bg-white space-y-3">
                            <div className="flex justify-between items-start">
                              <p className="font-bold uppercase text-sm">{col.name}</p>
                              <span className="text-[9px] font-mono text-primary/40 uppercase border border-primary/10 px-1.5">{col.type}</span>
                            </div>
                            <ul className="space-y-2">
                              {col.missingCount > 0 && (
                                <li className="flex items-center gap-2 text-[11px] font-bold text-accent uppercase">
                                  <AlertCircle size={12} />
                                  {col.missingCount} missing values ({col.missingPercentage.toFixed(1)}%)
                                </li>
                              )}
                              {col.isMixedType && (
                                <li className="flex items-center gap-2 text-[11px] font-bold text-accent uppercase">
                                  <AlertCircle size={12} />
                                  Mixed data types detected
                                </li>
                              )}
                              {col.outlierCount > 0 && (
                                <li className="flex items-center gap-2 text-[11px] font-bold text-accent uppercase">
                                  <AlertCircle size={12} />
                                  {col.outlierCount} statistical outliers identified
                                </li>
                              )}
                            </ul>
                            {col.recommendation && (
                              <div className="pt-2 border-t border-primary/5">
                                <p className="text-[10px] font-mono text-primary/40 uppercase mb-1">Recommendation</p>
                                <p className="text-[11px] font-medium text-primary/80">{col.recommendation}</p>
                              </div>
                            )}
                          </div>
                        ))
                    ) : (
                      <div className="col-span-full border border-primary/10 p-8 text-center bg-white">
                        <p className="text-sm font-bold uppercase text-primary/30 tracking-widest">No critical issues detected in columns</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Data Table */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold uppercase tracking-tight border-b-2 border-primary pb-2">Full Schema Breakdown</h3>
                  <div className="border-2 border-primary overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse bg-white">
                        <thead>
                          <tr className="bg-primary text-white">
                            <th className="p-4 text-[10px] font-mono uppercase tracking-widest">Column Name</th>
                            <th className="p-4 text-[10px] font-mono uppercase tracking-widest">Type</th>
                            <th className="p-4 text-[10px] font-mono uppercase tracking-widest">Missing</th>
                            <th className="p-4 text-[10px] font-mono uppercase tracking-widest">Unique</th>
                            <th className="p-4 text-[10px] font-mono uppercase tracking-widest">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.columns.map((col, idx) => (
                            <tr key={idx} className="border-b border-primary/10 last:border-0 hover:bg-background transition-colors">
                              <td className="p-4 font-bold text-sm">{col.name}</td>
                              <td className="p-4">
                                <span className="text-[10px] font-bold uppercase border border-primary/20 px-2 py-0.5">
                                  {col.type}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={col.missingCount > 0 ? 'text-accent font-bold' : 'text-primary/40'}>
                                  {col.missingCount.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-4 font-mono text-sm">{col.uniqueCount.toLocaleString()}</td>
                              <td className="p-4">
                                {col.missingCount > 0 || col.isMixedType || col.outlierCount > 0 ? (
                                  <span className="text-[10px] font-bold text-accent uppercase">Attention</span>
                                ) : (
                                  <span className="text-[10px] text-primary/20 uppercase font-mono">Verified</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-background border-t border-primary/10 py-3 px-4 z-50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[10px] md:text-xs font-medium tracking-tight text-primary/80">
            Built with 🤎 for the Databricks-Accenture Hackathon by Team Elite (Bhavesh Patil & Shreya Shelar)
          </p>
        </div>
      </footer>
    </div>
  );
}
