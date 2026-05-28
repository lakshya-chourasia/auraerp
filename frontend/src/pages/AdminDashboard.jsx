import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BookOpen, Landmark, UserCheck, Trash2, Plus, LogOut, CheckCircle, 
  Settings, Award, HelpCircle, FileSpreadsheet, PlusCircle, CreditCard 
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
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);

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
                        <td className="p-4">
                          <button 
                            onClick={() => handleDeleteFaculty(fac._id)}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
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
            <h3 className="text-lg font-bold">Student Directory</h3>

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
                        <td className="p-4">
                          <button 
                            onClick={() => handleDeleteStudent(stud._id)}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
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
                        <td className="p-4">
                          <button 
                            onClick={() => handleDeleteCourse(course._id)}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
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

    </div>
  );
};

export default AdminDashboard;
