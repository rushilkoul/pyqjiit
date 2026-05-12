import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import SUBJECTS_DATA from '../data/subjects.json';

const ALL_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const ALL_BRANCHES = ['ECE', 'CSEIT', 'BT', 'MNC', 'RAI'];

const getAllSubjects = () => {
  const subjects = new Set();
  for (const yearData of Object.values(SUBJECTS_DATA)) {
    for (const branchData of Object.values(yearData)) {
      for (const semesterSubjects of Object.values(branchData)) {
        semesterSubjects.forEach(s => subjects.add(s));
      }
    }
  }
  return [...subjects].sort();
};

const ALL_SUBJECTS = getAllSubjects();

export default function PapersList({ user, preferences, onResetPreferences }) {
  const [papers, setPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [studentNames, setStudentNames] = useState({});
  const [pillIndicator, setPillIndicator] = useState({ width: 0, left: 0 });
  const pillRefs = useRef([]);

  useEffect(() => {
    if (preferences) {
      setSelectedYear(preferences.year);
      setSelectedSemester(preferences.semester);
      setSelectedBranch(preferences.branch);
    }
  }, [preferences]);

  useEffect(() => {
    fetchPapers();

    const channel = supabase
      .channel('papers_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'papers' },
        () => fetchPapers()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    let filtered = papers;

    if (selectedYear) {
      filtered = filtered.filter(paper => paper.year === selectedYear);
    }

    if (selectedSemester !== '') {
      filtered = filtered.filter(paper => paper.semester === `Semester ${selectedSemester}`);
    }

    if (selectedBranch) {
      filtered = filtered.filter(paper => paper.branch === selectedBranch || paper.branch === '*');
    }

    if (selectedSubject) {
      filtered = filtered.filter(paper => paper.subject === selectedSubject);
    }

    setFilteredPapers(filtered);
  }, [papers, selectedYear, selectedSemester, selectedBranch, selectedSubject]);

  useEffect(() => {
    const yearData = selectedYear ? SUBJECTS_DATA[selectedYear] : null;
    
    if (!yearData) {
      setAvailableSubjects(ALL_SUBJECTS);
      return;
    }

    const semesterKey = selectedSemester !== '' ? `Semester ${selectedSemester}` : null;
    const subjectsForFilter = new Set();
    
    if (selectedYear === '1st Year') {
      const branchData = yearData['*'];
      if (branchData && semesterKey) {
        const semesterSubjects = branchData[semesterKey];
        if (semesterSubjects) {
          semesterSubjects.forEach(s => subjectsForFilter.add(s));
        }
      }
    } else if (selectedBranch && selectedBranch !== '*') {
      const branchData = yearData[selectedBranch];
      if (branchData && semesterKey) {
        const semesterSubjects = branchData[semesterKey];
        if (semesterSubjects) {
          semesterSubjects.forEach(s => subjectsForFilter.add(s));
        }
      }
    } else if (semesterKey) {
      for (const branchData of Object.values(yearData)) {
        const semesterSubjects = branchData[semesterKey];
        if (semesterSubjects) {
          semesterSubjects.forEach(s => subjectsForFilter.add(s));
        }
      }
    }
    
    const subjectsList = [...subjectsForFilter].sort();
    setAvailableSubjects(subjectsList);
    
    if (selectedSubject && !subjectsList.includes(selectedSubject)) {
      setSelectedSubject('');
    }
  }, [selectedYear, selectedSemester, selectedBranch, selectedSubject]);

  useEffect(() => {
    if (papers.length > 0) {
      const uniqueEnrollments = [...new Set(papers.map(p => p.uploaded_by).filter(Boolean))];
      
      uniqueEnrollments.forEach(enrollment => {
        getStudentName(enrollment);
      });
    }
  }, [papers]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = selectedYear === '' ? 0 : ALL_YEARS.indexOf(selectedYear) + 1;
      const activeButton = pillRefs.current[activeIndex];
      
      if (activeButton) {
        setPillIndicator({
          width: activeButton.offsetWidth,
          left: activeButton.offsetLeft
        });
      }
    };

    const timer = setTimeout(updateIndicator, 10);
    window.addEventListener('resize', updateIndicator);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [selectedYear, papers]);

  const fetchPapers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('papers')
        .select('*')
        .order('inserted_at', { ascending: false });
      if (fetchError) throw fetchError;
      setPapers(data);
      setFilteredPapers(data);
    } catch (err) {
      console.error('Error fetching papers:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, ownerId) => {
    if (!user) return alert('You must be logged in to delete papers.');
    if (user.id !== ownerId) return alert('You can only delete your own papers.');
    if (!window.confirm('Are you sure you want to delete this paper?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('papers')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      fetchPapers();
    } catch (err) {
      console.error('Error deleting paper:', err.message);
      alert('Error deleting paper: ' + err.message);
    }
  };

  const getStudentName = async (id) => {
    let enrollmentNumber = id.replace("@mail.jiit.ac.in", "");
    
    // this is a private api. only works for AY2025-26 rn
    const response = await fetch(`https://jiitstudent.vercel.app/student/${enrollmentNumber}`);
    const data = await response.json();
    
    let name = data.data.name.toLowerCase().replace(/(^|\s)\w/g, match => match.toUpperCase());
    
    if (data.success) {
      setStudentNames(prev => ({
        ...prev,
        [id]: name
      }));
    } 
  }

  if (loading) return <p>Loading papers...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  return (
    <>
    {papers.length > 0 && (
      <>
        {preferences && (
          <div className="preferences-banner">
            <div className="preferences-info">
              <p>Showing papers for <strong>{preferences.year}</strong> {preferences.semester && `• Semester ${preferences.semester}`} {preferences.branch !== '*' && `• ${preferences.branch}`}</p>
            </div>
            <button 
              onClick={onResetPreferences}
              className="change-preferences-btn"
            >
              Change
            </button>
          </div>
        )}
      </>
    )}
    <div className="main-container">
      <h2>Available Papers <span className="filtered-papers-counter">{filteredPapers.length}</span></h2> 
      
      {papers.length === 0 ? (
        <p>No papers uploaded yet.</p>
      ) : filteredPapers.length === 0 ? (
        <p>No papers match the selected filters{selectedYear && ` (Year: ${selectedYear})`}{selectedSubject && ` (Subject: ${selectedSubject})`}.</p>
      ) : (
        <ul className="responses-container">
          {filteredPapers.map((paper) => {
            const { 
              id, 
              filename, 
              file_key, 
              subject,
              year,
              semester,
              batch,
              uploaded_by, 
              uploaded_by_id,
              verified,
              flagged,
              inserted_at,
              branch
            } = paper;
            
            const { data: publicUrlData } = supabase
              .storage
              .from('papers')
              .getPublicUrl(file_key);

            const uploadDate = new Date(inserted_at).toLocaleDateString();
            const displayName = studentNames[uploaded_by] || uploaded_by;

            return (
              <li key={id} className="free-class">
                <div className="paper-info">
                  <div className="paper-header">
                    <h3>{filename}</h3>
                    <div className="paper-badges">
                      {subject && <span className="badge subject">{subject}</span>}
                      {verified && <span className="badge verified">✓ Verified</span>}
                      {flagged && <span className="badge flagged">⚠ Flagged</span>}
                      {branch && <span className="badge branch">{branch === '*' ? 'All Branches' : branch}</span>}
                    </div>
                  </div>
                  
                  <div className="paper-details">
                    {year && semester && <p><strong>{year} - {semester}</strong></p>}
                    {year && !semester && <p><strong>{year}</strong></p>}
                    {batch && <p><strong>Batch(es):</strong> {batch}</p>}
                    <p><strong>Uploaded:</strong> {uploadDate} by {displayName}</p>

                  </div>
                  
                  <div className="paper-actions">
                    <a
                      href={publicUrlData.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="view-button"
                    >
                      Open
                    </a>
                    {user && user.id === uploaded_by_id && (
                      <button 
                        onClick={() => handleDelete(id, uploaded_by_id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
    </>
  );
}
