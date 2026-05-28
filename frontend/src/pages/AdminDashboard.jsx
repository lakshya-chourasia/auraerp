import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BookOpen, Landmark, UserCheck, Trash2, Plus, LogOut, CheckCircle, 
  Settings, Award, HelpCircle, FileSpreadsheet, PlusCircle, CreditCard, Edit2 
} from 'lucide-react';

const AdminDashboard = () => {
  const { token, logout, API_URL } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    studentCount: 0,
    facultyCount: 0,
    courseCount: 0,
    totalFeesCollected: 0,
    totalFeesPending: 0
  });

  // Data arrays
  const [faculties, setFaculties] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [fees, setFees] = useState([]);

  // Modals / forms state
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [studentCreationTab, setStudentCreationTab] = useState('single');
  const [newStudentForm, setNewStudentForm] = useState({
    name: '', email: '', password: '', department: 'Computer Science', phone: ''
  });
  const [parsedStudentsPreview, setParsedStudentsPreview] = useState([]);
  const [uploadResults, setUploadResults] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [bulkInputMethod, setBulkInputMethod] = useState('upload'); // 'upload' or 'paste'

  // Editing states
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);

  // Edit forms state
  const [editFacultyForm, setEditFacultyForm] = useState({
    name: '', department: 'Computer Science', designation: '', phone: ''
  });
  const [editStudentForm, setEditStudentForm] = useState({
    name: '', department: 'Computer Science', currentSemester: '1', phone: '', cgpa: 0.0
  });
  const [editCourseForm, setEditCourseForm] = useState({
    title: '', department: 'Computer Science', semester: '1', credits: 3, facultyRef: ''
  });

  // New item forms state
  const [facultyForm, setFacultyForm] = useState({
    email: '', password: '', employeeId: '', name: '', department: 'Computer Science', designation: 'Assistant Professor', phone: ''
  });
  const [courseForm, setCourseForm] = useState({
    courseCode: '', title: '', department: 'Computer Science', semester: '1', credits: 3, facultyRef: ''
  });
  const [feeForm, setFeeForm] = useState({
    studentRef: '', feeType: 'Tuition', amount: 50000, dueDate: '', generateForAll: false
  });

  const [message, setMessage] = useState({ text: '', type: '' });

  const triggerMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchStats();
    fetchFaculties();
    fetchStudents();
    fetchCourses();
    fetchFees();
  }, [token]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error('Error fetching admin stats', e); }
  };

  const fetchFaculties = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/faculty`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setFaculties(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setStudents(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCourses(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchFees = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/fees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setFees(await res.json());
    } catch (e) { console.error(e); }
  };

  // Add Faculty
  const handleAddFaculty = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/faculty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(facultyForm)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('Faculty member registered successfully!');
        setShowFacultyModal(false);
        setFacultyForm({ email: '', password: '', employeeId: '', name: '', department: 'Computer Science', designation: 'Assistant Professor', phone: '' });
        fetchFaculties();
        fetchStats();
      } else {
        triggerMessage(data.message || 'Error creating faculty', 'error');
      }
    } catch (err) { triggerMessage('Network error', 'error'); }
  };

  // Delete Faculty
  const handleDeleteFaculty = async (id) => {
    if (!window.confirm('Delete this faculty member?')) return;
    try {
      const res = await fetch(`${API_URL}/admin/faculty/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerMessage('Faculty member deleted');
        fetchFaculties();
        fetchStats();
        fetchCourses(); // Course references may change
      }
    } catch (e) { console.error(e); }
  };

  // Add Single Student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newStudentForm)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage(`Student ${data.student.name} registered successfully with unique Roll Number: ${data.student.roll_number}`);
        setShowStudentModal(false);
        setNewStudentForm({ name: '', email: '', password: '', department: 'Computer Science', phone: '' });
        fetchStudents();
        fetchStats();
      } else {
        triggerMessage(data.message || 'Error creating student', 'error');
      }
    } catch (err) { triggerMessage('Network error', 'error'); }
  };

  // Bulk Student Upload
  const handleBulkStudentUpload = async () => {
    if (parsedStudentsPreview.length === 0) {
      triggerMessage('Please select and parse a valid CSV or JSON file first.', 'error');
      return;
    }
    
    setUploadingFiles(true);
    setUploadResults(null);
    try {
      const res = await fetch(`${API_URL}/admin/students/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ students: parsedStudentsPreview })
      });
      
      const data = await res.json();
      if (res.ok) {
        setUploadResults(data);
        fetchStudents();
        fetchStats();
        triggerMessage(`Bulk registration processed: ${data.createdCount} succeeded, ${data.failedCount} failed.`);
        setParsedStudentsPreview([]);
      } else {
        triggerMessage(data.message || 'Error executing bulk registration', 'error');
      }
    } catch (err) {
      triggerMessage('Network error submitting bulk students', 'error');
    } finally {
      setUploadingFiles(false);
    }
  };

  // Handle file import parsing on frontend
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            setParsedStudentsPreview(parsed);
            setUploadResults(null);
            triggerMessage(`Imported ${parsed.length} rows from JSON! Review details in table below.`);
          } else {
            triggerMessage('JSON format must be a list of objects', 'error');
          }
        } catch (err) {
          triggerMessage('Error parsing JSON file. Check syntax.', 'error');
        }
      } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        try {
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          if (lines.length < 2) {
            triggerMessage('CSV file must have headers and at least one data row', 'error');
            return;
          }
          
          // Parse header
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
          
          // Verify expected headers exist
          const required = ['name', 'email', 'password', 'department', 'phone'];
          const missing = required.filter(r => !headers.includes(r));
          if (missing.length > 0) {
            triggerMessage(`Missing mandatory headers: ${missing.join(', ')}`, 'error');
            return;
          }

          const parsedList = lines.slice(1).map(line => {
            const values = [];
            let current = '';
            let inQuotes = false;
            for (let char of line) {
              if (char === '"' || char === "'") {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim());

            const obj = {};
            headers.forEach((header, idx) => {
              obj[header] = values[idx] || '';
            });
            
            if (obj.department) {
              const matched = departments.find(d => d.toLowerCase().includes(obj.department.toLowerCase())) || 'Computer Science';
              obj.department = matched;
            } else {
              obj.department = 'Computer Science';
            }
            
            return obj;
          });

          setParsedStudentsPreview(parsedList);
          setUploadResults(null);
          triggerMessage(`Successfully parsed ${parsedList.length} rows from CSV!`);
        } catch (err) {
          triggerMessage(`Error parsing CSV file: ${err.message}`, 'error');
        }
      } else {
        triggerMessage('Unsupported file type. Use .csv or .json files.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Handle parsing pasted text on frontend (supports both CSV and JSON formats)
  const handlePasteParse = () => {
    if (!pastedText || pastedText.trim() === '') {
      triggerMessage('Please paste CSV or JSON formatted student records in the text field first.', 'error');
      return;
    }

    const trimmed = pastedText.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        setParsedStudentsPreview(list);
        setUploadResults(null);
        triggerMessage(`Successfully parsed ${list.length} rows from pasted JSON!`);
      } catch (err) {
        triggerMessage('Error parsing pasted JSON text. Verify matching quotes, commas, and brackets.', 'error');
      }
    } else {
      try {
        const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          triggerMessage('Pasted CSV text must contain at least a header row and one data row.', 'error');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
        
        const required = ['name', 'email', 'password', 'department', 'phone'];
        const missing = required.filter(r => !headers.includes(r));
        if (missing.length > 0) {
          triggerMessage(`Missing mandatory headers in pasted text: ${missing.join(', ')}`, 'error');
          return;
        }

        const parsedList = lines.slice(1).map(line => {
          const values = [];
          let current = '';
          let inQuotes = false;
          for (let char of line) {
            if (char === '"' || char === "'") {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          const obj = {};
          headers.forEach((header, idx) => {
            obj[header] = values[idx] || '';
          });
          
          if (obj.department) {
            const matched = departments.find(d => d.toLowerCase().includes(obj.department.toLowerCase())) || 'Computer Science';
            obj.department = matched;
          } else {
            obj.department = 'Computer Science';
          }
          
          return obj;
        });

        setParsedStudentsPreview(parsedList);
        setUploadResults(null);
        triggerMessage(`Successfully parsed ${parsedList.length} rows from pasted CSV text!`);
      } catch (err) {
        triggerMessage(`Error parsing pasted CSV text: ${err.message}`, 'error');
      }
    }
  };

  // Delete Student
  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Delete this student profile?')) return;
    try {
      const res = await fetch(`${API_URL}/admin/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerMessage('Student profile deleted');
        fetchStudents();
        fetchStats();
      }
    } catch (e) { console.error(e); }
  };

  // Add Course
  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(courseForm)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('Course created successfully!');
        setShowCourseModal(false);
        setCourseForm({ courseCode: '', title: '', department: 'Computer Science', semester: '1', credits: 3, facultyRef: '' });
        fetchCourses();
        fetchStats();
      } else {
        triggerMessage(data.message || 'Error creating course', 'error');
      }
    } catch (err) { triggerMessage('Network error', 'error'); }
  };

  // Delete Course
  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    try {
      const res = await fetch(`${API_URL}/admin/courses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerMessage('Course deleted successfully');
        fetchCourses();
        fetchStats();
      }
    } catch (e) { console.error(e); }
  };

  // Generate Fees
  const handleGenerateFee = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/fees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(feeForm)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage(data.message || 'Fee invoice generated successfully!');
        setShowFeeModal(false);
        setFeeForm({ studentRef: '', feeType: 'Tuition', amount: 50000, dueDate: '', generateForAll: false });
        fetchFees();
        fetchStats();
      } else {
        triggerMessage(data.message || 'Error generating fees', 'error');
      }
    } catch (err) { triggerMessage('Network error', 'error'); }
  };

  // Manual Fee Collection
  const handleMarkFeePaid = async (id) => {
    try {
      const res = await fetch(`${API_URL}/admin/fees/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerMessage('Fee payment registered successfully!');
        fetchFees();
        fetchStats();
      }
    } catch (e) { console.error(e); }
  };

  // Editing Triggers
  const startEditFaculty = (fac) => {
    setEditingFaculty(fac);
    setEditFacultyForm({
      name: fac.name,
      department: fac.department,
      designation: fac.designation,
      phone: fac.phone
    });
  };

  const startEditStudent = (stud) => {
    setEditingStudent(stud);
    setEditStudentForm({
      name: stud.name,
      department: stud.department,
      currentSemester: stud.currentSemester || stud.current_semester || '1',
      phone: stud.phone,
      cgpa: stud.cgpa || 0.0
    });
  };

  const startEditCourse = (course) => {
    setEditingCourse(course);
    setEditCourseForm({
      title: course.title,
      department: course.department,
      semester: course.semester,
      credits: course.credits,
      facultyRef: course.facultyRef ? course.facultyRef._id || course.facultyRef : ''
    });
  };

  // Editing Handlers
  const handleEditFacultySubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/faculty/${editingFaculty._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFacultyForm)
      });
      if (res.ok) {
        triggerMessage('Faculty profile updated successfully!');
        setEditingFaculty(null);
        fetchFaculties();
        fetchCourses();
      } else {
        const data = await res.json();
        triggerMessage(data.message || 'Error updating faculty', 'error');
      }
    } catch (err) { triggerMessage('Network error', 'error'); }
  };

  const handleEditStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/students/${editingStudent._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editStudentForm)
      });
      if (res.ok) {
        triggerMessage('Student profile updated successfully!');
        setEditingStudent(null);
        fetchStudents();
      } else {
        const data = await res.json();
        triggerMessage(data.message || 'Error updating student', 'error');
      }
    } catch (err) { triggerMessage('Network error', 'error'); }
  };

  const handleEditCourseSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/courses/${editingCourse._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editCourseForm)
      });
      if (res.ok) {
        triggerMessage('Course catalog details updated successfully!');
        setEditingCourse(null);
        fetchCourses();
      } else {
        const data = await res.json();
        triggerMessage(data.message || 'Error updating course', 'error');
      }
    } catch (err) { triggerMessage('Network error', 'error'); }
  };

  const departments = [
    'Computer Science', 'Information Technology', 'Electronics & Communication', 
    'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering'
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-brand-600 p-1.5 rounded-lg text-white">
              <Award size={20} />
            </div>
            <span className="font-extrabold text-xl tracking-tight">Aura<span className="text-brand-500">ERP</span></span>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'overview', label: 'Overview', icon: Landmark },
              { id: 'faculty', label: 'Faculty Management', icon: UserCheck },
              { id: 'students', label: 'Student Management', icon: Users },
              { id: 'courses', label: 'Course Management', icon: BookOpen },
              { id: 'fees', label: 'Fee Management', icon: CreditCard }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-brand-600/10 text-brand-400 border-l-4 border-brand-500 pl-3' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Workspace</h1>
            <p className="text-slate-400 text-sm mt-0.5">Control center and institutional records manager</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-300 font-semibold">Active Session: Admin</span>
          </div>
        </header>

        {/* Global Toast Message */}
        {message.text && (
          <div className={`p-4 rounded-xl mb-6 border text-sm font-semibold transition-all ${
            message.type === 'error' 
              ? 'bg-red-500/10 border-red-500/20 text-red-300' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Total Enrolled Students', val: stats.studentCount, icon: Users, color: 'text-blue-400' },
                { title: 'Registered Faculty', val: stats.facultyCount, icon: UserCheck, color: 'text-indigo-400' },
                { title: 'Courses Created', val: stats.courseCount, icon: BookOpen, color: 'text-purple-400' },
                { title: 'Fees Collected', val: `₹${stats.totalFeesCollected}`, icon: Landmark, color: 'text-emerald-400' }
              ].map((card, i) => (
                <div key={i} className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden">
                  <div className="space-y-1">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{card.title}</p>
                    <h3 className="text-3xl font-extrabold">{card.val}</h3>
                  </div>
                  <div className={`p-3.5 bg-slate-900 rounded-xl ${card.color}`}>
                    <card.icon size={24} />
                  </div>
                </div>
              ))}
            </div>

            {/* Fee Collection Alert Panel */}
            <div className="bg-gradient-to-r from-slate-950/60 to-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-lg text-amber-400">Collect Outstanding Dues</h4>
                <p className="text-slate-400 text-sm">Institution-wide outstanding receivables totals: <strong className="text-white">₹{stats.totalFeesPending}</strong></p>
              </div>
              <button 
                onClick={() => setActiveTab('fees')}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition-all self-start md:self-center"
              >
                Manage Invoices
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: FACULTY CRUD */}
        {activeTab === 'faculty' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Faculty Roster</h3>
              <button 
                onClick={() => setShowFacultyModal(true)}
                className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all"
              >
                <Plus size={16} /> Add Faculty
              </button>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Name</th>
                      <th className="p-4">Employee ID</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Designation</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faculties.map(fac => (
                      <tr key={fac._id} className="border-b border-slate-800/60 hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 font-semibold">{fac.name}</td>
                        <td className="p-4"><code className="bg-slate-900 px-2 py-0.5 rounded text-amber-400 text-sm">{fac.employeeId}</code></td>
                        <td className="p-4 text-sm text-slate-300">{fac.department}</td>
                        <td className="p-4 text-sm text-slate-300">{fac.designation}</td>
                        <td className="p-4 text-sm text-slate-400">{fac.userRef?.email || 'N/A'}</td>
                        <td className="p-4 flex gap-1.5">
                          <button 
                            type="button"
                            onClick={() => startEditFaculty(fac)}
                            className="text-amber-400 hover:text-amber-300 p-2 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Edit Faculty"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteFaculty(fac._id)}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete Faculty"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {faculties.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500 text-sm">No faculty members found. Add a faculty record to get started.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STUDENT MANAGEMENT */}
        {activeTab === 'students' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Student Directory</h3>
              <button 
                onClick={() => {
                  setShowStudentModal(true);
                  setUploadResults(null);
                  setParsedStudentsPreview([]);
                }}
                className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all"
              >
                <Plus size={16} /> Add Student
              </button>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Name</th>
                      <th className="p-4">Roll Number</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Semester</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">CGPA</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(stud => (
                      <tr key={stud._id} className="border-b border-slate-800/60 hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 font-semibold">{stud.name}</td>
                        <td className="p-4"><code className="bg-slate-900 px-2 py-0.5 rounded text-brand-400 text-sm">{stud.rollNumber}</code></td>
                        <td className="p-4 text-sm text-slate-300">{stud.department}</td>
                        <td className="p-4 text-sm text-slate-300">Sem {stud.currentSemester}</td>
                        <td className="p-4 text-sm text-slate-400">{stud.phone}</td>
                        <td className="p-4 font-bold text-amber-500">{stud.cgpa.toFixed(2)}</td>
                        <td className="p-4 flex gap-1.5">
                          <button 
                            type="button"
                            onClick={() => startEditStudent(stud)}
                            className="text-amber-400 hover:text-amber-300 p-2 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Edit Student"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteStudent(stud._id)}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-500 text-sm">No students registered in the system yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COURSE MANAGEMENT */}
        {activeTab === 'courses' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Course Catalog</h3>
              <button 
                onClick={() => setShowCourseModal(true)}
                className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all"
              >
                <Plus size={16} /> Add Course
              </button>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Code</th>
                      <th className="p-4">Title</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Semester</th>
                      <th className="p-4">Credits</th>
                      <th className="p-4">Assigned Instructor</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map(course => (
                      <tr key={course._id} className="border-b border-slate-800/60 hover:bg-slate-900/20 transition-colors">
                        <td className="p-4"><code className="bg-slate-900 px-2 py-0.5 rounded text-purple-400 text-sm">{course.courseCode}</code></td>
                        <td className="p-4 font-semibold">{course.title}</td>
                        <td className="p-4 text-sm text-slate-300">{course.department}</td>
                        <td className="p-4 text-sm text-slate-300">Sem {course.semester}</td>
                        <td className="p-4 text-sm text-slate-300">{course.credits} Credits</td>
                        <td className="p-4">
                          {course.facultyRef ? (
                            <span className="text-sm font-semibold text-emerald-400">{course.facultyRef.name}</span>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4 flex gap-1.5">
                          <button 
                            type="button"
                            onClick={() => startEditCourse(course)}
                            className="text-amber-400 hover:text-amber-300 p-2 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Edit Course"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteCourse(course._id)}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete Course"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {courses.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-500 text-sm">No courses listed. Click Add Course to create one.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FEE MANAGEMENT */}
        {activeTab === 'fees' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Outstanding Invoices & Dues</h3>
              <button 
                onClick={() => setShowFeeModal(true)}
                className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all"
              >
                <PlusCircle size={16} /> Generate Invoice
              </button>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Student</th>
                      <th className="p-4">Invoice ID</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map(f => (
                      <tr key={f._id} className="border-b border-slate-800/60 hover:bg-slate-900/20 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold">{f.studentRef?.name || 'Unknown Student'}</div>
                          <div className="text-xxs text-slate-400">{f.studentRef?.rollNumber}</div>
                        </td>
                        <td className="p-4"><code className="text-xxs text-slate-400 uppercase">{f.transactionId || 'PENDING'}</code></td>
                        <td className="p-4 text-sm font-semibold">{f.feeType}</td>
                        <td className="p-4 text-sm font-bold">₹{f.amount}</td>
                        <td className="p-4 text-sm text-slate-400">{new Date(f.dueDate).toLocaleDateString()}</td>
                        <td className="p-4">
                          {f.status === 'Paid' ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-semibold">Paid</span>
                          ) : (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-xs font-semibold">Unpaid</span>
                          )}
                        </td>
                        <td className="p-4">
                          {f.status !== 'Paid' && (
                            <button 
                              onClick={() => handleMarkFeePaid(f._id)}
                              className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-850 px-3 py-1.5 rounded-xl transition-all"
                            >
                              <CheckCircle size={14} /> Receive Fee
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {fees.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-500 text-sm">No fee invoices found in records.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ==================== MODALS ==================== */}

      {/* FACULTY REGISTRATION MODAL */}
      {showFacultyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-lg font-bold">Register Faculty Member</h4>
              <button onClick={() => setShowFacultyModal(false)} className="text-slate-400 hover:text-white font-bold">×</button>
            </div>

            <form onSubmit={handleAddFaculty} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={facultyForm.name} 
                    onChange={e => setFacultyForm({...facultyForm, name: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    placeholder="e.g. Dr. Sarah Connor"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Employee ID</label>
                  <input 
                    type="text" 
                    required
                    value={facultyForm.employeeId} 
                    onChange={e => setFacultyForm({...facultyForm, employeeId: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    placeholder="e.g. FAC-2026"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Email</label>
                  <input 
                    type="email" 
                    required
                    value={facultyForm.email} 
                    onChange={e => setFacultyForm({...facultyForm, email: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    placeholder="sarah@college.edu"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Password</label>
                  <input 
                    type="password" 
                    required
                    value={facultyForm.password} 
                    onChange={e => setFacultyForm({...facultyForm, password: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Department</label>
                  <select 
                    value={facultyForm.department} 
                    onChange={e => setFacultyForm({...facultyForm, department: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  >
                    {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Designation</label>
                  <input 
                    type="text" 
                    value={facultyForm.designation} 
                    onChange={e => setFacultyForm({...facultyForm, designation: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={facultyForm.phone} 
                  onChange={e => setFacultyForm({...facultyForm, phone: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setShowFacultyModal(false)} className="flex-1 bg-slate-950 text-slate-300 font-semibold py-2.5 rounded-xl border border-slate-800">Cancel</button>
                <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-all">Submit Registration</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT REGISTRATION & BULK UPLOAD MODAL */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 space-y-6 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <h4 className="text-lg font-bold">Add New Student Portal</h4>
                <p className="text-xxs text-slate-400 mt-0.5">Register a single student or batch-enroll via file upload</p>
              </div>
              <button 
                onClick={() => {
                  setShowStudentModal(false);
                  setParsedStudentsPreview([]);
                  setUploadResults(null);
                }} 
                className="text-slate-400 hover:text-white font-bold text-xl"
              >
                ×
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setStudentCreationTab('single');
                  setUploadResults(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  studentCreationTab === 'single'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Single Student Form
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudentCreationTab('bulk');
                  setUploadResults(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  studentCreationTab === 'bulk'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bulk CSV/JSON Import
              </button>
            </div>

            {/* TAB 1: SINGLE STUDENT */}
            {studentCreationTab === 'single' && (
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={newStudentForm.name} 
                      onChange={e => setNewStudentForm({...newStudentForm, name: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 text-sm"
                      placeholder="e.g. Alex Rivera"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={newStudentForm.email} 
                      onChange={e => setNewStudentForm({...newStudentForm, email: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 text-sm"
                      placeholder="alex@college.edu"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Password</label>
                    <input 
                      type="password" 
                      required
                      value={newStudentForm.password} 
                      onChange={e => setNewStudentForm({...newStudentForm, password: e.target.value})} 
                      className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Department</label>
                    <select 
                      value={newStudentForm.department} 
                      onChange={e => setNewStudentForm({...newStudentForm, department: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none text-sm"
                    >
                      {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    required
                    value={newStudentForm.phone} 
                    onChange={e => setNewStudentForm({...newStudentForm, phone: e.target.value})} 
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 text-sm"
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div className="p-3.5 bg-brand-500/5 border border-brand-500/10 rounded-xl text-xxs leading-relaxed text-brand-300">
                  ⚡ <strong>AuraERP Automated System</strong>: The student's unique Roll Number will be automatically generated by the backend and assigned during registration.
                </div>

                <div className="pt-2 flex gap-2">
                  <button type="button" onClick={() => setShowStudentModal(false)} className="flex-1 bg-slate-950 text-slate-300 font-semibold py-2.5 rounded-xl border border-slate-800 text-sm">Cancel</button>
                  <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-all text-sm">Register Student</button>
                </div>
              </form>
            )}

            {/* TAB 2: BULK IMPORT */}
            {studentCreationTab === 'bulk' && (
              <div className="space-y-4">
                
                {/* SUB-METHOD SELECTOR */}
                <div className="flex gap-4 border-b border-slate-800 pb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkInputMethod('upload');
                      setParsedStudentsPreview([]);
                      setUploadResults(null);
                    }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                      bulkInputMethod === 'upload'
                        ? 'bg-slate-800 text-brand-400 border-brand-500/30'
                        : 'text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    📁 Upload Document
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkInputMethod('paste');
                      setParsedStudentsPreview([]);
                      setUploadResults(null);
                    }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                      bulkInputMethod === 'paste'
                        ? 'bg-slate-800 text-brand-400 border-brand-500/30'
                        : 'text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    📝 Paste Raw Data
                  </button>
                </div>

                {bulkInputMethod === 'upload' ? (
                  /* Upload Area */
                  <div className="border-2 border-dashed border-slate-800 hover:border-brand-500 rounded-2xl p-6 text-center transition-all bg-slate-950/40 relative">
                    <input 
                      type="file" 
                      accept=".csv, .json"
                      onChange={handleFileImport}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2">
                      <div className="text-3xl">📤</div>
                      <h5 className="font-bold text-sm">Choose CSV or JSON File</h5>
                      <p className="text-xxs text-slate-400 max-w-sm mx-auto">
                        Drag & drop your file here or browse computer. Files will be parsed securely on your device before uploading.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Paste Area */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Paste CSV or JSON Student Roster</label>
                      <textarea
                        rows="5"
                        value={pastedText}
                        onChange={e => setPastedText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 text-xs font-mono"
                        placeholder="name, email, password, department, phone&#10;Alex Rivera, alex@college.edu, password123, Computer Science, 9876543210&#10;Jane Doe, jane@college.edu, password123, Information Technology, 9876543211"
                      ></textarea>
                    </div>
                    <button
                      type="button"
                      onClick={handlePasteParse}
                      className="w-full bg-slate-850 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl border border-slate-800 text-xs transition-all cursor-pointer"
                    >
                      🔍 Parse Pasted Text
                    </button>
                  </div>
                )}

                {/* Templates Helper */}
                <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-1.5 text-xxs">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-xxxs block mb-1">Required Headers & Layout</span>
                  <div className="font-mono text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800/60 overflow-x-auto">
                    name, email, password, department, phone<br />
                    Jane Doe, jane@college.edu, pass123, Computer Science, 9998887776
                  </div>
                  <p className="text-slate-500">
                    * Roll Number is **auto-generated** dynamically for each user during execution. Valid departments: {departments.slice(0, 3).join(', ')}, etc.
                  </p>
                </div>

                {/* Parsed List Preview */}
                {parsedStudentsPreview.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-brand-400">Parsed File Preview ({parsedStudentsPreview.length} students detected)</span>
                      <button 
                        onClick={() => setParsedStudentsPreview([])}
                        className="text-xxs text-red-400 underline hover:text-red-300"
                      >
                        Clear File
                      </button>
                    </div>
                    
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xxs">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Department</th>
                            <th className="p-2">Phone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedStudentsPreview.map((p, idx) => (
                            <tr key={idx} className="border-b border-slate-800/40 text-slate-300">
                              <td className="p-2 font-semibold">{p.name || <span className="text-red-400 italic">Missing</span>}</td>
                              <td className="p-2 text-slate-400">{p.email}</td>
                              <td className="p-2">{p.department}</td>
                              <td className="p-2">{p.phone}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={handleBulkStudentUpload}
                      disabled={uploadingFiles}
                      className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/10 active:scale-[0.99] disabled:opacity-50"
                    >
                      {uploadingFiles ? 'Uploading Batch...' : '✓ Commit Batch Enrollment'}
                    </button>
                  </div>
                )}

                {/* Upload Results Feed */}
                {uploadResults && (
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3 animate-fade-in text-xxs">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <h6 className="font-bold text-slate-200">Execution Report</h6>
                      <div className="flex gap-2.5">
                        <span className="text-emerald-400 font-bold">Successes: {uploadResults.createdCount}</span>
                        <span className="text-red-400 font-bold">Failures: {uploadResults.failedCount}</span>
                      </div>
                    </div>

                    {uploadResults.errors.length > 0 ? (
                      <div className="space-y-2">
                        <span className="text-amber-400 font-semibold block uppercase tracking-wider text-xxxs">Details of Failures</span>
                        <div className="max-h-32 overflow-y-auto space-y-1.5 font-mono text-[10px] bg-slate-900/60 p-2 border border-slate-800/60 rounded">
                          {uploadResults.errors.map((err, idx) => (
                            <div key={idx} className="text-red-300 border-b border-slate-950/40 pb-1">
                              ⚠️ Row {err.row} ({err.email}): <strong className="text-red-400">{err.message}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-emerald-400 font-bold text-center py-2">
                        🎉 All students were registered and assigned unique Roll Numbers successfully without errors!
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* COURSE CREATION MODAL */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-lg font-bold">Add Course Catalog</h4>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-white font-bold">×</button>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Course Code</label>
                  <input 
                    type="text" 
                    required
                    value={courseForm.courseCode} 
                    onChange={e => setCourseForm({...courseForm, courseCode: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    placeholder="e.g. CSE-401"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Course Title</label>
                  <input 
                    type="text" 
                    required
                    value={courseForm.title} 
                    onChange={e => setCourseForm({...courseForm, title: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    placeholder="e.g. Distributed Computing"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Department</label>
                  <select 
                    value={courseForm.department} 
                    onChange={e => setCourseForm({...courseForm, department: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  >
                    {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Credits</label>
                  <input 
                    type="number" 
                    value={courseForm.credits} 
                    onChange={e => setCourseForm({...courseForm, credits: parseInt(e.target.value)})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Target Semester</label>
                <select 
                  value={courseForm.semester} 
                  onChange={e => setCourseForm({...courseForm, semester: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                >
                  {['1','2','3','4','5','6','7','8'].map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Assign Instructor</label>
                <select 
                  value={courseForm.facultyRef} 
                  onChange={e => setCourseForm({...courseForm, facultyRef: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {faculties.map(f => <option key={f._id} value={f._id}>{f.name} ({f.department})</option>)}
                </select>
              </div>

              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setShowCourseModal(false)} className="flex-1 bg-slate-950 text-slate-300 font-semibold py-2.5 rounded-xl border border-slate-800">Cancel</button>
                <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-all">Create Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FEE INVOICE GENERATION MODAL */}
      {showFeeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-lg font-bold">Generate Fee Invoice</h4>
              <button onClick={() => setShowFeeModal(false)} className="text-slate-400 hover:text-white font-bold">×</button>
            </div>

            <form onSubmit={handleGenerateFee} className="space-y-4">
              <div className="flex items-center gap-2 py-2 border-b border-slate-800">
                <input 
                  type="checkbox" 
                  id="generateForAll"
                  checked={feeForm.generateForAll} 
                  onChange={e => setFeeForm({...feeForm, generateForAll: e.target.checked})} 
                  className="w-4 h-4 text-brand-600"
                />
                <label htmlFor="generateForAll" className="text-sm font-semibold text-slate-300">Generate for ALL Enrolled Students</label>
              </div>

              {!feeForm.generateForAll && (
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Target Student</label>
                  <select 
                    required={!feeForm.generateForAll}
                    value={feeForm.studentRef} 
                    onChange={e => setFeeForm({...feeForm, studentRef: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  >
                    <option value="">Select Student</option>
                    {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.rollNumber})</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Fee Category</label>
                  <select 
                    value={feeForm.feeType} 
                    onChange={e => setFeeForm({...feeForm, feeType: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  >
                    <option value="Tuition">Tuition Fees</option>
                    <option value="Library">Library Fund</option>
                    <option value="Exam">Exam Processing</option>
                    <option value="Hostel">Hostel Dues</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Billing Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={feeForm.amount} 
                    onChange={e => setFeeForm({...feeForm, amount: parseInt(e.target.value)})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Payment Due Date</label>
                <input 
                  type="date" 
                  required
                  value={feeForm.dueDate} 
                  onChange={e => setFeeForm({...feeForm, dueDate: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setShowFeeModal(false)} className="flex-1 bg-slate-950 text-slate-300 font-semibold py-2.5 rounded-xl border border-slate-800">Cancel</button>
                <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-all">Publish Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FACULTY MODAL */}
      {editingFaculty && (
        <div className="fixed inset-0 z-50 bg-slate-955/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-lg font-bold">Edit Faculty Member</h4>
              <button type="button" onClick={() => setEditingFaculty(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">×</button>
            </div>

            <form onSubmit={handleEditFacultySubmit} className="space-y-4">
              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={editFacultyForm.name} 
                  onChange={e => setEditFacultyForm({...editFacultyForm, name: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Department</label>
                  <select 
                    value={editFacultyForm.department} 
                    onChange={e => setEditFacultyForm({...editFacultyForm, department: e.target.value})} 
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  >
                    {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Designation</label>
                  <input 
                    type="text" 
                    required
                    value={editFacultyForm.designation} 
                    onChange={e => setEditFacultyForm({...editFacultyForm, designation: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  required
                  value={editFacultyForm.phone} 
                  onChange={e => setEditFacultyForm({...editFacultyForm, phone: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setEditingFaculty(null)} className="flex-1 bg-slate-950 text-slate-300 font-semibold py-2.5 rounded-xl border border-slate-800 cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-all cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-955/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-lg font-bold">Edit Student Profile</h4>
              <button type="button" onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">×</button>
            </div>

            <form onSubmit={handleEditStudentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={editStudentForm.name} 
                    onChange={e => setEditStudentForm({...editStudentForm, name: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    required
                    value={editStudentForm.phone} 
                    onChange={e => setEditStudentForm({...editStudentForm, phone: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Department</label>
                  <select 
                    value={editStudentForm.department} 
                    onChange={e => setEditStudentForm({...editStudentForm, department: e.target.value})} 
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  >
                    {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Semester</label>
                  <select 
                    value={editStudentForm.currentSemester} 
                    onChange={e => setEditStudentForm({...editStudentForm, currentSemester: e.target.value})} 
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  >
                    {['1','2','3','4','5','6','7','8'].map(sem => <option key={sem} value={sem}>Sem {sem}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Cumulative CGPA</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.00"
                  max="10.00"
                  required
                  value={editStudentForm.cgpa} 
                  onChange={e => setEditStudentForm({...editStudentForm, cgpa: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 bg-slate-950 text-slate-300 font-semibold py-2.5 rounded-xl border border-slate-800 cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-all cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COURSE MODAL */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-slate-955/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-lg font-bold">Edit Course Details</h4>
              <button type="button" onClick={() => setEditingCourse(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">×</button>
            </div>

            <form onSubmit={handleEditCourseSubmit} className="space-y-4">
              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Course Title</label>
                <input 
                  type="text" 
                  required
                  value={editCourseForm.title} 
                  onChange={e => setEditCourseForm({...editCourseForm, title: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Department</label>
                  <select 
                    value={editCourseForm.department} 
                    onChange={e => setEditCourseForm({...editCourseForm, department: e.target.value})} 
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  >
                    {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Credits</label>
                  <input 
                    type="number" 
                    required
                    value={editCourseForm.credits} 
                    onChange={e => setEditCourseForm({...editCourseForm, credits: parseInt(e.target.value)})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Semester</label>
                  <select 
                    value={editCourseForm.semester} 
                    onChange={e => setEditCourseForm({...editCourseForm, semester: e.target.value})} 
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  >
                    {['1','2','3','4','5','6','7','8'].map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Instructor</label>
                  <select 
                    value={editCourseForm.facultyRef} 
                    onChange={e => setEditCourseForm({...editCourseForm, facultyRef: e.target.value})} 
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {faculties.map(f => <option key={f._id} value={f._id}>{f.name} ({f.department})</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setEditingCourse(null)} className="flex-1 bg-slate-950 text-slate-300 font-semibold py-2.5 rounded-xl border border-slate-800 cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-all cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
