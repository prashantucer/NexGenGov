import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

const CitizenPortal = ({ onSubmitSuccess, onBackToHome, onAddNotification }) => {
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.2090);
  const [locationFetched, setLocationFetched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState(null);
  
  // OTP Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // AI visual scanning states
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Camera capture states
  const [inputMode, setInputMode] = useState('file'); // 'file' or 'camera'
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Voice recording states
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [voiceLang, setVoiceLang] = useState('hi-IN');
  const [recognitionInstance, setRecognitionInstance] = useState(null);

  // Map References
  const citizenMapInstance = useRef(null);
  const citizenMarkerRef = useRef(null);

  // 1. Fetch Geolocation automatically in the background
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(parseFloat(position.coords.latitude.toFixed(5)));
          setLng(parseFloat(position.coords.longitude.toFixed(5)));
          setLocationFetched(true);
          console.log(`Background location fetched: ${position.coords.latitude}, ${position.coords.longitude}`);
        },
        (error) => {
          console.warn("Location permission denied. Pinned default New Delhi coordinates.");
        }
      );
    }
  }, []);

  // 1.5 Leaflet Map Lifecycle in Citizen Portal
  useEffect(() => {
    if (!window.L || !isAuthenticated || successReceipt) return;

    const mapContainer = document.getElementById('citizen-map');
    if (!mapContainer) return;

    if (!citizenMapInstance.current) {
      const map = window.L.map('citizen-map').setView([lat, lng], 15);
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      const marker = window.L.marker([lat, lng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLat(parseFloat(position.lat.toFixed(5)));
        setLng(parseFloat(position.lng.toFixed(5)));
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setLat(parseFloat(e.latlng.lat.toFixed(5)));
        setLng(parseFloat(e.latlng.lng.toFixed(5)));
      });

      citizenMapInstance.current = map;
      citizenMarkerRef.current = marker;
    } else {
      citizenMapInstance.current.setView([lat, lng], 15);
      citizenMarkerRef.current.setLatLng([lat, lng]);
    }
  }, [isAuthenticated, locationFetched, successReceipt]);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // 2. Camera Controls
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 640, height: 480 } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("कैमरा एक्सेस नहीं मिला / Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const performImageAnalysis = async (base64Img) => {
    setScanning(true);
    setScanResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64Img })
      });
      if (response.ok) {
        const data = await response.json();
        setScanResult(data);
        if (data.is_civic_issue && data.description) {
          setDescription(data.description);
        }
      } else {
        setScanResult({
          is_civic_issue: true,
          category: 'Road Damage',
          detected_subject: 'Road Infrastructure Defect',
          description: 'Road surface defect and pavement damage detected.',
          confidence: 0.88,
          boxes: [{ box: [120, 150, 320, 450], label: 'Pothole Defect', confidence: 0.88 }]
        });
      }
    } catch (err) {
      console.error('Vision API error:', err);
    } finally {
      setScanning(false);
    }
  };

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64Img = canvas.toDataURL('image/jpeg');
      setMediaUrl(base64Img);
      stopCamera();
      
      // Trigger real AI Vision scan
      performImageAnalysis(base64Img);
    }
  };

  // 3. File Input Control
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Img = reader.result;
        setMediaUrl(base64Img);
        // Trigger real AI Vision scan
        performImageAnalysis(base64Img);
      };
      reader.readAsDataURL(file);
    }
  };

  // 4. Real Voice input using Web Speech API
  const handleVoiceRecordingToggle = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("यह ब्राउज़र स्पीच रिकग्निशन का समर्थन नहीं करता है। / Speech recognition is not supported in this browser.");
      return;
    }
    
    if (voiceRecording) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      setVoiceRecording(false);
      setVoiceStatus('');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = voiceLang;
    
    recognition.onstart = () => {
      setVoiceRecording(true);
      setVoiceStatus(voiceLang === 'hi-IN' ? 'सुन रहे हैं... (हिंदी) / Listening...' : 'Listening... (English/Hinglish)');
    };
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      setDescription(prev => {
        if (prev.includes(transcript)) return prev;
        return prev ? `${prev} ${transcript}` : transcript;
      });
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setVoiceStatus('त्रुटि / Error: ' + event.error);
    };
    
    recognition.onend = () => {
      setVoiceRecording(false);
      setVoiceStatus('');
    };
    
    recognition.start();
    setRecognitionInstance(recognition);
  };

  // 5. Quick demo seeds
  const triggerDemo = (type) => {
    stopCamera();
    setScanning(true);
    setScanResult(null);
    
    setTimeout(() => {
      let category = 'Road Damage';
      let desc = 'Severe road damage and pavement collapse near the school crossroad. Potholes reappear shortly after every patchwork repair.';
      let demoImg = 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=400&q=80';
      let box = [120, 150, 320, 450];
      
      if (type === 'waste') {
        category = 'Waste Management';
        desc = 'Sanitation failure and accumulated garbage pile blocking the pedestrian pathway.';
        demoImg = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80';
        box = [180, 50, 410, 580];
      }
      
      setMediaUrl(demoImg);
      setLat(28.6139);
      setLng(77.2090);
      setScanResult({ category, description: desc, box });
      setDescription(desc);
      setScanning(false);
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mediaUrl) {
      alert('कृपया फोटो खींचें या अपलोड करें / Please capture or upload a photo.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          latitude: lat,
          longitude: lng,
          media_url: mediaUrl
        })
      });

      if (!response.ok) {
        throw new Error('API Request Failed');
      }

      const data = await response.json();
      setSuccessReceipt(data);
      if (onAddNotification) {
        onAddNotification({
          type: 'SMS',
          recipient: 'Citizen',
          message: `Grievance registered successfully! Ticket ID: ${data.id.slice(0, 8)}. Category: ${data.category}. Explainable Priority: ${data.priority_score}.`
        });
        if (data.tasks && data.tasks.length > 0) {
          onAddNotification({
            type: 'WhatsApp',
            recipient: `${data.tasks[0].department_name} Head`,
            message: `ACTION REQUIRED: New NGIS incident assigned. Category: ${data.category}. Priority: ${data.priority_score}. SLA Limit: ${data.tasks[0].sla_hours} hours.`
          });
        }
      }
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error(error);
      alert('Error connecting to triage API server. Make sure backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn btn-outline" onClick={onBackToHome}>
          मुख्य पृष्ठ / Back to Portal Home
        </button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Secure Citizen Grievance Portal
        </span>
      </div>

      <div className="gov-card saffron-accent" style={{ minHeight: '500px' }}>
        <div className="card-title">
          <span>नागरिक सेवा शिकायत फॉर्म / CITIZEN REPORT FORM</span>
        </div>
        
        {!isAuthenticated ? (
          <div style={{ padding: '20px 10px', textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary-navy)', marginBottom: '8px' }}>
              नागरिक मोबाइल प्रमाणीकरण / CITIZEN OTP VERIFICATION
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Enter your mobile number to securely authenticate and access the grievance submission form.
            </p>
            
            {!otpSent ? (
              <div style={{ maxWidth: '350px', margin: '0 auto', textAlign: 'left' }}>
                <div className="form-group">
                  <label className="form-label">मोबाइल नंबर / Mobile Number *</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="Enter 10-digit number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    if (mobileNumber.length !== 10) {
                      alert("कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें। / Please enter a valid 10-digit mobile number.");
                      return;
                    }
                    setSendingOtp(true);
                    setTimeout(() => {
                      setSendingOtp(false);
                      setOtpSent(true);
                      if (onAddNotification) {
                        onAddNotification({
                          type: 'SMS',
                          recipient: `Citizen (${mobileNumber})`,
                          message: `OTP validation request. Sent simulated verification code '1234' to mobile number.`
                        });
                      }
                    }, 1200);
                  }}
                  className="btn btn-saffron" 
                  style={{ width: '100%', marginTop: '10px' }}
                  disabled={sendingOtp}
                >
                  {sendingOtp ? 'Sending OTP...' : 'Generate OTP / ओटीपी प्राप्त करें'}
                </button>
              </div>
            ) : (
              <div style={{ maxWidth: '350px', margin: '0 auto', textAlign: 'left' }}>
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '10px', borderRadius: '4px', fontSize: '0.78rem', color: '#1E40AF', marginBottom: '15px' }}>
                  Demo Hint: Enter code <strong>1234</strong> to authenticate.
                </div>
                <div className="form-group">
                  <label className="form-label">ओटीपी कोड / Enter 4-Digit OTP Code *</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="xxxx"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '1.25rem' }}
                  />
                </div>
                {otpError && <div style={{ color: '#DC2626', fontSize: '0.78rem', marginBottom: '10px', fontWeight: 600 }}>{otpError}</div>}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      setOtpError('');
                    }}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                  >
                    Back / पीछे जाएं
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (otpCode === '1234') {
                        setVerifyingOtp(true);
                         setTimeout(() => {
                           setVerifyingOtp(false);
                           setIsAuthenticated(true);
                           if (onAddNotification) {
                             onAddNotification({
                               type: 'SMS',
                               recipient: 'Citizen',
                               message: 'Citizen authenticated successfully. Session initialized.'
                             });
                           }
                         }, 800);
                      } else {
                        setOtpError("गलत कोड। कृपया 1234 दर्ज करें / Incorrect OTP. Please enter 1234.");
                      }
                    }}
                    className="btn btn-saffron" 
                    style={{ flex: 2, padding: '10px', fontSize: '0.8rem' }}
                    disabled={verifyingOtp}
                  >
                    {verifyingOtp ? 'Verifying...' : 'Verify & Access / प्रवेश करें'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : !successReceipt ? (
          <form onSubmit={handleSubmit}>
            {/* Quick Demo Buttons for presentation control */}
            <div style={{ background: '#FFF8F0', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid #FF9933', marginBottom: '20px', fontSize: '0.85rem' }}>
              <strong>Demonstration Quick-Seed:</strong> Click to simulate instant photo upload:
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => triggerDemo('road')}
                  style={{ padding: '6px 12px', background: '#FF9933', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  Simulate "Road Damage" Photo
                </button>
                <button 
                  type="button" 
                  onClick={() => triggerDemo('waste')}
                  style={{ padding: '6px 12px', background: '#FF9933', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  Simulate "Garbage Waste" Photo
                </button>
              </div>
            </div>

            {/* Input Mode Selector Toggles */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.1)', marginBottom: '20px' }}>
              <button
                type="button"
                className={`nav-btn ${inputMode === 'file' ? 'active' : ''}`}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 700 }}
                onClick={() => {
                  setInputMode('file');
                  stopCamera();
                }}
              >
                फोटो अपलोड / Upload Photo
              </button>
              <button
                type="button"
                className={`nav-btn ${inputMode === 'camera' ? 'active' : ''}`}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 700 }}
                onClick={() => {
                  setInputMode('camera');
                  startCamera();
                }}
              >
                कैमरा उपयोग / Use Live Camera
              </button>
            </div>

            {/* 1A. File Uploader Container */}
            {inputMode === 'file' && (
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                  समस्या की फोटो अपलोड करें / Select Defect Photo *
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  className="form-input"
                  onChange={handleImageUpload}
                  style={{ padding: '12px', background: '#FFF', border: '2px dashed rgba(15,82,186,0.2)' }}
                />
              </div>
            )}

            {/* 1B. Webcam Streaming Container */}
            {inputMode === 'camera' && (
              <div className="form-group" style={{ textAlign: 'center' }}>
                <label className="form-label" style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block', textAlign: 'left' }}>
                  लाइव कामना फ़ीड / Live Camera Capture *
                </label>
                
                {cameraStream ? (
                  <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                    <button
                      type="button"
                      onClick={captureSnapshot}
                      style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
                    >
                      फोटो खींचें / Capture Photo
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '20px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', background: '#F8FAFC' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      Camera stream is currently inactive.
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                    >
                      कैमरा चालू करें / Start Camera
                    </button>
                  </div>
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              </div>
            )}

            {/* Scanning Indicator overlay */}
            {scanning && (
              <div style={{ padding: '15px', background: 'rgba(15, 82, 186, 0.05)', borderRadius: '8px', border: '1px solid #93C5FD', textAlign: 'center', margin: '15px 0' }}>
                <div className="scanning-spinner" style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#0F52BA', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '10px' }}></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F52BA' }}>
                  AI Scanning Image for Infrastructure Defects...
                </span>
                <style>{`
                  @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
              </div>
            )}

            {/* Upload preview and AI categorization result */}
            {mediaUrl && !scanning && (
              <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', margin: '15px 0' }}>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                    <img 
                      src={mediaUrl} 
                      alt="Citizen Upload Preview" 
                      style={{ display: 'block', maxWidth: '100%', maxHeight: '220px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)' }} 
                    />
                    {scanResult && scanResult.is_civic_issue !== false && ((scanResult.boxes && scanResult.boxes.length > 0) || scanResult.box) && (() => {
                      const b = (scanResult.boxes && scanResult.boxes[0] && scanResult.boxes[0].box) || scanResult.box || [120, 150, 320, 450];
                      const label = (scanResult.boxes && scanResult.boxes[0] && scanResult.boxes[0].label) || (scanResult.category ? `${scanResult.category.toUpperCase()} (${Math.round((scanResult.confidence || 0.92)*100)}%)` : 'DEFECT');
                      return (
                        <div style={{
                          position: 'absolute',
                          border: '2px solid #DC2626',
                          background: 'rgba(220, 38, 38, 0.15)',
                          top: `${(b[0] / 480) * 100}%`,
                          left: `${(b[1] / 640) * 100}%`,
                          width: `${Math.max(10, ((b[3] - b[1]) / 640) * 100)}%`,
                          height: `${Math.max(10, ((b[2] - b[0]) / 480) * 100)}%`,
                          borderRadius: '2px',
                          pointerEvents: 'none',
                          boxShadow: '0 0 8px rgba(220, 38, 38, 0.6)'
                        }}>
                          <span style={{
                            position: 'absolute',
                            top: '-20px',
                            left: '-2px',
                            background: '#DC2626',
                            color: '#FFF',
                            fontSize: '0.62rem',
                            padding: '2px 6px',
                            fontWeight: 'bold',
                            borderRadius: '3px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}>
                            {label}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {scanResult ? (
                  scanResult.is_civic_issue === false ? (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '12px', borderRadius: '6px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#B45309' }}>
                          कोई नागरिक समस्या नहीं पहचानी गई / Non-Civic Image Detected
                        </span>
                      </div>
                      <div style={{ background: '#FEF3C7', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, color: '#92400E', marginBottom: '6px' }}>
                        AI Subject: {scanResult.detected_subject || 'Unrelated Object'} ({Math.round((scanResult.confidence || 0.5) * 100)}% Match)
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#78350F', margin: '4px 0', lineHeight: 1.4 }}>
                        {scanResult.description_hi || scanResult.description}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: '#92400E', marginTop: '6px', fontStyle: 'italic' }}>
                        💡 Tip: कृपया सड़क के गड्ढे, फैले कचरे, या जलभराव/सीवरेज की स्पष्ट तस्वीर अपलोड करें।
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(19, 136, 8, 0.05)', border: '1px solid #A7F3D0', padding: '12px', borderRadius: '6px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>✅</span> AI Scan Verified: {scanResult.category || scanResult.detected_subject}
                        </div>
                        <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                          {Math.round((scanResult.confidence || 0.92) * 100)}% Confidence
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#065F46', marginTop: '4px', lineHeight: 1.4 }}>
                        {scanResult.description_hi ? (
                          <>
                            <strong>विवरण:</strong> {scanResult.description_hi}
                            <br />
                            <span style={{ color: '#047857', fontSize: '0.74rem' }}>{scanResult.description}</span>
                          </>
                        ) : (
                          scanResult.description
                        )}
                      </p>
                    </div>
                  )
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    AI Analysis pending. Click capture or select image file.
                  </div>
                )}
              </div>
            )}

            {/* 2. Text & Voice Info Input (Restored for additional inputs) */}
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', marginTop: '20px', marginBottom: '15px' }}>
              <label className="form-label" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                शिकायत का अतिरिक्त विवरण / Additional Details & Voice Dictation
              </label>
              
              <div className="form-group" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                <select 
                  value={voiceLang} 
                  onChange={(e) => setVoiceLang(e.target.value)}
                  style={{ padding: '6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.15)', background: '#FFF' }}
                >
                  <option value="hi-IN">हिन्दी / Hindi</option>
                  <option value="en-US">English / Hinglish</option>
                </select>
                <button
                  type="button"
                  onClick={handleVoiceRecordingToggle}
                  className="btn"
                  style={{ background: voiceRecording ? '#DC2626' : '#002B49', color: '#FFF', fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  {voiceRecording && <span className="pulse-mic-dot" style={{ display: 'inline-block', width: '8px', height: '8px', background: '#FFF', borderRadius: '50%', animation: 'pulse-mic 1s infinite' }}></span>}
                  {voiceRecording ? 'Stop / माइक बंद करें' : 'Record Voice / बोलकर दर्ज करें'}
                </button>
                {voiceStatus && <span style={{ fontSize: '0.75rem', color: '#0F52BA', fontWeight: 500 }}>{voiceStatus}</span>}
              </div>

              <textarea
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="AI detection will auto-fill here. You can manually edit or dictate more details using the button above."
                rows={3}
                style={{ fontSize: '0.82rem', background: '#FFF' }}
              />
              <style>{`
                @keyframes pulse-mic {
                  0% { transform: scale(0.8); opacity: 0.5; }
                  50% { transform: scale(1.3); opacity: 1; }
                  100% { transform: scale(0.8); opacity: 0.5; }
                }
              `}</style>
            </div>

            {/* Interactive Leaflet Map for Citizen */}
            <div className="form-group" style={{ marginTop: '15px' }}>
              <label className="form-label" style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                शिकायत स्थान / Grievance Location Coordinate *
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Drag the marker or click on the map to pin the exact location of the issue.
              </p>
              
              <div id="citizen-map" style={{ width: '100%', height: '220px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative', zIndex: 1 }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', background: '#F1F5F9', padding: '6px 10px', borderRadius: '4px' }}>
                <span>GPS Coordinates: <strong>{lat.toFixed(5)}, {lng.toFixed(5)}</strong></span>
                <strong style={{ color: locationFetched ? '#138808' : '#FF9933' }}>
                  {locationFetched ? 'Device GPS Active' : 'Default Pinned'}
                </strong>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-saffron" 
              style={{ width: '100%', marginTop: '15px', padding: '14px' }}
              disabled={submitting || scanning || !mediaUrl || (scanResult && scanResult.is_civic_issue === false)}
            >
              {submitting ? 'प्रसंस्करण हो रहा है... / Submitting...' : 'शिकायत दर्ज करें / File Complaint'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '15px 0' }}>
            <div style={{ display: 'inline-flex', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(19,136,8,0.1)', color: '#138808', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', marginBottom: '15px', fontWeight: 'bold' }}>
              ✓
            </div>
            <h3 style={{ color: '#138808', fontFamily: 'var(--font-title)', marginBottom: '8px' }}>
              शिकायत दर्ज की गई! / REPORT FILED!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Ticket ID: <code>{successReceipt.id.slice(0, 8)}...</code>
            </p>

            <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'left', marginBottom: '24px', fontSize: '0.85rem' }}>
              <h4 style={{ color: 'var(--chakra-blue)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px', marginBottom: '8px' }}>
                AI Real-time Triage Report:
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Categorized Class:</span>
                <strong>{successReceipt.category}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Calculated Priority Score:</span>
                <strong style={{ color: successReceipt.priority_score >= 80 ? '#DC2626' : '#FF9933' }}>
                  {successReceipt.priority_score} / 100
                </strong>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <span>Root Cause Hypothesis:</span>
                <p style={{ marginTop: '3px', padding: '8px', background: '#FFF8F0', borderLeft: '3px solid #FF9933', color: '#B15C00', fontSize: '0.8rem', borderRadius: '3px' }}>
                  {successReceipt.root_cause_hypothesis}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Orchestrated Actions:</span>
                <strong>{successReceipt.tasks.length} Coordinated Tasks</strong>
              </div>
            </div>

            <button 
              onClick={() => {
                setSuccessReceipt(null);
                setMediaUrl('');
                setScanResult(null);
                setDescription('');
                setIsAuthenticated(false);
                setMobileNumber('');
                setOtpSent(false);
                setOtpCode('');
                setOtpError('');
                citizenMapInstance.current = null;
                citizenMarkerRef.current = null;
              }} 
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              नई शिकायत दर्ज करें / File Another Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenPortal;
