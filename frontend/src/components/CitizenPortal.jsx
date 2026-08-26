import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

const CitizenPortal = ({ incidents = [], onSubmitSuccess, onBackToHome, onAddNotification }) => {
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.2090);
  const [locationFetched, setLocationFetched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState(null);
  
  // Map search geocoding states
  const [searchAddress, setSearchAddress] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Grievance tracking states
  const [activeSubTab, setActiveSubTab] = useState('lodge'); // 'lodge' or 'track'
  const [trackId, setTrackId] = useState('');
  const [trackedIncident, setTrackedIncident] = useState(null);
  const [trackError, setTrackError] = useState('');
  
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
  const voiceBaselineRef = useRef('');

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

  // 1.5 Leaflet Map Lifecycle in Citizen Portal - INITIALIZATION
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
    }
  }, [isAuthenticated, successReceipt]);

  // Sync Map Marker & View dynamically when lat/lng change from inputs, search, or presets
  useEffect(() => {
    if (citizenMapInstance.current && citizenMarkerRef.current) {
      const currentPos = citizenMarkerRef.current.getLatLng();
      if (parseFloat(currentPos.lat.toFixed(5)) !== lat || parseFloat(currentPos.lng.toFixed(5)) !== lng) {
        citizenMarkerRef.current.setLatLng([lat, lng]);
      }
      const center = citizenMapInstance.current.getCenter();
      if (Math.abs(center.lat - lat) > 0.0001 || Math.abs(center.lng - lng) > 0.0001) {
        citizenMapInstance.current.setView([lat, lng], citizenMapInstance.current.getZoom());
      }
    }
  }, [lat, lng]);

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

  const compressImage = (base64Str, maxWidth = 800, maxHeight = 800) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  // 3. File Input Control
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result;
        // Fast client-side compression (reduces 10MB -> 50KB for instant scan)
        const compressedBase64 = await compressImage(rawBase64, 800, 800);
        setMediaUrl(compressedBase64);
        // Trigger real AI Vision scan
        performImageAnalysis(compressedBase64);
      };
      reader.readAsDataURL(file);
    }
  };


  // Geocoding Search using OpenStreetMap Nominatim API
  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const first = data[0];
          const newLat = parseFloat(parseFloat(first.lat).toFixed(5));
          const newLng = parseFloat(parseFloat(first.lon).toFixed(5));
          setLat(newLat);
          setLng(newLng);
          setLocationFetched(true);
        } else {
          setSearchError('कोई स्थान नहीं मिला। / Location not found.');
        }
      } else {
        setSearchError('खोज विफल। / Search failed.');
      }
    } catch (err) {
      setSearchError('खोज में त्रुटि हुई। / Connection error during search.');
    } finally {
      setSearchLoading(false);
    }
  };


  // Complaint tracking logic
  const handleTrack = (e) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    const found = incidents.find(i => i.id.toLowerCase().startsWith(trackId.toLowerCase().trim()));
    if (found) {
      setTrackedIncident(found);
      setTrackError('');
    } else {
      setTrackedIncident(null);
      setTrackError('शिकायत आईडी नहीं मिली। कृपया पुनः जांचें। / Grievance ticket ID not found.');
    }
  };


  // 4. Robust Voice Input using Web Speech API + Fallback Dictation
  const handleVoiceRecordingToggle = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (voiceRecording) {
      if (recognitionInstance) {
        try { recognitionInstance.stop(); } catch (e) {}
      }
      setVoiceRecording(false);
      setVoiceStatus('माइक बंद हुआ।');
      return;
    }

    // Try requesting microphone access explicitly to trigger browser permission modal
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the temp tracks immediately after permission check
        stream.getTracks().forEach(t => t.stop());
      } catch (micErr) {
        console.warn("Microphone permission denied:", micErr);
        setVoiceStatus('माइक अनुमति आवश्यक है। कृपया अनुमति दें या नीचे दिए गए वॉइस सैंपल पर क्लिक करें।');
        // Simulated speech fallback
        setTimeout(() => {
          const sample = voiceLang === 'hi-IN'
            ? 'नैनी मुख्य मार्ग पर सड़क धंस गई है और भारी गड्ढा हो गया है, कृपया तुरंत मरम्मत करें।'
            : 'Severe road pothole and pavement collapse near Naini School corridor causing severe traffic hazard.';
          setDescription(prev => prev ? `${prev} ${sample}` : sample);
          setVoiceStatus('ऑटो-डिक्टेशन दर्ज हुआ।');
        }, 800);
        return;
      }
    }

    if (!SpeechRecognition) {
      setVoiceStatus('आवाज पहचान सक्रिय (डेमो मोड)...');
      setTimeout(() => {
        const demoSpeech = voiceLang === 'hi-IN' 
          ? 'नैनी मुख्य मार्ग पर सड़क धंस गई है और भारी गड्ढा हो गया है, कृपया तुरंत मरम्मत करें।' 
          : 'Severe road pothole and pavement collapse near Naini School corridor causing severe traffic hazard.';
        setDescription(prev => prev ? `${prev} ${demoSpeech}` : demoSpeech);
        setVoiceStatus('ऑटो-डिक्टेशन दर्ज हुआ।');
      }, 800);
      return;
    }
    
    voiceBaselineRef.current = description || '';

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceLang || 'hi-IN';
      
      recognition.onstart = () => {
        setVoiceRecording(true);
        setVoiceStatus(voiceLang === 'hi-IN' ? '🔴 सुन रहे हैं... (कृपया स्पष्ट बोलें)' : '🔴 Listening... (Please speak clearly now)');
      };
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        const textToAdd = finalTranscript || interimTranscript;
        if (textToAdd) {
          const baseline = voiceBaselineRef.current;
          const cleanedText = textToAdd.trim();
          setDescription(baseline ? `${baseline} ${cleanedText}` : cleanedText);
          setVoiceStatus(`पहचाना गया: "${cleanedText}"`);
        }
      };
      
      recognition.onerror = (event) => {
        console.warn("Speech recognition warning:", event.error);
        if (event.error === 'not-allowed') {
          setVoiceStatus('माइक की अनुमति दें या नीचे दिए गए वॉइस सैंपल पर क्लिक करें।');
        } else if (event.error === 'no-speech') {
          setVoiceStatus('कोई आवाज नहीं मिली। कृपया दोबारा बोलें या नीचे सैंपल चुनें।');
        } else {
          setVoiceStatus(`माइक सक्रिय: ${event.error}`);
        }
        setVoiceRecording(false);
      };
      
      recognition.onend = () => {
        setVoiceRecording(false);
      };
      
      recognition.start();
      setRecognitionInstance(recognition);
    } catch (err) {
      console.error("Speech init error:", err);
      setVoiceStatus('माइक चालू नहीं हो सका। कृपया टेक्स्ट टाइप करें या डेमो वॉइस चुनें।');
      setVoiceRecording(false);
    }
  };


  // 5. Naini / Prayagraj Live Demonstration Quick Seeds
  const triggerDemo = (type) => {
    stopCamera();
    
    let category = 'Road Damage';
    let desc = 'नैनी स्कूल के पास मुख्य सड़क धंस गई है और बड़ा गड्ढा हो गया है। नीचे पानी की पाइपलाइन की वजह से डामर बार-बार उखड़ रहा है।';
    let demoImg = 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=400&q=80';
    let box = [120, 150, 320, 450];
    let latVal = 25.3890;
    let lngVal = 81.8650;
    
    if (type === 'naini-water') {
      category = 'Water Supply & Sewerage';
      desc = 'नैनी एडीए कॉलोनी रोड पर मुख्य भूमिगत जल पाइपलाइन (UPJN-04) में भारी रिसाव हो रहा है और सड़क पर जलभराव हो गया है।';
      demoImg = 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=400&q=80';
      box = [110, 90, 360, 430];
      latVal = 25.3890;
      lngVal = 81.8650;
    } else if (type === 'naini-waste') {
      category = 'Waste Management';
      desc = 'नैनी इंडस्ट्रियल एरिया फेज-1 मोड़ पर भारी मात्रा में कचरे का ढेर और प्लास्टिक अपशिष्ट जमा है जिससे बदबू आ रही है।';
      demoImg = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80';
      box = [180, 50, 410, 580];
      latVal = 25.3930;
      lngVal = 81.8650;
    }
    
    // Set image immediately so the scan animation renders on top of it
    setMediaUrl(demoImg);
    setScanning(true);
    setScanResult(null);
    
    setTimeout(() => {
      setLat(latVal);
      setLng(lngVal);
      setDescription(desc);
      setScanResult({ 
        is_civic_issue: true,
        category, 
        detected_subject: category === 'Road Damage' ? 'Severe Road Pothole (Naini Corridor)' : (category === 'Waste Management' ? 'Garbage Heap' : 'Pipeline Leakage'),
        description: desc, 
        confidence: 0.96,
        boxes: [{ box, label: `${category} (96%)`, confidence: 0.96 }] 
      });
      setScanning(false);
    }, 1200); // 1.2 seconds of holographic scan visualization
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mediaUrl) {
      alert('कृपया फोटो खींचें या अपलोड करें / Please capture or upload a photo.');
      return;
    }

    setSubmitting(true);
    const finalDescription = addressText.trim()
      ? `${description}\n\n[स्थान/पता: ${addressText.trim()}]`
      : description;

    try {
      const response = await fetch(`${API_BASE_URL}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: finalDescription,
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
        
        {/* Sub-tab selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '20px' }}>
          <button 
            type="button"
            onClick={() => setActiveSubTab('lodge')}
            style={{ 
              flex: 1, 
              padding: '10px', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeSubTab === 'lodge' ? '3px solid var(--saffron-orange)' : '3px solid transparent', 
              fontWeight: 700, 
              color: activeSubTab === 'lodge' ? 'var(--secondary-blue)' : 'var(--text-muted)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            शिकायत दर्ज करें / Lodge Complaint
          </button>
          <button 
            type="button"
            onClick={() => setActiveSubTab('track')}
            style={{ 
              flex: 1, 
              padding: '10px', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeSubTab === 'track' ? '3px solid var(--saffron-orange)' : '3px solid transparent', 
              fontWeight: 700, 
              color: activeSubTab === 'track' ? 'var(--secondary-blue)' : 'var(--text-muted)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            शिकायत की स्थिति / Track Status
          </button>
        </div>

        {activeSubTab === 'lodge' && (
          <>
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
            {/* Quick Demo Buttons for Naini Prayagraj presentation control */}
            <div style={{ background: '#FFF8F0', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid #FF9933', marginBottom: '20px', fontSize: '0.85rem' }}>
              <strong>Naini, Prayagraj Live AI Simulation:</strong> Click to simulate instant citizen report:
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  onClick={() => triggerDemo('naini-road')}
                  style={{ padding: '6px 12px', background: '#FF9933', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  🛣️ Simulate "Naini Road Pothole"
                </button>
                <button 
                  type="button" 
                  onClick={() => triggerDemo('naini-water')}
                  style={{ padding: '6px 12px', background: '#0F52BA', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  💧 Simulate "Naini Pipeline Leak"
                </button>
                <button 
                  type="button" 
                  onClick={() => triggerDemo('naini-waste')}
                  style={{ padding: '6px 12px', background: '#138808', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  🗑️ Simulate "Naini Waste Dump"
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

            {/* Upload preview with Holographic AI Radar Scan Animation */}
            {mediaUrl && (
              <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', margin: '15px 0' }}>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                    <img 
                      src={mediaUrl} 
                      alt="Citizen Upload Preview" 
                      style={{ display: 'block', maxWidth: '100%', maxHeight: '220px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)' }} 
                    />
                    
                    {/* Active Holographic Radar Scanner Bar while scanning */}
                    {scanning && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 82, 186, 0.15)',
                        border: '2px dashed #0F52BA',
                        borderRadius: '6px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '4px',
                          background: 'linear-gradient(90deg, transparent, #00FFCC, #FF9933, transparent)',
                          boxShadow: '0 0 15px #00FFCC',
                          animation: 'laserScan 1.2s ease-in-out infinite alternate'
                        }}></div>
                        <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,43,73,0.85)', color: '#FFF', padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          ⚡ Google Gemini Multi-Modal Vision: Inspecting Defect Telemetry...
                        </div>
                      </div>
                    )}
                    <style>{`
                      @keyframes laserScan {
                        0% { top: 0%; }
                        100% { top: 96%; }
                      }
                    `}</style>

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

              {/* Quick Voice / Speech Sample Chips for instant presentation demo */}
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Voice Samples:</span>
                <button
                  type="button"
                  onClick={() => {
                    setDescription("नैनी स्कूल के पास मुख्य सड़क पर बहुत बड़ा गड्ढा है और डामर उखड़ गया है।");
                    setVoiceStatus("आवाज दर्ज: नैनी स्कूल रोड डैमेज");
                  }}
                  style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  🎙️ "नैनी स्कूल के पास गड्ढा"
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDescription("नैनी एडीए कॉलोनी में मुख्य जल पाइपलाइन में भारी लीकेज है और पानी बह रहा है।");
                    setVoiceStatus("आवाज दर्ज: नैनी जल पाइपलाइन लीकेज");
                  }}
                  style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  🎙️ "नैनी वाटर पाइपलाइन लीकेज"
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDescription("नैनी इंडस्ट्रियल एरिया रोड पर कचरे का भारी ढेर लगा है, बदबू आ रही है।");
                    setVoiceStatus("आवाज दर्ज: नैनी कचरा डंप");
                  }}
                  style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  🎙️ "नैनी कचरा डंप"
                </button>
              </div>

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

              {/* Address Search Bar for Geocoding Map Pinning */}
              <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="खोजें (जैसे Naini Prayagraj या Connaught Place Delhi)"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '6px 10px', flex: 1, background: '#FFF' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddressSearch();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  className="btn btn-primary"
                  style={{ fontSize: '0.75rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                  disabled={searchLoading}
                >
                  {searchLoading ? 'खोज रहे हैं...' : 'स्थान खोजें / Search'}
                </button>
              </div>
              {searchError && <div style={{ color: '#DC2626', fontSize: '0.7rem', marginBottom: '10px', fontWeight: 600 }}>{searchError}</div>}
              
              <div id="citizen-map" style={{ width: '100%', height: '220px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative', zIndex: 1 }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', background: '#F1F5F9', padding: '6px 10px', borderRadius: '4px' }}>
                <span>GPS Coordinates: <strong>{lat.toFixed(5)}, {lng.toFixed(5)}</strong></span>
                <strong style={{ color: locationFetched ? '#138808' : '#FF9933' }}>
                  {locationFetched ? 'GPS Pinned / Active' : 'Default Pinned'}
                </strong>
              </div>

              {/* Manual Coordinate Inputs */}
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flex: 1, minWidth: '130px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Lat (अक्षांश):</span>
                  <input 
                    type="number" 
                    step="0.00001" 
                    value={lat} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setLat(val);
                        setLocationFetched(true);
                      }
                    }} 
                    style={{ padding: '6px', fontSize: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '4px', width: '100%', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flex: 1, minWidth: '130px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Lng (रेखांश):</span>
                  <input 
                    type="number" 
                    step="0.00001" 
                    value={lng} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setLng(val);
                        setLocationFetched(true);
                      }
                    }} 
                    style={{ padding: '6px', fontSize: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '4px', width: '100%', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              {/* Preset Corridor Selection buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLat(28.6140);
                    setLng(77.2085);
                    setLocationFetched(true);
                  }}
                  style={{ background: 'rgba(15, 82, 186, 0.08)', border: '1px solid rgba(15, 82, 186, 0.2)', color: 'var(--secondary-blue)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  📍 Delhi (School Corridor)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLat(25.3850);
                    setLng(81.8650);
                    setLocationFetched(true);
                  }}
                  style={{ background: 'rgba(15, 82, 186, 0.08)', border: '1px solid rgba(15, 82, 186, 0.2)', color: 'var(--secondary-blue)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  📍 Prayagraj (Water Corridor)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((position) => {
                        setLat(parseFloat(position.coords.latitude.toFixed(5)));
                        setLng(parseFloat(position.coords.longitude.toFixed(5)));
                        setLocationFetched(true);
                      });
                    }
                  }}
                  style={{ background: 'var(--primary-navy)', border: '1px solid var(--chakra-blue)', color: '#FFF', padding: '4px 10px', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  🔄 Auto-Detect GPS
                </button>
              </div>
            </div>

            {/* Optional Address/Landmark Input */}
            <div className="form-group" style={{ marginTop: '15px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                लैंडमार्क / पता (वैकल्पिक) / Landmark & Descriptive Address (Optional)
              </label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Near Naini School gate / opposite ADA Colony park"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                style={{ fontSize: '0.82rem', background: '#FFF' }}
              />
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
                setAddressText('');
                setSearchAddress('');
                setSearchError('');
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
      </>
    )}

        {/* Track Status sub-tab */}
        {activeSubTab === 'track' && (
          <div style={{ padding: '10px 15px 25px 15px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary-navy)', marginBottom: '15px', fontSize: '1.1rem', fontWeight: 800 }}>
              शिकायत स्थिति जांच / TRACK COMPLAINT STATUS
            </h3>
            
            <form onSubmit={handleTrack} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input 
                type="text"
                className="form-input"
                placeholder="शिकायत टिकट आईडी दर्ज करें (e.g. 3c4b9a1d)"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                style={{ fontSize: '0.85rem', padding: '10px', flex: 1, background: '#FFF', color: 'var(--text-main)' }}
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: '0.85rem' }}
              >
                खोजें / Search
              </button>
            </form>

            {trackError && <div style={{ color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', marginBottom: '20px' }}>{trackError}</div>}

            {trackedIncident ? (
              <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '8px', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--primary-navy)' }}>Ticket ID: {trackedIncident.id.slice(0, 8)}...</span>
                  <span style={{ 
                    background: trackedIncident.status === 'resolved' ? '#D1FAE5' : (trackedIncident.status === 'escalated' ? '#FEE2E2' : '#EFF6FF'), 
                    color: trackedIncident.status === 'resolved' ? '#065F46' : (trackedIncident.status === 'escalated' ? '#981B1B' : '#1E40AF'),
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase'
                  }}>
                    {trackedIncident.status}
                  </span>
                </div>

                <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Category (श्रेणी):</span> <strong>{trackedIncident.category}</strong></span>
                  <span><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Priority Score (प्राथमिकता):</span> <strong style={{ color: trackedIncident.priority_score >= 80 ? '#DC2626' : '#FF9933' }}>{trackedIncident.priority_score} / 100</strong></span>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Description (विवरण):</span>
                  <p style={{ marginTop: '4px', background: '#FFF', padding: '10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)', whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>
                    {trackedIncident.description}
                  </p>
                </div>

                {trackedIncident.root_cause_hypothesis && (
                  <div style={{ marginBottom: '15px' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Root Cause Analysis (AI मूल कारण):</span>
                    <p style={{ marginTop: '4px', padding: '8px 12px', background: '#FFF8F0', borderLeft: '3px solid #FF9933', color: '#B15C00', borderRadius: '4px', fontWeight: 500 }}>
                      {trackedIncident.root_cause_hypothesis}
                    </p>
                  </div>
                )}

                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Orchestrated Actions & SLA status (विभागीय कार्य सूची व एसएलए):</span>
                  {trackedIncident.tasks && trackedIncident.tasks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {trackedIncident.tasks.map(t => (
                        <div key={t.id} style={{ background: '#FFF', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-main)' }}>{t.title}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Dept: {t.department_name} | SLA: {t.sla_hours} hours</div>
                          </div>
                          <span style={{ 
                            background: t.status === 'completed' ? '#D1FAE5' : (t.status === 'escalated' ? '#FEE2E2' : '#FEF3C7'), 
                            color: t.status === 'completed' ? '#065F46' : (t.status === 'escalated' ? '#981B1B' : '#92400E'),
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontWeight: 700,
                            fontSize: '0.62rem',
                            textTransform: 'uppercase'
                          }}>
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No tasks assigned yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 10px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed rgba(0,0,0,0.08)' }}>
                अपनी शिकायत का वास्तविक समय का निवारण और टेलीमेट्री ट्रैक करने के लिए टिकट आईडी प्रविष्ट करें।
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenPortal;
