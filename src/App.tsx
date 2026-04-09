import React, { useState, useEffect } from "react";
import { 
  Globe, 
  MapPin, 
  User, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Info,
  ChevronRight,
  Menu,
  Phone,
  Mail,
  Lock,
  RefreshCw,
  Shield,
  CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useWafid } from "./hooks/useWafid";
import { Chatbot } from "./components/Chatbot";

// Types
type Step = "details" | "candidate" | "review" | "success";

interface BookingData {
  country: string;
  city: string;
  travellingCountry: string;
  type: "standard" | "premium";
  centerId: string;
  premiumCenterId: string;
  firstName: string;
  lastName: string;
  passportNumber: string;
  confirmPassportNumber: string;
  passportIssueDate: string;
  passportIssuePlace: string;
  passportExpiryDate: string;
  gender: "male" | "female";
  maritalStatus: "single" | "married";
  dob: string;
  nationality: string;
  position: string;
  positionOther: string;
  visaType: string;
  nationalId: string;
  email: string;
  phone: string;
  otpCode: string;
  captcha: string;
  recaptchaResponse: string;
}

const steps = [
  { id: "details", title: "Appointment Details", icon: Globe },
  { id: "candidate", title: "Candidate Info", icon: User },
  { id: "review", title: "Review", icon: CheckCircle2 },
];

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [data, setData] = useState<BookingData>({
    country: "",
    city: "",
    travellingCountry: "",
    type: "standard",
    centerId: "",
    premiumCenterId: "",
    firstName: "",
    lastName: "",
    passportNumber: "",
    confirmPassportNumber: "",
    passportIssueDate: "",
    passportIssuePlace: "",
    passportExpiryDate: "",
    gender: "male",
    maritalStatus: "single",
    dob: "",
    nationality: "",
    position: "",
    positionOther: "",
    visaType: "wv",
    nationalId: "",
    email: "",
    phone: "",
    otpCode: "",
    captcha: "",
    recaptchaResponse: "",
  });

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [appointmentRef, setAppointmentRef] = useState<string>("Pending...");
  const [isRefreshingCaptcha, setIsRefreshingCaptcha] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaUrl, setCaptchaUrl] = useState(`/api-proxy/captcha/image?v=${Date.now()}`);

  const refreshCaptcha = () => {
    setIsRefreshingCaptcha(true);
    setCaptchaError(null);
    setCaptchaUrl(`/api-proxy/captcha/image?v=${Date.now()}`);
  };

  const {
    countries,
    travellingCountries,
    nationalities,
    cities,
    centers,
    loading,
    fetchingData,
    error,
    liveStatus,
    setError,
    submitBooking,
  } = useWafid({
    country: data.country,
    travellingTo: data.travellingCountry,
    city: data.city
  });

  // Calculate age from DOB
  const calculateAge = (dobString: string) => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(data.dob);

  // Visa options based on destination and age
  const getVisaOptions = () => {
    const isMinor = age < 18 && data.dob !== "";
    
    if (isMinor) {
      return [{ value: "fv", label: "Family Visa" }];
    }

    const options = [
      { value: "wv", label: "Work Visa" },
      { value: "fv", label: "Family Visa" },
    ];

    if (data.travellingCountry === "KW") {
      options.push({ value: "sv", label: "Study Visa" });
    }

    return options;
  };

  const visaOptions = getVisaOptions();

  // Positions list
  const positions = [
    "Technician",
    "Engineer",
    "Doctor",
    "Nurse",
    "Driver",
    "Laborer",
    "Salesman",
    "Accountant",
    "Manager",
    "Other"
  ];

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleBookingSubmission = async () => {
    const result = await submitBooking(data);
    if (result.success) {
      // Send notification
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            name: `${data.firstName} ${data.lastName}`,
            appointmentId: result.appointmentId,
            bookingDetails: {
              travellingCountry: getTravellingCountryName(data.travellingCountry),
              centerName: getCenterName(data.centerId),
              cityName: getCityName(data.city)
            }
          })
        });
      } catch (err) {
        console.error("Failed to send notification:", err);
      }
      
      if (result.appointmentId) {
        setAppointmentRef(result.appointmentId);
      }
      
      if (result.redirectUrl) {
        console.log("Payment URL received:", result.redirectUrl);
        // If it's a relative URL, prepend the Wafid base
        const fullUrl = result.redirectUrl.startsWith('http') 
          ? result.redirectUrl 
          : `https://wafid.com${result.redirectUrl}`;
        
        setPaymentUrl(fullUrl);
      }
      
      setCurrentStep("success");
    } else {
      // Refresh captcha on failure
      refreshCaptcha();
    }
  };

  const nextStep = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    
    // Basic validation
    if (currentStep === "details") {
      if (!data.country || !data.city || !data.travellingCountry || !data.centerId) {
        setError({ message: "Please select all required fields including the medical center.", type: "validation" });
        return;
      }
    } else if (currentStep === "candidate") {
      if (!data.firstName || !data.lastName || !data.passportNumber || !data.confirmPassportNumber || !data.email || !data.phone || !data.passportIssueDate || !data.passportExpiryDate || !data.passportIssuePlace) {
        setError({ message: "Please fill in all mandatory candidate and passport details.", type: "validation" });
        return;
      }
      if (data.passportNumber !== data.confirmPassportNumber) {
        setError({ message: "Passport numbers do not match.", type: "validation" });
        return;
      }
    }

    setError(null);
    if (currentStep === "review") {
      handleBookingSubmission();
    } else if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id as Step);
    }
  };

  const prevStep = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    setError(null);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id as Step);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setError(null);
    setData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Reset dependent fields
      if (name === "country" || name === "travellingCountry") {
        newData.city = "";
        newData.centerId = "";
      } else if (name === "city") {
        newData.centerId = "";
      }
      
      return newData;
    });
  };

  const getCountryName = (code: string) => {
    const country = countries.find(c => c.code === code);
    return country ? country.name : code;
  };

  const getTravellingCountryName = (code: string) => {
    const country = travellingCountries.find(c => c.code === code);
    return country ? country.name : code;
  };

  const getCityName = (id: string) => {
    const city = cities.find(c => c.id === id);
    return city ? city.name : id;
  };

  const getCenterName = (id: string) => {
    const center = centers.find(c => c.id === id);
    return center ? center.name : id;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden border border-slate-100">
              <img 
                src="https://wafid.com/static/images/logo.png" 
                alt="Wafid Logo" 
                className="w-10 h-10 object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://picsum.photos/seed/wafid/100/100";
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-black text-blue-900 leading-none tracking-tight">WAFID</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  liveStatus === 'online' ? 'bg-green-500 animate-pulse' : 
                  liveStatus === 'offline' ? 'bg-red-500' : 'bg-slate-300'
                }`}></div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${
                  liveStatus === 'online' ? 'text-green-600' : 
                  liveStatus === 'offline' ? 'text-red-600' : 'text-slate-400'
                }`}>
                  {liveStatus === 'online' ? 'Live System Active' : 
                   liveStatus === 'offline' ? 'System Offline' : 'Checking Connection...'}
                </p>
              </div>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#" className="text-blue-600 border-b-2 border-blue-600 pb-1">Book Appointment</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Appointment Slips</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Medical Results</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Guidelines</a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600">
              <Globe className="w-4 h-4" />
              English
            </button>
            <button className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              Login
            </button>
            <button className="md:hidden p-2 text-slate-600">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Progress Stepper */}
        {currentStep !== "success" && (
          <div className="mb-12">
            <div className="flex items-center justify-between relative">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = steps.findIndex(s => s.id === currentStep) >= index;
                const isCurrent = currentStep === step.id;
                
                return (
                  <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-400 border-2 border-slate-200"
                      } ${isCurrent ? "ring-4 ring-blue-100" : ""}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`mt-3 text-[11px] font-bold uppercase tracking-wider text-center hidden sm:block ${
                      isActive ? "text-blue-600" : "text-slate-400"
                    }`}>
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <div className="absolute top-6 left-[50%] w-full h-[2px] -z-10 bg-slate-200">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-500" 
                          style={{ width: steps.findIndex(s => s.id === currentStep) > index ? "100%" : "0%" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="p-8 md:p-12"
            >
              {currentStep === "details" && (
                <div className="space-y-10">
                  <div className="relative -mx-8 -mt-12 mb-12 p-12 bg-gradient-to-br from-[#004a99] to-[#003366] text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/30 border border-blue-400/30 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                        <ShieldCheck className="w-3 h-3" />
                        Official Wafid Proxy
                      </div>
                      <h2 className="text-4xl font-black tracking-tight mb-2">Book Appointment</h2>
                      <p className="text-blue-100 opacity-80">Follow the steps below to schedule your medical examination.</p>
                    </div>
                  </div>

                  <div className="max-w-2xl mx-auto space-y-8">
                    {/* 1. Country */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        <Globe className="w-4 h-4 text-blue-600" />
                        1. Select Country
                      </label>
                      <select 
                        name="country"
                        value={data.country}
                        onChange={handleInputChange}
                        className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-semibold text-slate-800"
                      >
                        <option value="">-- Choose Country --</option>
                        {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* 2. Travelling Country */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        <Globe className="w-4 h-4 text-blue-600" />
                        2. Travelling To
                      </label>
                      <select 
                        name="travellingCountry"
                        value={data.travellingCountry}
                        onChange={handleInputChange}
                        className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-semibold text-slate-800"
                      >
                        <option value="">-- Choose Destination --</option>
                        {travellingCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* 3. City */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        3. Select City
                      </label>
                      <div className="relative">
                        <select 
                          name="city"
                          value={data.city}
                          onChange={handleInputChange}
                          disabled={!data.country || !data.travellingCountry || fetchingData}
                          className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-semibold text-slate-800 disabled:bg-slate-50 disabled:opacity-60 appearance-none"
                        >
                          <option value="">
                            {fetchingData ? "Loading Cities..." : 
                             (!data.country || !data.travellingCountry) ? "Select Country & Destination First" : 
                             "-- Choose City --"}
                          </option>
                          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {fetchingData && (
                          <div className="absolute right-12 top-1/2 -translate-y-1/2">
                            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. Appointment Type */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        4. Appointment Type
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setData(prev => ({ ...prev, type: "standard" }))}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            data.type === "standard" ? "border-blue-600 bg-blue-50" : "border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <p className="font-bold text-sm">Standard</p>
                          <p className="text-[10px] text-slate-500">Regular Booking</p>
                        </button>
                        <button 
                          onClick={() => setData(prev => ({ ...prev, type: "premium" }))}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            data.type === "premium" ? "border-blue-600 bg-blue-50" : "border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <p className="font-bold text-sm">Premium</p>
                          <p className="text-[10px] text-slate-500">Fast Track Service</p>
                        </button>
                      </div>
                    </div>

                    {/* 5. Medical Center */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        5. Medical Center
                      </label>
                      <div className="relative">
                        <select 
                          name={data.type === "premium" ? "premiumCenterId" : "centerId"}
                          value={data.type === "premium" ? data.premiumCenterId : data.centerId}
                          onChange={handleInputChange}
                          disabled={!data.city || fetchingData}
                          className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-semibold text-slate-800 disabled:bg-slate-50 disabled:opacity-60 appearance-none"
                        >
                          <option value="">
                            {fetchingData ? "Loading Centers..." : 
                             !data.city ? "Select City First" : 
                             "-- Choose Medical Center --"}
                          </option>
                          {centers.map(center => (
                            <option key={center.id} value={center.id}>{center.name}</option>
                          ))}
                        </select>
                        {fetchingData && (
                          <div className="absolute right-12 top-1/2 -translate-y-1/2">
                            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                          </div>
                        )}
                      </div>
                      {(data.centerId || data.premiumCenterId) && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <p className="text-xs font-bold text-blue-800 uppercase mb-1">Selected Center Info</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {centers.find(c => c.id === (data.type === "premium" ? data.premiumCenterId : data.centerId))?.name}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {centers.find(c => c.id === (data.type === "premium" ? data.premiumCenterId : data.centerId))?.address}
                          </p>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              (centers.find(c => c.id === (data.type === "premium" ? data.premiumCenterId : data.centerId))?.name || "") + 
                              " " + 
                              getCityName(data.city)
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-2 hover:underline"
                          >
                            <MapPin className="w-3 h-3" />
                            View on Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === "candidate" && (
                <div className="space-y-8">
                  <div className="border-b border-slate-100 pb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Candidate Information</h2>
                    <p className="text-slate-500 mt-1">Enter the details exactly as they appear on your passport.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                      <input 
                        type="text" 
                        name="firstName"
                        value={data.firstName}
                        onChange={handleInputChange}
                        placeholder="e.g. John"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                      <input 
                        type="text" 
                        name="lastName"
                        value={data.lastName}
                        onChange={handleInputChange}
                        placeholder="e.g. Doe"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Passport Number</label>
                      <input 
                        type="text" 
                        name="passportNumber"
                        value={data.passportNumber}
                        onChange={handleInputChange}
                        placeholder="e.g. A1234567"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Passport Number</label>
                      <input 
                        type="text" 
                        name="confirmPassportNumber"
                        value={data.confirmPassportNumber}
                        onChange={handleInputChange}
                        placeholder="Re-enter Passport Number"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Passport Issue Date</label>
                      <input 
                        type="date" 
                        name="passportIssueDate"
                        value={data.passportIssueDate}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Passport Expiry Date</label>
                      <input 
                        type="date" 
                        name="passportExpiryDate"
                        value={data.passportExpiryDate}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Passport Issue Place</label>
                      <input 
                        type="text" 
                        name="passportIssuePlace"
                        value={data.passportIssuePlace}
                        onChange={handleInputChange}
                        placeholder="e.g. Dhaka"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                      <input 
                        type="date" 
                        name="dob"
                        value={data.dob}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</label>
                      <select 
                        name="gender"
                        value={data.gender}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marital Status</label>
                      <select 
                        name="maritalStatus"
                        value={data.maritalStatus}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nationality</label>
                      <select 
                        name="nationality"
                        value={data.nationality}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="">Select Nationality</option>
                        {nationalities.map(n => (
                          <option key={n.id} value={n.id}>{n.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Position Applied For</label>
                      <select 
                        name="position"
                        value={data.position}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="">Select Position</option>
                        {positions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    {data.position === "Other" && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Specify Other Position</label>
                        <input 
                          type="text" 
                          name="positionOther"
                          value={data.positionOther}
                          onChange={handleInputChange}
                          placeholder="Enter your position"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        National ID / Iqama
                        {data.visaType === "fv" && <span className="ml-2 text-[10px] text-slate-400 font-normal">(Optional)</span>}
                      </label>
                      <input 
                        type="text" 
                        name="nationalId"
                        value={data.nationalId}
                        onChange={handleInputChange}
                        placeholder="Enter National ID"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visa Type</label>
                      <select 
                        name="visaType"
                        value={data.visaType}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="">Select Visa Type</option>
                        {visaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email" 
                        name="email"
                        value={data.email}
                        onChange={handleInputChange}
                        placeholder="john.doe@example.com"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                      <input 
                        type="tel" 
                        name="phone"
                        value={data.phone}
                        onChange={handleInputChange}
                        placeholder="e.g. +880123456789"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Security Verification</h3>
                      <div className="grid md:grid-cols-2 gap-6 items-end">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Shield className="w-3 h-3" />
                            Captcha Verification
                          </label>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-3">
                              <div className="bg-slate-100 rounded-xl p-2 flex items-center justify-center border border-slate-200 min-w-[120px] relative overflow-hidden h-[58px]">
                                {isRefreshingCaptcha && (
                                  <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center z-10 backdrop-blur-[1px]">
                                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                                  </div>
                                )}
                                <img 
                                  src={captchaUrl} 
                                  alt="Captcha" 
                                  className={`h-10 object-contain transition-opacity duration-200 ${isRefreshingCaptcha ? 'opacity-0' : 'opacity-100'}`}
                                  referrerPolicy="no-referrer"
                                  onLoad={() => setIsRefreshingCaptcha(false)}
                                  onError={() => {
                                    setIsRefreshingCaptcha(false);
                                    setCaptchaError("Failed to load captcha. Please try again.");
                                  }}
                                />
                              </div>
                              <button 
                                type="button"
                                onClick={refreshCaptcha}
                                disabled={isRefreshingCaptcha}
                                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[58px] w-[58px] flex items-center justify-center"
                                title="Refresh Captcha"
                              >
                                <RefreshCw className={`w-5 h-5 text-slate-600 ${isRefreshingCaptcha ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                            {captchaError && (
                              <div className="flex flex-col gap-1">
                                <p className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                                  <Info className="w-3 h-3" />
                                  {captchaError}
                                </p>
                                <button 
                                  onClick={refreshCaptcha}
                                  className="text-[10px] text-blue-600 font-bold hover:underline w-fit"
                                >
                                  Try Again
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <input 
                            type="text" 
                            name="captcha"
                            value={data.captcha}
                            onChange={handleInputChange}
                            placeholder="Enter characters from image"
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === "review" && (
                <div className="space-y-8">
                  <div className="border-b border-slate-100 pb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Review Information</h2>
                    <p className="text-slate-500 mt-1">Please verify your details before proceeding to verification.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Appointment Details</h3>
                      <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Country</span>
                          <span className="font-bold">{getCountryName(data.country)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">City</span>
                          <span className="font-bold">{getCityName(data.city)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Travelling To</span>
                          <span className="font-bold">{getTravellingCountryName(data.travellingCountry)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Center</span>
                          <span className="font-bold">{getCenterName(data.centerId)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Candidate Details</h3>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Name</span>
                          <span className="font-bold">{data.firstName} {data.lastName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Passport</span>
                          <span className="font-bold">{data.passportNumber}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Expiry</span>
                          <span className="font-bold">{data.passportExpiryDate}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Issue Place</span>
                          <span className="font-bold">{data.passportIssuePlace}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Nationality</span>
                          <span className="font-bold">{data.nationality}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">National ID</span>
                          <span className="font-bold">{data.nationalId || "N/A"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Position</span>
                          <span className="font-bold">
                            {data.position === "Other" ? data.positionOther : data.position}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Visa Type</span>
                          <span className="font-bold uppercase">
                            {visaOptions.find(o => o.value === data.visaType)?.label || data.visaType}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Email</span>
                          <span className="font-bold truncate ml-4">{data.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === "success" && (
                <div className="text-center space-y-8 py-12">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-green-600 w-12 h-12" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-800">Appointment Booked!</h2>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">Your medical examination has been successfully scheduled. A confirmation slip has been sent to your email.</p>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-8 max-w-lg mx-auto border border-slate-100 text-left space-y-4">
                    <div className="flex justify-between border-b border-slate-200 pb-4">
                      <span className="text-slate-500">Reference Number</span>
                      <span className="font-bold text-blue-600">
                        {appointmentRef === "Pending..." ? (
                          <span className="text-slate-400 italic font-normal text-sm">Check your email for reference</span>
                        ) : (
                          appointmentRef
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-4">
                      <span className="text-slate-500">Candidate</span>
                      <span className="font-bold">{data.firstName} {data.lastName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-4">
                      <span className="text-slate-500">Center</span>
                      <span className="font-bold">{getCenterName(data.centerId)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-4">
                      <span className="text-slate-500">Travelling To</span>
                      <span className="font-bold">{getTravellingCountryName(data.travellingCountry)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-4">
                      <span className="text-slate-500">Origin City</span>
                      <span className="font-bold">{getCityName(data.city)}, {getCountryName(data.country)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    {paymentUrl ? (
                      <a 
                        href={paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-5 h-5" />
                        Proceed to Payment
                      </a>
                    ) : (
                      <button className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                        Download Slip
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setCurrentStep("details");
                        setPaymentUrl(null);
                        setData({
                          country: "",
                          city: "",
                          travellingCountry: "",
                          type: "standard",
                          centerId: "",
                          firstName: "",
                          lastName: "",
                          passportNumber: "",
                          confirmPassportNumber: "",
                          passportIssueDate: "",
                          passportIssuePlace: "",
                          passportExpiryDate: "",
                          gender: "male",
                          maritalStatus: "single",
                          dob: "",
                          nationality: "",
                          position: "",
                          positionOther: "",
                          visaType: "wv",
                          nationalId: "",
                          email: "",
                          phone: "",
                        });
                      }}
                      className="bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                    >
                      Book Another
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message Display */}
              {error && (
                <div className={`mb-8 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-shake border ${
                  error.type === 'validation' 
                    ? 'bg-amber-50 border-amber-100 text-amber-800' 
                    : 'bg-red-50 border-red-100 text-red-800'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      error.type === 'validation' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                    }`}>
                      <Info className="w-5 h-5 flex-shrink-0" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-0.5">
                        {error.type === 'validation' ? 'Validation Error' : 
                         error.type === 'network' ? 'Network Error' : 
                         error.type === 'server' ? 'Server Error' : 'Wafid System Error'}
                      </p>
                      <p className="text-sm font-bold">{error.message}</p>
                    </div>
                  </div>
                  
                  {error.retryAction && (
                    <button 
                      onClick={() => {
                        setError(null);
                        error.retryAction?.();
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                        error.type === 'validation'
                          ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-200'
                          : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200'
                      }`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </button>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep !== "success" && (
                <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                  <button 
                    onClick={prevStep}
                    disabled={currentStep === "info"}
                    className={`flex items-center gap-2 font-bold transition-all ${
                      currentStep === "info" ? "text-slate-300 cursor-not-allowed" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                  
                  <button 
                    onClick={nextStep}
                    disabled={loading}
                    className={`bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        {currentStep === "review" ? "Confirm & Book" : "Continue"}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800">24/7 Support</h4>
              <p className="text-sm text-slate-500">+966 9200 23560</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800">Email Us</h4>
              <p className="text-sm text-slate-500">support@wafid.com</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800">Secure Booking</h4>
              <p className="text-sm text-slate-500">SSL Encrypted Transactions</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <ShieldCheck className="text-blue-500 w-8 h-8" />
            <span className="text-2xl font-bold text-white">WAFID</span>
          </div>
          <p className="text-sm mb-8 max-w-2xl mx-auto">
            Wafid is the official portal for medical examinations for expatriates traveling to GCC countries. 
            This proxy system provides a streamlined interface for booking appointments.
          </p>
          <div className="flex justify-center gap-8 text-xs font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="mt-12 text-xs opacity-50 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Proxy System Active | © 2026 Wafid Proxy System. All rights reserved.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest font-bold opacity-40">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${liveStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              API Proxy: {liveStatus}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              Wafid Gateway: Connected
            </div>
          </div>
        </div>
      </footer>
      <Chatbot />
    </div>
  );
}
