import SUBJECTS_DATA from '../data/subjects.json';

export const getBranchesForSubject = (year, semester, subject) => {
  if (!year || !semester || !subject) return [];
  
  const yearData = SUBJECTS_DATA[year];
  if (!yearData) return []; 
  if (year === '1st Year') return ['*'];

  const matchedBranches = new Set();

  for (const [branchKey, semesters] of Object.entries(yearData)) {
    if (branchKey === '*') {
      matchedBranches.add('*');
      continue;
    }

    const subjectsInSem = semesters[semester] || [];
    if (subjectsInSem.includes(subject)) {
      matchedBranches.add(branchKey);
    }
  }

  return [...matchedBranches];
};

export const isSubjectInBranch = (subject, year, semester, branch) => {

  if (!branch || branch === '*' || year === '1st Year') return true;
  if (!subject || !year || !semester) return false;

  const branches = getBranchesForSubject(year, semester, subject);
  return branches.includes(branch) || branches.includes('*') ;
};



export const isPaperMatchingBranch = (paper, selectedBranch) => {
  if (!selectedBranch || selectedBranch === '*') return true;
  if (!paper) return false;

  if (paper.branch === selectedBranch || paper.branch === '*' || !paper.branch) {
    return true;
  }

  return isSubjectInBranch(paper.subject,paper.year, paper.semester, selectedBranch);
};
