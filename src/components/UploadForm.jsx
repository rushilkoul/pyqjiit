import React, { useState } from 'react';
import Modal from './Modal';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import SUBJECTS_BY_YEAR_SEMESTER from '../data/subjects.json';


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

export default function UploadForm({ user, isOpen, onClose }) {
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState([]);
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

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

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

  const convertImagesToPDF = async (imageFiles) => {
    return new Promise((resolve) => {
      setConverting(true);
      setConversionProgress('Preparing images...');

      const pdf = new jsPDF();
      let loadedImages = 0;
      const totalImages = imageFiles.length;

      imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            setConversionProgress(`Converting image ${index + 1} of ${totalImages} to PDF...`);

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

            if (index > 0) pdf.addPage();
            pdf.addImage(e.target.result, 'JPEG', x, y, imgWidth, imgHeight);

            loadedImages++;
            if (loadedImages === totalImages) {
              setConversionProgress('Finalizing PDF...');
              setTimeout(() => {
                const pdfBlob = pdf.output('blob');
                setConverting(false);
                setConversionProgress('');
                resolve(pdfBlob);
              }, 500);
            }
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length || !title || !year || !semester || !subject) {
      setError('Please provide title, file(s), year, semester, and subject.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      let finalFile;
      const imageFiles = files.filter(f => f.type.includes('image'));
      const pdfFiles = files.filter(f => f.type === 'application/pdf');

      if (imageFiles.length > 0) {
        finalFile = await convertImagesToPDF(imageFiles);
      } else if (pdfFiles.length === 1) {
        finalFile = pdfFiles[0];
      } else {
        throw new Error('Please select either images or a single PDF file.');
      }

      const timestamp = Date.now();
      // const cleanFileName = finalFile.name = `${title.replace(/\s+/g, '-')}.pdf`;
      let finalFileName = `${title.replace(/\s+/g, '-')}.pdf`
      const filePath = `${finalFileName}-${timestamp}`;

      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError || !authData.user) throw new Error('User not authenticated');

      const authUser = authData.user;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('papers')
        .upload(filePath, finalFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        });

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from('papers')
        .insert([{
          filename: title,
          file_key: filePath,
          uploaded_by_id: authUser.id,
          uploaded_by: authUser.email,
          year,
          semester,
          batch: batch.trim() || null,
          branch: branch || null,
          subject: subject.trim(),
        }]);

      if (insertError) throw insertError;

      setSuccess(true);
      setTitle('');
      setFiles([]);
      setYear('');
      setSemester('');
      setBatch('');
      setBranch('*');
      setSubject('');

      setTimeout(() => {
        onClose();
        setSuccess(false);
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

  const getFileTypeInfo = () => {
    if (!files.length) return '';

    const imageFiles = files.filter(f => f.type.includes('image'));
    const pdfFiles = files.filter(f => f.type === 'application/pdf');

    if (imageFiles.length > 0) {
      return `${imageFiles.length} image(s) will be converted to PDF`;
    } else if (pdfFiles.length === 1) {
      return 'PDF file ready for upload';
    } else {
      return 'Please select images or a single PDF';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Upload New Paper</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Paper Title:</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={uploading || converting}
          />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Year:</label>
            <select
              value={year}
              onChange={handleYearChange}
              disabled={uploading || converting || (year && semester && subject)}
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
              onChange={handleSemesterChange}
              disabled={uploading || converting || !year || (semester && subject)}
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
        
        {year && semester && subject && (
          <p className="field-locked">Year and semester locked after subject selection</p>
        )}

        
        <div className="form-row">
          <div className="form-field">
            <label>Batch (Optional):</label>
            <input
              type="text"
              value={batch}
              onChange={handleBatchChange}
              disabled={uploading || converting}
              placeholder="e.g., A1, B5, C2, G3, D1"
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
            onChange={e => setSubject(e.target.value)}
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
        </div>

        <div>
          <label>Select Files:</label>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            disabled={uploading || converting}
          />
          {files.length > 0 && (
            <div className="file-info">
              <p><strong>{getFileTypeInfo()}</strong></p>
              <ul>
                {files.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button type="submit" disabled={uploading || converting}>
          {converting ? 'Converting...' : uploading ? 'Uploading...' : 'Upload'}
        </button>

        {converting && (
          <div className="conversion-progress">
            <p><strong>{conversionProgress}</strong></p>
          </div>
        )}

        {error && <p className="error-message">Error: {error}</p>}
        {success && <p className="success-message">Upload Successful!</p>}
      </form>
    </Modal>
  );
}
