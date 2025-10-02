import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const ALL_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const SUBJECTS_BY_YEAR_SEMESTER = {
  '1st Year': {
    'Semester 1': [
      'SDF - I',
      'SDF Lab - I',
      'English',
      'Maths - I',
      'Basic Electronics',
      'Basic Electronics Lab',
      'Physics - I',
      'Physics Lab-I',
      'EDD - I',
      'Workshop'
    ],
    'Semester 2': [
      'SDF - II',
      'SDF Lab - II',
      'Chemistry Lab',
      'Chemistry',
      'Maths - II',
      'Physics - II',
      'Physics Lab - II',
      'EDD - II',
      'Computer System Architecture',
      'Communication Skills Lab'
    ]
  },
  '2nd Year': {
    'Semester 3': [
      'Theoretical Foundations of Computer Science',
      'Data Structures',
      'Database Systems & Web',
      'Probability and Random Processes',
      'Probability and Statistics',
      'Economics',
      'Data Structure Lab',
      'Database System & Web Lab'
    ],
    'Semester 4': [
      'Design and Analysis of Algorithms',
      'Object Oriented Programming',
      'Computer Networks',
      'Software Engineering',
      'Discrete Mathematics',
      'Algorithms Lab',
      'OOP Lab',
      'Networks Lab'
    ]
  },
  '3rd Year': {
    'Semester 5': [
      'Computer Networks and Internet of Things',
      'Fundamentals of Machine Learning',
      'Object Oriented Analysis and Design Using JAVA',
      'Computer Organization and Architecture',
      'Computer Organization and Architecture Lab',
      'Operating System and System Programming Lab',
      'Open Source Software Lab',
      'Information Security Lab'
    ],
    'Semester 6': [
      'Compiler Design',
      'Operating Systems',
      'Database Management Systems',
      'Web Technologies',
      'Artificial Intelligence',
      'Compiler Lab',
      'OS Lab',
      'Web Development Lab'
    ]
  },
  '4th Year': {
    'Semester 7': [
      'Major Project Part - 1 (CSE)',
      'Summer Training & Viva'
    ],
    'Semester 8': [
      'Major Project Part - 2 (CSE)',
      'Internship & Seminar'
    ]
  }
};

const ALL_SUBJECTS = [...new Set(
  Object.values(SUBJECTS_BY_YEAR_SEMESTER)
    .flatMap(yearData => Object.values(yearData))
    .flat()
)].sort();

export default function PapersList({ user }) {
  const [papers, setPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState(ALL_SUBJECTS);
  const [studentNames, setStudentNames] = useState({});

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

    if (selectedSubject) {
      filtered = filtered.filter(paper => paper.subject === selectedSubject);
    }

    setFilteredPapers(filtered);
  }, [papers, selectedYear, selectedSubject]);

  useEffect(() => {
    if (selectedYear) {
      const yearData = SUBJECTS_BY_YEAR_SEMESTER[selectedYear];
      const subjectsForYear = yearData ? Object.values(yearData).flat() : [];
      setAvailableSubjects(subjectsForYear);
      
      if (selectedSubject && !subjectsForYear.includes(selectedSubject)) {
        setSelectedSubject('');
      }
    } else {
      setAvailableSubjects(ALL_SUBJECTS);
    }
  }, [selectedYear, selectedSubject]);

  useEffect(() => {
    if (papers.length > 0) {
      const uniqueEnrollments = [...new Set(papers.map(p => p.uploaded_by).filter(Boolean))];
      
      console.log(`Found ${uniqueEnrollments.length} unique uploaders:`, uniqueEnrollments);
      
      uniqueEnrollments.forEach(enrollment => {
        getStudentName(enrollment);
      });
    }
  }, [papers]);

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
      <div className="filters-container">
        <h3>Filters</h3>
        <div className="filters-row">
          <div className="filter-item">
            <span>Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="filter-select"
            >
              <option value="">All</option>
              {ALL_YEARS.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <span>Subject:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="filter-select"
            >
              <option value="">All</option>
              {availableSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          
          {(selectedYear || selectedSubject) && (
            <button
              onClick={() => {
                setSelectedYear('');
                setSelectedSubject('');
              }}
              className="clear-filters-btn"
            >
              clear filters
            </button>
          )}
        </div>
      </div>
    )}
    <div className="main-container">
      <h2>Available Papers</h2>
      
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
              inserted_at
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
                      View Paper
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
