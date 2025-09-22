import React, { useState } from 'react';
import Modal from './Modal';
import { supabase } from '../supabaseClient';

export default function UploadForm({ isOpen, onClose }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [year, setYear] = useState('');
  const [batch, setBatch] = useState('');
  const [subject, setSubject] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title || !year || !subject) {
      setError('Please provide title, file, year, and subject.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const filePath = `${title.replace(/\s+/g, '-')}-${timestamp}.${fileExt}`;

      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError || !authData.user) throw new Error('User not authenticated');

      const user = authData.user;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('papers')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from('papers')
        .insert([{
          filename: title,
          file_key: filePath,
          uploaded_by_id: user.id, // this too so fucking long to fix oml
          uploaded_by: user.email,
          year,
          batch: batch.trim() || null,
          subject: subject.trim(),
        }]);

      if (insertError) throw insertError;

      setSuccess(true);
      setTitle('');
      setFile(null);
      setYear('');
      setBatch('');
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
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Upload New Paper</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Paper Title:</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={uploading} />
        </div>
        <div>
          <label>Subject:</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} disabled={uploading} />
        </div>
        <div>
          <label>Year:</label>
          <select value={year} onChange={e => setYear(e.target.value)} disabled={uploading}>
            <option value="">Select Year</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </div>
        <div>
          <label>Batch (Optional):</label>
          <input type="text" value={batch} onChange={e => setBatch(e.target.value)} disabled={uploading} />
        </div>
        <div>
          <label>Select File:</label>
          <input type="file" onChange={handleFileChange} disabled={uploading} />
        </div>
        <button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
        {error && <p className="error-message">Error: {error}</p>}
        {success && <p className="success-message">Upload Successful!</p>}
      </form>
    </Modal>
  );
}
