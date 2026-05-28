import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  BookOpen, Landmark, ClipboardList, QrCode, LogOut, Award, CheckCircle, 
  MapPin, RefreshCw, CreditCard, Sparkles, User, AlertCircle 
} from 'lucide-react';

const StudentDashboard = () => {
  const { token, logout, API_URL } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Student core dashboard data
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);

  // Academic marks / CGPA report
  const [marksReport, setMarksReport] = useState([]);
  const [cgpa, setCgpa] = useState("0.00");
  const [totalCredits, setTotalCredits] = useState(0);

  // QR Attendance scanning states
  const [scanPayload, setScanPayload] = useState('');
  const [scanning, setScanning] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState({ lat: null, lng: null });
  const [gpsLoading, setGpsLoading] = useState(false);

  // Fee details
  const [fees, setFees] = useState([]);
  const [payLoading, setPayLoading] = useState(null);

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
    fetchDashboardData();
    fetchMarksReport();
    fetchFees();
    fetchStudentGPS(); // pre-fetch GPS coordinate
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${API_URL}/student/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudent(data.student);
        setCourses(data.courses);
        setAttendanceStats(data.attendanceStats);
      }
    } catch (e) { console.error(e); }
  };

  const fetchMarksReport = async () => {
    try {
      const res = await fetch(`${API_URL}/student/marks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMarksReport(data.marksReport);
        setCgpa(data.cgpa);
        setTotalCredits(data.totalCredits);
      }
    } catch (e) { console.error(e); }
  };

  const fetchFees = async () => {
    try {
      const res = await fetch(`${API_URL}/student/fees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setFees(await res.json());
    } catch (e) { console.error(e); }
  };

  // Student GPS retrieval
  const fetchStudentGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        console.error(err);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Submit scan payload to backend
  const handleScanSubmit = async (payloadString) => {
    try {
      // Expecting payload to be a JSON string from QR generator
      const payloadObj = JSON.parse(payloadString);
      
      const body = {
        qrSessionId: payloadObj.qrSessionId,
        courseId: payloadObj.courseId,
        lat: gpsCoordinates.lat,
        lng: gpsCoordinates.lng,
        sessionLat: payloadObj.sessionLat,
        sessionLng: payloadObj.sessionLng
      };

      const res = await fetch(`${API_URL}/student/attendance/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();

      if (res.ok) {
        triggerMessage('Attendance recorded successfully! Dynamic verification approved.');
        fetchDashboardData(); // Refresh percentage stats
        setScanPayload('');
      } else {
        triggerMessage(data.message || 'Error recording scan', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerMessage('Invalid QR Code content payload structure', 'error');
    }
  };

  // Simulate scanning via a QR scanner plugin or button simulation
  const handleTriggerSimulatedScan = () => {
    if (!scanPayload) {
      triggerMessage('Please paste or scan a valid attendance QR payload', 'error');
      return;
    }
    handleScanSubmit(scanPayload);
  };

  // React dynamic scanner hook trigger
  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    });

    scanner.render(
      (decodedText) => {
        setScanPayload(decodedText);
        setScanning(false);
        scanner.clear();
        handleScanSubmit(decodedText);
      },
      (error) => {
        // quiet scanning errors
      }
    );

    return () => {
      scanner.clear().catch(e => console.error(e));
    };
  }, [scanning]);

  // Simulate Fee payment
  const handleSimulatePayment = async (feeId) => {
    setPayLoading(feeId);
    try {
      const res = await fetch(`${API_URL}/student/fees/pay/${feeId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerMessage('Fee payment simulated successfully via secured gateway!');
        fetchFees();
        fetchDashboardData();
      } else {
        triggerMessage('Payment simulation failed', 'error');
      }
    } catch (e) { console.error(e); }
    finally { setPayLoading(null); }
  };

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

          {student && (
            <div className="mb-6 p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
              <div className="font-bold text-sm text-slate-200">{student.name}</div>
              <div className="text-xxs font-semibold uppercase tracking-wider text-brand-400">Roll: {student.rollNumber}</div>
              <div className="text-xxs text-slate-400">{student.department}</div>
            </div>
          )}

          <nav className="space-y-1.5">
            {[
              { id: 'overview', label: 'My Academic Desk', icon: BookOpen },
              { id: 'marks', label: 'Report Cards & CGPA', icon: ClipboardList },
              { id: 'attendance', label: 'Scan Class QR', icon: QrCode },
              { id: 'fees', label: 'Billing & Payments', icon: CreditCard }
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

      {/* Main Container */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Student Portal</h1>
            <p className="text-slate-400 text-sm mt-0.5">Academic records, performance indicators, and scanning terminal</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-300 font-semibold">Active Session: Student</span>
          </div>
        </header>

        {/* Global Alert Notification */}
        {message.text && (
          <div className={`p-4 rounded-xl mb-6 border text-sm font-semibold transition-all ${
            message.type === 'error' 
              ? 'bg-red-500/10 border-red-500/20 text-red-300' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* ==================== TAB 1: ACADEMIC DESK OVERVIEW ==================== */}
        {activeTab === 'overview' && student && (
          <div className="space-y-8 animate-fade-in">
            {/* Header CGPA stats panel */}
            <div className="bg-gradient-to-r from-slate-950/60 to-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold flex items-center gap-1.5 text-white">
                  Welcome Back, {student.name}!
                  <Sparkles size={16} className="text-yellow-400 animate-spin" style={{ animationDuration: '6s' }} />
                </h3>
                <p className="text-slate-400 text-sm">You are currently enrolled in <strong className="text-white">Semester {student.currentSemester}</strong>, department of <strong className="text-white">{student.department}</strong>.</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                <div className="bg-amber-500/10 p-2.5 rounded-lg text-amber-500">
                  <Award size={28} />
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Cumulative CGPA</span>
                  <span className="text-2xl font-extrabold text-amber-500">{cgpa}</span>
                </div>
              </div>
            </div>

            {/* Attendance tracking cards */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400">Subject Attendance Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {attendanceStats.map((stat, i) => (
                  <div key={i} className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <code className="text-xxs bg-slate-900 px-2 py-0.5 rounded text-purple-400 font-semibold">{stat.courseCode}</code>
                        <h5 className="font-bold text-sm text-slate-200 mt-1">{stat.courseTitle}</h5>
                      </div>
                      <span className={`text-xs font-extrabold ${stat.percentage >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stat.percentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${stat.percentage >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={{ width: `${stat.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xxs text-slate-400">
                        <span>Attended: {stat.present} / {stat.total}</span>
                        {stat.percentage < 75 && (
                          <span className="text-red-400 font-bold flex items-center gap-0.5">
                            <AlertCircle size={10} /> Low Attendance
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {attendanceStats.length === 0 && (
                  <p className="text-slate-500 text-sm italic col-span-3">No courses registered for this semester yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: MARKS REPORT CARD ==================== */}
        {activeTab === 'marks' && (
          <div className="space-y-6 animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* CGPA Calculator Explainer */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 lg:col-span-1 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                CGPA Analysis <Sparkles size={16} className="text-amber-500" />
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Calculated dynamically from class grades using credit weightings:
              </p>
              
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl font-mono text-xs space-y-1 bg-black/30">
                <div className="text-brand-400">CGPA = Sum(GP * Credits) / Sum(Credits)</div>
                <div className="text-slate-500 text-[10px] mt-2 border-t border-slate-800/80 pt-2">Grade Weight Scale:</div>
                <div className="text-slate-400 text-[10px]">&gt;= 90% : A+ (10 GP) | &gt;= 80% : A (9 GP)</div>
                <div className="text-slate-400 text-[10px]">&gt;= 70% : B (8 GP) | &gt;= 60% : C (7 GP)</div>
                <div className="text-slate-400 text-[10px]">&gt;= 50% : D (6 GP) | &lt; 50% : F (0 GP)</div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Credits</span>
                  <span className="text-xl font-bold">{totalCredits}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">CGPA Status</span>
                  <span className={`text-xl font-bold ${parseFloat(cgpa) >= 7.5 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {parseFloat(cgpa) >= 7.5 ? 'First Class Distinction' : 'First Class'}
                  </span>
                </div>
              </div>
            </div>

            {/* Marks Details List */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl lg:col-span-2 overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h4 className="font-bold">Semester Marksheet</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Course</th>
                      <th className="p-4 text-center">Int 1 (20)</th>
                      <th className="p-4 text-center">Int 2 (20)</th>
                      <th className="p-4 text-center">End Sem (60)</th>
                      <th className="p-4 text-center">Total (100)</th>
                      <th className="p-4 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksReport.map((m, i) => (
                      <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-900/20 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold">{m.title}</div>
                          <div className="text-xxs text-slate-400 mt-0.5">{m.courseCode} ({m.credits} Credits)</div>
                        </td>
                        <td className="p-4 text-center text-sm font-semibold text-slate-300">{m.internal1}</td>
                        <td className="p-4 text-center text-sm font-semibold text-slate-300">{m.internal2}</td>
                        <td className="p-4 text-center text-sm font-semibold text-slate-300">{m.endSem}</td>
                        <td className="p-4 text-center text-sm font-bold">{m.total}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                            m.grade === 'F' 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {m.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {marksReport.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500 text-sm">No marks report cards found. Faculty must upload exam marks.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 3: SCAN QR ATTENDANCE ==================== */}
        {activeTab === 'attendance' && (
          <div className="space-y-6 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Real Webcam QR Terminal */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
              <h3 className="text-base font-bold mb-4 self-start">Camera Scanner</h3>
              
              {scanning ? (
                <div className="w-full flex flex-col items-center">
                  <div id="reader" className="w-full max-w-sm rounded-xl overflow-hidden border border-slate-700 bg-black"></div>
                  <button 
                    onClick={() => setScanning(false)}
                    className="mt-4 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                  >
                    Shut Down Camera
                  </button>
                </div>
              ) : (
                <div className="text-center p-8 space-y-4">
                  <QrCode size={56} className="mx-auto text-brand-400" />
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">Click below to trigger your mobile/webcam scanner and align with the class board QR code.</p>
                  
                  <button
                    onClick={() => setScanning(true)}
                    className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-5 py-3 rounded-xl transition-all shadow-lg shadow-brand-600/10 text-xs"
                  >
                    Open Camera Scanner
                  </button>
                </div>
              )}
            </div>

            {/* Simulating Paste Scanner - Highly robust on localhost! */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold">Simulated QR Code Scan</h3>
                <p className="text-slate-400 text-xs">Pasted JSON payloads simulate scanning without camera dependencies, particularly during localhost demonstrations.</p>
              </div>

              {/* GPS confirmation check */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Device Location Verification</span>
                  {gpsLoading ? (
                    <span className="text-xxs text-slate-400 flex items-center gap-1"><RefreshCw size={8} className="animate-spin" /> Fetching GPS...</span>
                  ) : gpsCoordinates.lat ? (
                    <span className="text-xxs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">GPS SECURED</span>
                  ) : (
                    <span className="text-xxs text-slate-500 font-bold">DISABLED</span>
                  )}
                </div>
                {gpsCoordinates.lat && (
                  <div className="text-[10px] font-mono text-slate-400">
                    Latitude: {gpsCoordinates.lat.toFixed(5)} | Longitude: {gpsCoordinates.lng.toFixed(5)}
                  </div>
                )}
                {!gpsCoordinates.lat && !gpsLoading && (
                  <button onClick={fetchStudentGPS} className="text-xxs text-brand-400 underline font-semibold flex items-center gap-1"><MapPin size={10} /> Enable Coordinates verification</button>
                )}
              </div>

              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">Paste Scanned QR Code Data</label>
                <textarea
                  value={scanPayload}
                  onChange={(e) => setScanPayload(e.target.value)}
                  rows="3"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                  placeholder='{"qrSessionId":"ATT_CSE-401_1716...","courseId":"...","sessionLat":...}'
                />
              </div>

              <button
                type="button"
                onClick={handleTriggerSimulatedScan}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-all text-xs"
              >
                Mark Attendance
              </button>
            </div>

          </div>
        )}

        {/* ==================== TAB 4: FEE INVOICES & PAYMENTS ==================== */}
        {activeTab === 'fees' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold">Invoices & Fees Ledger</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fees.map(f => (
                <div key={f._id} className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="block text-xxs font-bold uppercase tracking-wider text-slate-500">Invoice Category</span>
                      <h4 className="font-bold text-base text-slate-200 mt-0.5">{f.feeType} Fees</h4>
                    </div>
                    {f.status === 'Paid' ? (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold">Paid</span>
                    ) : (
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold animate-pulse">Unpaid</span>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-slate-900 pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Bill Amount:</span>
                      <span className="font-bold text-white text-sm">₹{f.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Due Date:</span>
                      <span className="text-slate-300 font-semibold">{new Date(f.dueDate).toLocaleDateString()}</span>
                    </div>
                    {f.status === 'Paid' && (
                      <>
                        <div className="flex justify-between text-slate-400">
                          <span>Payment Date:</span>
                          <span className="text-slate-300">{new Date(f.paymentDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between font-mono text-[10px] text-slate-500">
                          <span>Transaction ID:</span>
                          <span className="uppercase text-slate-400">{f.transactionId}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {f.status !== 'Paid' && (
                    <button
                      disabled={payLoading === f._id}
                      onClick={() => handleSimulatePayment(f._id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2"
                    >
                      {payLoading === f._id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <CreditCard size={14} /> Pay Fee Simulation
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
              {fees.length === 0 && (
                <p className="text-slate-500 text-sm italic">No fee invoices currently assigned to your profile record.</p>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default StudentDashboard;
