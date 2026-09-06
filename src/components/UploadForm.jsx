import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import SUBJECTS_BY_YEAR_SEMESTER from '../data/subjects.json';
import { getBranchesForSubject } from '../utils/subjectHelper';
import { 
  FiTrash2, 
  FiPlus, 
  FiFileText, 
  FiImage, 
  FiCheck, 
  FiLayers, 
  FiArrowLeft,
  FiUploadCloud
} from 'react-icons/fi';

// TODO: Sector 128 branch prefixes
const BRANCH_BY_PREFIX = {
  'A': 'ECE',
  'B': 'CSEIT',
  'C': 'BT',
  'G': 'MNC',
  'D': 'RAI',
};

const getBranchFromBatch = (batchValue) => {
  if (!batchValue) return '*';
  
  const batches = batchValue
    .split(/[,\s]+/)
    .map(b => b.trim().toUpperCase())
    .filter(b => b.length > 0);
  
  if (batches.length === 0) return '*';
  
  const detectedBranches = new Set();
  
  for (const batch of batches) {
    const prefix = batch.charAt(0);
    const branch = BRANCH_BY_PREFIX[prefix];
    if (branch) {
      detectedBranches.add(branch);
    }
  }
  
  if (detectedBranches.size === 1) {
    return [...detectedBranches][0];
  }
  return '*';
};

const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
};

const compressImage = (dataUrl, maxWidth = 1600, maxHeight = 1600, quality = 0.8) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', quality),
        width,
        height
      });
    };
    img.onerror = () => {
      resolve({ dataUrl, width: 800, height: 1100 });
    };
    img.src = dataUrl;
  });
};

const isPdfFile = (file) => {
  if (!file) return false;
  return (
    file.type === 'application/pdf' ||
    file.type === 'application/x-pdf' ||
    file.type.toLowerCase().includes('pdf') ||
    (file.name && file.name.toLowerCase().endsWith('.pdf'))
  );
};

const isImageFile = (file) => {
  if (!file) return false;
  return (
    file.type.startsWith('image/') ||
    file.type.toLowerCase().includes('image') ||
    /\.(jpe?g|png|webp|heic|heif|bmp)$/i.test(file.name || '')
  );
};

export default function UploadForm({ isOpen, onClose, preferences }) {
  const [viewMode, setViewMode] = useState('form'); // 'form' | 'fileManager'
  const [title, setTitle] = useState('');
  const [fileEntries, setFileEntries] = useState([]);
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [batch, setBatch] = useState('');
  const [branch, setBranch] = useState('*');
  const [subject, setSubject] = useState('');
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attemptedUploadStep, setAttemptedUploadStep] = useState(false);

  const fileInputRef = useRef(null);
  const addMoreInputRef = useRef(null);
  const dragItemIndex = useRef(null);
  const dragOverItemIndex = useRef(null);
  const titleRef = useRef(title);
  const fileEntriesRef = useRef(fileEntries);
  const lastFileSelectTime = useRef(0);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    fileEntriesRef.current = fileEntries;
  }, [fileEntries]);

  useEffect(() => {
    return () => {
      (fileEntriesRef.current || []).forEach(entry => {
        if (entry.previewUrl) {
          URL.revokeObjectURL(entry.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setAttemptedUploadStep(false);
    }
    if (isOpen && preferences) {
      if (preferences.year) setYear(preferences.year);
      if (preferences.semester) {
        const semStr = preferences.semester.toString().startsWith('Semester')
          ? preferences.semester
          : `Semester ${preferences.semester}`;
        setSemester(semStr);
      }
      if (preferences.branch) setBranch(preferences.branch);
    }
  }, [isOpen, preferences]);

  const handleYearChange = (e) => {
    const selectedYear = e.target.value;
    setYear(selectedYear);
    setSemester('');
    setSubject('');
    if (selectedYear === '1st Year') {
      setBranch('*');
    }
  };

  const handleSemesterChange = (e) => {
    const selectedSemester = e.target.value;
    setSemester(selectedSemester);
    setSubject('');
  };

  const handleBatchChange = (e) => {
    const batchValue = e.target.value;
    setBatch(batchValue);
    if (year !== '1st Year') {
      const detectedBranch = getBranchFromBatch(batchValue);
      setBranch(detectedBranch);
    }
  };

  const getAvailableSemesters = () => {
    if (!year) return [];
    const yearData = SUBJECTS_BY_YEAR_SEMESTER[year];
    if (!yearData) return [];

    if (year === '1st Year') {
      return Object.keys(yearData['*'] || {});
    }
    
    const branchKey = branch !== '*' ? branch : Object.keys(yearData)[0];
    return Object.keys(yearData[branchKey] || {});
  };

  const getAvailableSubjects = () => {
    if (!year || !semester) return [];
    const yearData = SUBJECTS_BY_YEAR_SEMESTER[year];
    if (!yearData) return [];
    
    if (year === '1st Year') {
      return yearData['*']?.[semester] || [];
    }
    
    if (branch === '*') {
      const allSubjects = new Set();
      for (const branchData of Object.values(yearData)) {
        const subjects = branchData[semester] || [];
        subjects.forEach(s => allSubjects.add(s));
      }
      return [...allSubjects];
    }
    
    return yearData[branch]?.[semester] || [];
  };

  const addFilesToState = (selectedFileList) => {
    const incoming = Array.from(selectedFileList);
    if (incoming.length === 0) return;

    const pdfFile = incoming.find(isPdfFile);

    if (pdfFile) {
      setFileEntries(prev => {
        (prev || []).forEach(entry => {
          if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
        });
        return [{
          id: `${pdfFile.name}-${pdfFile.size || 0}-${Date.now()}`,
          file: pdfFile,
          previewUrl: null,
          isPdf: true,
          isImage: false,
        }];
      });
      setError(null);
      return;
    }

    const imageFiles = incoming.filter(isImageFile);
    if (imageFiles.length === 0) {
      setError('Please select valid image files (PNG, JPG, JPEG) or a PDF.');
      return;
    }

    const newEntries = imageFiles.map(file => ({
      id: `${file.name}-${file.size || 0}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isPdf: false,
      isImage: true,
    }));

    setFileEntries(prev => {
      const baseEntries = (prev || []).filter(e => e.isImage);
      return [...baseEntries, ...newEntries];
    });
    setError(null);
  };

  const handleFileSelect = (e) => {
    lastFileSelectTime.current = Date.now();
    addFilesToState(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToState(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removePage = (index) => {
    const entryToRemove = fileEntries[index];
    if (entryToRemove && entryToRemove.previewUrl) {
      URL.revokeObjectURL(entryToRemove.previewUrl);
    }
    const updated = fileEntries.filter((_, i) => i !== index);
    setFileEntries(updated);
  };

  const handleClearFiles = () => {
    fileEntries.forEach(entry => {
      if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    });
    setFileEntries([]);
  };

  const handleDragStart = (index) => {
    dragItemIndex.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItemIndex.current = index;
  };

  const handleDragEnd = () => {
    if (dragItemIndex.current === null || dragOverItemIndex.current === null) return;
    if (dragItemIndex.current === dragOverItemIndex.current) return;

    const updated = [...fileEntries];
    const draggedItem = updated.splice(dragItemIndex.current, 1)[0];
    updated.splice(dragOverItemIndex.current, 0, draggedItem);

    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
    setFileEntries(updated);
  };

  const convertImagesToPDF = async (imageFiles) => {
    setConverting(true);
    setConversionProgress('Preparing images...');

    try {
      const totalImages = imageFiles.length;
      const compressedImages = [];

      for (let i = 0; i < totalImages; i++) {
        setConversionProgress(`Processing page ${i + 1} of ${totalImages}...`);
        const file = imageFiles[i];
        const dataUrl = await readFileAsDataURL(file);
        const compressed = await compressImage(dataUrl);
        compressedImages.push(compressed);
      }

      setConversionProgress('Generating PDF document...');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      for (let i = 0; i < compressedImages.length; i++) {
        setConversionProgress(`Adding page ${i + 1} of ${totalImages} to PDF...`);
        const img = compressedImages[i];

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgAspectRatio = img.width / img.height;
        const pageAspectRatio = pageWidth / pageHeight;

        let imgWidth, imgHeight;
        if (imgAspectRatio > pageAspectRatio) {
          imgWidth = pageWidth;
          imgHeight = pageWidth / imgAspectRatio;
        } else {
          imgHeight = pageHeight;
          imgWidth = pageHeight * imgAspectRatio;
        }

        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;

        pdf.addImage(img.dataUrl, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST');
      }

      setConversionProgress('Finalizing PDF...');
      const pdfBlob = pdf.output('blob');
      return pdfBlob;
    } finally {
      setConverting(false);
      setConversionProgress('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileEntries.length || !title.trim() || !year || !semester || !subject.trim()) {
      setError('Please provide paper title, year, semester, subject, and file(s).');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      let finalFile;
      const imageFiles = fileEntries.filter(e => e.isImage).map(e => e.file);
      const pdfFiles = fileEntries.filter(e => e.isPdf).map(e => e.file);

      if (imageFiles.length > 0) {
        finalFile = await convertImagesToPDF(imageFiles);
      } else if (pdfFiles.length === 1) {
        finalFile = pdfFiles[0];
      } else {
        throw new Error('Please select either images or a single PDF file.');
      }

      const timestamp = Date.now();
      const finalFileName = `${title.replace(/\s+/g, '-')}.pdf`;
      const filePath = `${finalFileName}-${timestamp}`;

      if (import.meta.env.DEV) {
        const blobUrl = URL.createObjectURL(finalFile);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = finalFileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobUrl);
      } else {
        const { data: authData, error: userError } = await supabase.auth.getUser();
        if (userError || !authData?.user) throw new Error('User not authenticated');
        const authUser = authData.user;

        const { error: uploadError } = await supabase.storage
          .from('papers')
          .upload(filePath, finalFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'application/pdf',
          });

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from('papers')
          .insert([{
            filename: title,
            file_key: filePath,
            uploaded_by_id: authUser.id,
            uploaded_by: authUser.email,
            year,
            semester,
            batch: batch.trim() || 'All',
            branch: branch || null,
            subject: subject.trim(),
          }]);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTitle('');
      handleClearFiles();
      setYear('');
      setSemester('');
      setBatch('');
      setBranch('*');
      setSubject('');
      setAttemptedUploadStep(false);

      setTimeout(() => {
        onClose();
        setSuccess(false);
        setViewMode('form');
      }, 2000);

    } catch (err) {
      console.error('Error uploading paper:', err);
      setError(err.message);
    } finally {
      setUploading(false);
      setConverting(false);
      setConversionProgress('');
    }
  };

  const isMetadataComplete = Boolean(title.trim() && year && semester && subject.trim());

  const handleOpenFileManager = (e) => {
    if (e) e.stopPropagation();
    if (!isMetadataComplete) {
      setAttemptedUploadStep(true);
      return;
    }
    setViewMode('fileManager');
  };

  const handleSafeClose = () => {
    if (uploading || converting) return;
    // hacky, but it works :p
    if (Date.now() - lastFileSelectTime.current < 600) {
      return;
    }
    const currentFiles = fileEntriesRef.current || [];
    const currentTitle = titleRef.current || '';
    if (currentFiles.length > 0 || currentTitle.trim()) {
      if (!window.confirm('Discard paper upload? Progress may be lost.')) {
        return;
      }
    }
    onClose();
    setTimeout(() => {
      setViewMode('form');
    }, 300);
  };

  const isPdf = fileEntries.length > 0 && fileEntries[0].isPdf;
  const imageCount = fileEntries.filter(e => e.isImage).length;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleSafeClose} 
      closeOnBackdropClick={false}
      className={viewMode === 'fileManager' ? 'modal-content-large' : ''}
    >
      {/* EVEN hackier. display: none makes it lose focus after coming back from native filepickers. idk im trying anything at this rate */}
      <input
        id="upload-file-input"
        type="file"
        ref={fileInputRef}
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          opacity: 0,
          width: '1px',
          height: '1px',
          pointerEvents: 'none',
        }}
      />
      <input
        id="upload-add-more-input"
        type="file"
        ref={addMoreInputRef}
        multiple
        accept=".jpg,.jpeg,.png"
        onChange={handleFileSelect}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          opacity: 0,
          width: '1px',
          height: '1px',
          pointerEvents: 'none',
        }}
      />

      {viewMode === 'form' && (
        <div className="upload-form-view">
          <h2>Upload New Paper</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label>Paper Title:</label>
              <input
                type="text"
                value={title}
                placeholder="e.g. DS T1 2026"
                className={attemptedUploadStep && !title.trim() ? 'input-needs-attention' : ''}
                onChange={e => {
                  setTitle(e.target.value);
                  if (error) setError(null);
                }}
                disabled={uploading || converting}
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Year:</label>
                <select
                  value={year}
                  className={attemptedUploadStep && !year ? 'input-needs-attention' : ''}
                  onChange={e => {
                    handleYearChange(e);
                    if (error) setError(null);
                  }}
                  disabled={uploading || converting}
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div className="form-field">
                <label>Semester:</label>
                <select
                  value={semester}
                  className={attemptedUploadStep && !semester ? 'input-needs-attention' : ''}
                  onChange={e => {
                    handleSemesterChange(e);
                    if (error) setError(null);
                  }}
                  disabled={uploading || converting || !year}
                >
                  <option value="">
                    {year ? 'Select Semester' : 'Select Year first'}
                  </option>
                  {getAvailableSemesters().map((semesterOption) => (
                    <option key={semesterOption} value={semesterOption}>
                      {semesterOption}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Batch (Optional):</label>
                <input
                  type="text"
                  value={batch}
                  onChange={handleBatchChange}
                  disabled={uploading || converting}
                  placeholder="'all' by default"
                />
              </div>

              <div className="form-field">
                <label>Branch:</label>
                <select
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  disabled={uploading || converting}
                >
                  <option value="*">All Branches (*)</option>
                  <option value="ECE">ECE</option>
                  <option value="CSEIT">CSEIT</option>
                  <option value="BT">BT</option>
                  <option value="MNC">MNC</option>
                  <option value="RAI">RAI</option>
                </select>
                {branch && branch !== '*' && <small className="branch-hint">Detected: {branch}</small>}
              </div>
            </div>

            <div>
              <label>Subject:</label>
              <select
                value={subject}
                className={attemptedUploadStep && !subject.trim() ? 'input-needs-attention' : ''}
                onChange={e => {
                  setSubject(e.target.value);
                  if (error) setError(null);
                }}
                disabled={uploading || converting || !year || !semester}
              >
                <option value="">
                  {year && semester ? 'Select Subject' : !year ? 'Select Year first' : 'Select Semester first'}
                </option>
                {getAvailableSubjects().map((subjectOption) => (
                  <option key={subjectOption} value={subjectOption}>
                    {subjectOption}
                  </option>
                ))}
              </select>
              {subject && (() => {
                const branches = getBranchesForSubject(year, semester, subject);
                if (branches.length > 1 && !branches.includes('*')) {
                  return <small className="branch-hint">Shared across: {branches.join(', ')}</small>;
                }
                return null;
              })()}
            </div>

            <div className="upload-files-section">              
              {fileEntries.length === 0 ? (
                <div 
                  className={`upload-file-trigger-card ${!isMetadataComplete ? 'disabled' : ''}`}
                  onClick={handleOpenFileManager}
                >
                  <div className="upload-file-trigger-icon">
                    <FiUploadCloud size={28} />
                  </div>
                  <div className="upload-file-trigger-text">
                    <strong>Add Pages</strong>
                    <span>
                      {isMetadataComplete
                        ? 'click to select images or a PDF'
                        : 'fill in above details first.'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="upload-files-summary-card">
                  <div className="upload-files-summary-header">
                    <div className="upload-files-badge">
                      {isPdf ? (
                        <>
                          <span>PDF attached</span>
                        </>
                      ) : (
                        <>
                          <FiLayers size={16} />
                          <span>{imageCount} Page{imageCount > 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                    <div className="upload-files-header-actions">
                      <button 
                        type="button" 
                        className="btn-reorder-link"
                        onClick={handleOpenFileManager}
                      >
                        Edit
                      </button>
                      <button 
                        type="button" 
                        className="btn-clear-link"
                        onClick={handleClearFiles}
                      >
                        {isPdf ? 'Remove' : 'Clear'}
                      </button>
                    </div>
                  </div>

                  {!isPdf && (
                    <div 
                      className="upload-thumbnails-strip"
                      onClick={handleOpenFileManager}
                      title="Click to view & reorder pages"
                    >
                      {fileEntries.map((entry, idx) => (
                        <div key={entry.id} className="mini-thumbnail-item">
                          <img src={entry.previewUrl} alt={`Page ${idx + 1}`} />
                          <span className="mini-page-badge">{idx + 1}</span>
                        </div>
                      ))}
                      <div className="mini-thumbnail-add" onClick={handleOpenFileManager}>
                        <FiPlus size={16} />
                        <span>Add</span>
                      </div>
                    </div>
                  )}

                  {isPdf && (
                    <div className="pdf-summary-info">
                      <FiFileText size={20} className="pdf-icon-accent" />
                      <div className="pdf-summary-text">
                        <span className="pdf-filename">{fileEntries[0]?.file?.name || 'Uploaded PDF'}</span>
                        <span className="pdf-filesize">({((fileEntries[0]?.file?.size || 0) / (1024 * 1024)).toFixed(2)} MB)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={uploading || converting || fileEntries.length === 0}
              className="submit-paper-btn"
            >
              {converting ? 'Converting Images...' : uploading ? 'Uploading...' : 'Upload Paper'}
            </button>

            {converting && (
              <div className="conversion-progress">
                <p><strong>{conversionProgress}</strong></p>
              </div>
            )}

            {error && <p className="error-message">Error: {error}</p>}
            {success && <p className="success-message">Upload Successful!</p>}
          </form>
        </div>
      )}

      {viewMode === 'fileManager' && (
        <div className="file-manager-view" onClick={(e) => e.stopPropagation()}>
          <div className="file-manager-topbar">
            <button 
              type="button" 
              className="back-to-details-btn"
              onClick={(e) => {
                e.stopPropagation();
                setViewMode('form');
              }}
            >
              <FiArrowLeft size={16} /> Back to Details
            </button>
            <div className="file-manager-header-text">
              <h3>Add Pages</h3>
              <p>
                {isPdf
                  ? 'document attached! ready for upload.'
                  : fileEntries.length === 0
                  ? 'select multiple images or a PDF file'
                  : 'verify page order, hold & drag to rearrange.'}
              </p>
            </div>
          </div>

          <div className="file-manager-actions-row">
            {fileEntries.length > 0 && !isPdf && (
              <button
                type="button"
                className="action-btn action-btn-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearFiles();
                }}
              >
                <FiTrash2 size={16} /> Clear All
              </button>
            )}
          </div>

          {fileEntries.length === 0 ? (
            <label 
              htmlFor="upload-file-input"
              className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={(e) => e.stopPropagation()}
            >
              <FiUploadCloud size={48} className="drop-zone-icon" />
              <h4>Drag & Drop pages here</h4>
              <p>select multiple images or a single PDF file</p>
              <span className="drop-zone-browse-btn">
                or Browse Files
              </span>
            </label>
          ) : isPdf ? (
            <div className="file-manager-pdf-card" onClick={(e) => e.stopPropagation()}>
              <FiFileText size={48} className="pdf-icon-large" />
              <div className="pdf-card-details">
                <h4>{fileEntries[0]?.file?.name || 'Uploaded PDF'}</h4>
                <p>{((fileEntries[0]?.file?.size || 0) / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <div className="pdf-card-actions">
                <button 
                  type="button" 
                  className="pdf-action-btn btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearFiles();
                  }}
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="page-cards-grid"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={(e) => e.stopPropagation()}
            >
              {fileEntries.map((entry, index) => (
                <div 
                  key={entry.id} 
                  className="page-card"
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => {
                    if (dragItemIndex.current !== null) {
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="page-card-header">
                    <span className="page-number-pill">
                      Page {index + 1}
                    </span>
                    <button
                      type="button"
                      className="page-ctrl-btn delete-page-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePage(index);
                      }}
                      title="Remove this page"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>

                  <div className="page-card-preview">
                    <img src={entry.previewUrl} alt={`Page ${index + 1}`} />
                  </div>

                  <div className="page-card-footer">
                    <span className="page-filename" title={entry.file.name}>{entry.file.name}</span>
                    <span className="page-filesize">({(entry.file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  </div>
                </div>
              ))}

              <label 
                htmlFor="upload-add-more-input"
                className="add-more-card"
                onClick={(e) => e.stopPropagation()}
                title="Add more pages"
              >
                <FiPlus size={28} />
                <span>add page</span>
              </label>
            </div>
          )}

          <div className="file-manager-footer">
            <span className="file-manager-count-summary">
              {isPdf 
                ? 'PDF attached' 
                : `${fileEntries.length} page${fileEntries.length === 1 ? '' : 's'}`}
            </span>
            <button
              type="button"
              className="confirm-pages-btn"
              onClick={(e) => {
                e.stopPropagation();
                setViewMode('form');
              }}
            >
              <FiCheck size={16} /> Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
