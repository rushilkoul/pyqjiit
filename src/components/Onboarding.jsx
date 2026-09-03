import { useState, useEffect } from 'react';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const BRANCHES = ['ECE', 'CSEIT', 'BT', 'MNC', 'RAI'];
const ONBOARDING_KEY = 'onboarding-completed-v1';
const PREFERENCES_KEY = 'user-preferences-v1';

const getSemesterNumbersForYear = (year) => {
  const yearIndex = YEARS.indexOf(year);
  if (yearIndex === -1) return [1, 2];
  return [yearIndex * 2 + 1, yearIndex * 2 + 2];
};

const getRomanNumeral = (num) => {
  const numerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  return numerals[num] || '';
};

export default function Onboarding({ isOpen, onComplete, onClose, initialPreferences }) {
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialPreferences) {
        setSelectedYear(initialPreferences.year || '');
        setSelectedSemester(initialPreferences.semester || '');
        setSelectedBranch(initialPreferences.branch || '');
      }
      const timer = setTimeout(() => setIsTransitioning(true), 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialPreferences]);

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setSelectedSemester('');
    setSelectedBranch('');
  };

  const handleSemesterSelect = (semesterNumber) => {
    setSelectedSemester(semesterNumber);
    if (selectedYear === '1st Year') {
      setSelectedBranch('*');
    }
  };

  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch);
  };

  const handleComplete = () => {
    if (!selectedYear || selectedSemester === '') return;
    if (selectedYear !== '1st Year' && !selectedBranch) return;

    const preferences = {
      year: selectedYear,
      semester: selectedSemester,
      branch: selectedBranch || '*',
    };

    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    localStorage.setItem(ONBOARDING_KEY, 'true');

    setIsTransitioning(false);
    setTimeout(() => onComplete(preferences), 300);
  };

  const canContinue = selectedYear && selectedSemester !== '' && (selectedYear === '1st Year' || selectedBranch);
  const showBranchSelect = selectedYear && selectedYear !== '1st Year' && selectedSemester;

  if (!isOpen) return null;

  return (
    <div className={`onboarding-overlay ${isTransitioning ? 'visible' : ''}`}>
      <div className={`onboarding-modal ${isTransitioning ? 'slide-in' : ''}`}>
        <div className="onboarding-content">
          <div className="onboarding-header">
            {onClose && (
              <button 
                type="button" 
                onClick={onClose} 
                className="onboarding-close-btn"
                aria-label="Close"
              >
                ✕
              </button>
            )}
            <h1>Welcome to <span className="brand-highlight">PYQJIIT</span>!</h1>
            <p>pick your year and branch</p>
          </div>

          <div className="onboarding-body">
            <div className="selection-section">
              <div className="year-grid">
                {YEARS.map((year) => (
                  <div key={year} className="year-container">
                    {selectedYear === year ? (
                      <div className="semester-container">
                        {(() => {
                          const [sem1, sem2] = getSemesterNumbersForYear(year);
                          return (
                            <>
                              <button
                                className={`semester-btn ${selectedSemester === sem1 ? 'selected' : ''}`}
                                onClick={() => handleSemesterSelect(sem1)}
                              >
                                SEM {getRomanNumeral(sem1)}
                              </button>
                              <button
                                className={`semester-btn ${selectedSemester === sem2 ? 'selected' : ''}`}
                                onClick={() => handleSemesterSelect(sem2)}
                              >
                                SEM {getRomanNumeral(sem2)}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <button
                        className={`year-card ${selectedYear === year ? 'selected' : ''}`}
                        onClick={() => handleYearSelect(year)}
                      >
                        <span className="year-label">{year}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={`selection-section branch-section ${showBranchSelect ? 'expanded' : 'collapsed'}`}>
                <h2 className="section-title">Branch</h2>
                <div className="branch-grid">
                  {BRANCHES.map((branch) => (
                    <button
                      key={branch}
                      className={`branch-card ${selectedBranch === branch ? 'selected' : ''}`}
                      onClick={() => handleBranchSelect(branch)}
                    >
                      <span className="branch-label">{branch}</span>
                    </button>
                  ))}
                </div>
              </div>

            <div className={`info-message ${selectedYear === '1st Year' && selectedSemester ? 'expanded' : 'collapsed'}`}>
                <p>1st Year curriculum is common for all branches. yay!</p>
              </div>
          </div>

          <div className="onboarding-footer">
            <button
              className="continue-button"
              onClick={handleComplete}
              disabled={!canContinue}
            >
                Continue
            </button>
            <p className="footer-text">you can change this later</p>
          </div>
        </div>
      </div>
    </div>
  );
}
