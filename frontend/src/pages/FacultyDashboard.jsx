import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Users, ClipboardList, QrCode, LogOut, Award, CheckCircle, 
  MapPin, HelpCircle, UserCheck, RefreshCw, BarChart2, Plus 
} from 'lucide-react';

const FacultyDashboard = () => {
  const { token, logout, API_URL } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('courses');
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  
  // Marks states
  const [marks, setMarks] = useState([]);
  const [marksForm, setMarksForm] = useState({
    studentId: '', type: 'Internal 1', marksObtained: 0, maxMarks: 100
  });

  // Attendance QR states
  const [qrSession, setQrSession] = useState(null);
  const [useGeofence, setUseGeofence] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [locLoading, setLocLoading] = useState(false);

  // Attendance report states
  const [attendanceReport, setAttendanceReport] = useState([]);

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
    fetchFacultyCourses();
  }, [token]);

  const fetchFacultyCourses = async () => {
    try {
      const res = await fetch(`${API_URL}/faculty/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.faculty);
        setCourses(data.courses);
        if (data.courses.length > 0) {
          setSelectedCourse(data.courses[0]);
        }
      }
    } catch (e) { console.error(e); }
  };

  // When course changes, load students, marks, and attendance reports
  useEffect(() => {
    if (!selectedCourse) return;
    fetchEnrolledStudents();
    fetchCourseMarks();
    fetchAttendanceReport();
    setQrSession(null); // Reset session QR
  }, [selectedCourse]);

  const fetchEnrolledStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/faculty/courses/${selectedCourse._id}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setStudents(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchCourseMarks = async () => {
    try {
      const res = await fetch(`${API_URL}/faculty/marks/${selectedCourse._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setMarks(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAttendanceReport = async () => {
    try {
      const res = await fetch(`${API_URL}/faculty/attendance/report/${selectedCourse._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAttendanceReport(await res.json());
    } catch (e) { console.error(e); }
  };

  // Upload/Save Student Marks
  const handleUploadMarks = async (e) => {
    e.preventDefault();
    if (!marksForm.studentId) {
      triggerMessage('Please select a student', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/faculty/marks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...marksForm,
          courseId: selectedCourse._id
        })
      });
      if (res.ok) {
        triggerMessage('Marks submitted successfully!');
        fetchCourseMarks();
        setMarksForm({ studentId: '', type: 'Internal 1', marksObtained: 0, maxMarks: 100 });
      } else {
        triggerMessage('Failed to upload marks', 'error');
      }
    } catch (err) { triggerMessage('Network error', 'error'); }
  };

  // Geolocation trigger for dynamic QR Code geofencing
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      triggerMessage('Geolocation not supported by browser', 'error');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
        triggerMessage('Coordinates secured successfully!');
      },
      (err) => {
        console.error(err);
        setLocLoading(false);
        triggerMessage('Failed to fetch GPS coordinates. Geofencing disabled.', 'error');
        setUseGeofence(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Generate dynamic QR Session ID
  const handleGenerateQRSession = async () => {
    try {
      const body = {
        courseId: selectedCourse._id,
        lat: useGeofence ? location.lat : null,
        lng: useGeofence ? location.lng : null
      };

      const res = await fetch(`${API_URL}/faculty/attendance/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const sessionData = await res.json();
        setQrSession(sessionData);
        triggerMessage('Dynamic QR Attendance session generated!');
        fetchAttendanceReport(); // Refresh session table
      }
    } catch (e) {
      console.error(e);
      triggerMessage('Error generating session', 'error');
    }
  };

  // Generate QR image URL dynamically
  const getQRImageUrl = () => {
    if (!qrSession) return '';
    // Format JSON payload to embed into QR code for student scanning
    const qrPayload = JSON.stringify({
      qrSessionId: qrSession.qrSessionId,
      courseId: qrSession.courseId,
      courseCode: qrSession.courseCode,
      courseTitle: qrSession.courseTitle,
      sessionLat: qrSession.lat,
      sessionLng: qrSession.lng
    });
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(qrPayload)}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-brand-600 p-1.5 rounded-lg text-white animate-pulse">
              <Award size={20} />
            </div>
            <span className="font-extrabold text-xl tracking-tight">Aura<span className="text-brand-500">ERP</span></span>
          </div>

          {profile && (
            <div className="mb-6 p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
              <div className="font-bold text-sm text-slate-200">{profile.name}</div>
              <div className="text-xxs uppercase tracking-wider text-slate-400 font-semibold">{profile.designation}</div>
              <div className="text-xxs text-slate-500">{profile.department}</div>
            </div>
          )}

          <nav className="space-y-1.5">
            {[
              { id: 'courses', label: 'My Assigned Courses', icon: BookOpen },
              { id: 'marks', label: 'Marks Management', icon: ClipboardList },
              { id: 'attendance', label: 'QR Attendance System', icon: QrCode },
              { id: 'reports', label: 'Attendance Analytics', icon: BarChart2 }
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

      {/* Main Workspace */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Faculty Portal</h1>
            <p className="text-slate-400 text-sm mt-0.5">Manage grading rosters, courses, and QR geofenced attendances</p>
          </div>

          {courses.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2">
              <span className="text-xxs uppercase tracking-wider font-bold text-slate-400">Current Course:</span>
              <select
                value={selectedCourse?._id || ''}
                onChange={(e) => setSelectedCourse(courses.find(c => c._id === e.target.value))}
                className="bg-transparent text-sm font-bold text-brand-400 focus:outline-none cursor-pointer"
              >
                {courses.map(c => <option key={c._id} value={c._id} className="bg-slate-950 text-white">{c.courseCode} - {c.title}</option>)}
              </select>
            </div>
          )}
        </header>

        {/* Global Toast Notification */}
        {message.text && (
          <div className={`p-4 rounded-xl mb-6 border text-sm font-semibold transition-all ${
            message.type === 'error' 
              ? 'bg-red-500/10 border-red-500/20 text-red-300' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}>
            {message.text}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-8 text-center max-w-2xl mx-auto my-12 space-y-4 animate-fade-in">
            <BookOpen size={48} className="mx-auto text-slate-600 mb-2" />
            <h3 className="text-lg font-bold text-slate-200">No Assigned Courses</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              You currently do not have any courses assigned to your profile. 
              Please log in as an **Administrator** and assign a course to your name under the 
              <strong>Course Management</strong> panel to activate your grading, attendance, and analytics rosters.
            </p>
          </div>
        ) : (
          <>
            {/* ==================== TAB 1: ASSIGNED COURSES ==================== */}
            {activeTab === 'courses' && selectedCourse && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-brand-400">{selectedCourse.courseCode} - {selectedCourse.title}</h3>
                  <p className="text-slate-400 text-sm mt-1">Syllabus tracking & department credentials</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-800/60">
                    <div>
                      <span className="block text-xxs font-bold uppercase tracking-wider text-slate-400">Semester</span>
                      <span className="text-base font-semibold">Semester {selectedCourse.semester}</span>
                    </div>
                    <div>
                      <span className="block text-xxs font-bold uppercase tracking-wider text-slate-400">Credits</span>
                      <span className="text-base font-semibold text-amber-500">{selectedCourse.credits} Credits</span>
                    </div>
                    <div>
                      <span className="block text-xxs font-bold uppercase tracking-wider text-slate-400">Department</span>
                      <span className="text-base font-semibold">{selectedCourse.department}</span>
                    </div>
                    <div>
                      <span className="block text-xxs font-bold uppercase tracking-wider text-slate-400">Enrolled Students</span>
                      <span className="text-base font-semibold text-brand-500">{students.length} Students</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4">Enrolled Class List</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map(stud => (
                      <div key={stud._id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm">{stud.name}</div>
                          <div className="text-xxs text-slate-400 mt-0.5">Roll: {stud.rollNumber}</div>
                        </div>
                        <span className="text-xs bg-slate-950 px-2.5 py-1 rounded-full text-slate-400 font-semibold">Sem {stud.currentSemester}</span>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <p className="text-slate-500 text-sm italic col-span-3">No students found matching this department and semester.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 2: MARKS MANAGEMENT ==================== */}
            {activeTab === 'marks' && selectedCourse && (
              <div className="space-y-6 animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Marks Roster Input Form */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 lg:col-span-1 space-y-4">
                  <h3 className="text-lg font-bold">Grade Student</h3>
                  <p className="text-slate-400 text-xs">Publish evaluation scores for internal and end semester examinations</p>
                  
                  <form onSubmit={handleUploadMarks} className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Select Student</label>
                      <select
                        required
                        value={marksForm.studentId}
                        onChange={e => setMarksForm({...marksForm, studentId: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                      >
                        <option value="">-- Select Class Student --</option>
                        {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.rollNumber})</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Exam Type</label>
                        <select
                          value={marksForm.type}
                          onChange={e => setMarksForm({...marksForm, type: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                        >
                          <option value="Internal 1">Internal 1</option>
                          <option value="Internal 2">Internal 2</option>
                          <option value="End Semester">End Semester</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Max Score</label>
                        <input
                          type="number"
                          required
                          value={marksForm.maxMarks}
                          onChange={e => setMarksForm({...marksForm, maxMarks: parseInt(e.target.value)})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Marks Obtained</label>
                      <input
                        type="number"
                        required
                        value={marksForm.marksObtained}
                        onChange={e => setMarksForm({...marksForm, marksObtained: parseInt(e.target.value)})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Publish Score
                    </button>
                  </form>
                </div>

                {/* Marks Ledger Table */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl lg:col-span-2 overflow-hidden">
                  <div className="p-4 border-b border-slate-800">
                    <h4 className="font-bold">Grades Ledger</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="p-4">Student</th>
                          <th className="p-4">Exam Type</th>
                          <th className="p-4">Score</th>
                          <th className="p-4">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marks.map(m => (
                          <tr key={m._id} className="border-b border-slate-800/60 hover:bg-slate-900/20 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold">{m.studentRef?.name}</div>
                              <div className="text-xxs text-slate-400">{m.studentRef?.rollNumber}</div>
                            </td>
                            <td className="p-4 text-sm font-semibold">{m.type}</td>
                            <td className="p-4 text-sm font-bold">{m.marksObtained} / {m.maxMarks}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-800 rounded-full h-1.5">
                                  <div 
                                    className="bg-brand-500 h-1.5 rounded-full" 
                                    style={{ width: `${(m.marksObtained / m.maxMarks) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-semibold text-slate-300">{((m.marksObtained / m.maxMarks) * 100).toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {marks.length === 0 && (
                          <tr>
                            <td colSpan="4" className="p-8 text-center text-slate-500 text-sm">No marks entries uploaded for this course yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ==================== TAB 3: QR ATTENDANCE GENERATION ==================== */}
            {activeTab === 'attendance' && selectedCourse && (
              <div className="space-y-6 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                
                {/* Generate Action Card */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">Generate QR Code Attendance</h3>
                    <p className="text-slate-400 text-xs">Launch a real-time attendance session. Students scan this code to mark themselves present.</p>
                  </div>

                  {/* Geofencing configuration */}
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-200">Enable GPS Geofencing</span>
                      <input
                        type="checkbox"
                        checked={useGeofence}
                        onChange={(e) => {
                          setUseGeofence(e.target.checked);
                          if (e.target.checked && !location.lat) {
                            handleRequestLocation();
                          }
                        }}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                    </div>
                    
                    {useGeofence && (
                      <div className="text-xs space-y-2 border-t border-slate-800/80 pt-3 text-slate-300">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-brand-400" />
                          <span>Verifies student scans within <strong className="text-white">100 meters</strong> range.</span>
                        </div>

                        {locLoading ? (
                          <div className="text-xxs text-slate-400 flex items-center gap-1.5">
                            <RefreshCw size={10} className="animate-spin" /> Retrieving hardware GPS coordinates...
                          </div>
                        ) : location.lat ? (
                          <div className="text-xxs font-mono text-emerald-400">
                            Classroom GPS: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                          </div>
                        ) : (
                          <button 
                            type="button" 
                            onClick={handleRequestLocation}
                            className="text-xxs text-brand-400 underline"
                          >
                            Request GPS Access
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateQRSession}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 active:scale-[0.98]"
                  >
                    <QrCode size={18} />
                    <span>Launch QR Attendance Session</span>
                  </button>
                </div>

                {/* Display QR Card */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[360px] relative overflow-hidden">
                  {qrSession ? (
                    <div className="text-center space-y-4 animate-fade-in">
                      <div className="bg-white p-4 rounded-xl inline-block shadow-2xl border border-slate-700">
                        <img 
                          src={getQRImageUrl()} 
                          alt="Attendance QR Code"
                          className="w-64 h-64 mx-auto"
                        />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-brand-400">Class QR is Active</h4>
                        <p className="text-xxs text-slate-400">Session: <code className="text-slate-300 font-mono text-[10px]">{qrSession.qrSessionId}</code></p>
                        {qrSession.lat && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-slate-900 border border-slate-800 text-emerald-400 px-2 py-0.5 rounded-full font-mono mt-1">
                            <MapPin size={8} /> Location verification active
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 p-8 space-y-2">
                      <QrCode size={48} className="mx-auto text-slate-600 mb-2" />
                      <h4 className="font-bold text-slate-400 text-sm">QR Code Inactive</h4>
                      <p className="text-xs">No active attendance session started. Trigger the generator to launch.</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ==================== TAB 4: ATTENDANCE ANALYTICS ==================== */}
            {activeTab === 'reports' && selectedCourse && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Attendance Statistics</h3>
                  <button 
                    onClick={fetchAttendanceReport}
                    className="bg-slate-950 hover:bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all text-slate-300"
                  >
                    <RefreshCw size={12} /> Sync Reports
                  </button>
                </div>

                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden animate-fade-in">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="p-4">Student Name</th>
                          <th className="p-4">Roll Number</th>
                          <th className="p-4 text-center">Present</th>
                          <th className="p-4 text-center">Absent</th>
                          <th className="p-4 text-center">Total Sessions</th>
                          <th className="p-4">Attendance Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceReport.map(r => (
                          <tr key={r.studentId} className="border-b border-slate-800/60 hover:bg-slate-900/20 transition-colors">
                            <td className="p-4 font-semibold">{r.name}</td>
                            <td className="p-4"><code>{r.rollNumber}</code></td>
                            <td className="p-4 text-center text-emerald-400 font-bold">{r.present}</td>
                            <td className="p-4 text-center text-red-400">{r.absent}</td>
                            <td className="p-4 text-center font-semibold text-slate-300">{r.total}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-28 bg-slate-800 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full ${r.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${r.percentage}%` }}
                                  ></div>
                                </div>
                                <span className={`text-xs font-bold ${r.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {r.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {attendanceReport.length === 0 && (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-slate-500 text-sm">No statistics available. Enroll students and scan class QR.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
};

export default FacultyDashboard;
