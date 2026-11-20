import React, { useState, useEffect, useRef } from "react";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Sparkles, Moon, Sun, Star, RefreshCw, Lock, User, Calendar, Clock, MapPin, X, Hash, Layers, BookOpen, Gem, ChevronRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";

// Beautiful AI Response Renderer with proper markdown support
const FormatResponse = ({ text }) => {
  if (!text) return null;
  
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom heading styles
          h1: ({children}) => <h1 className="text-2xl font-bold text-[#D4AF37] mb-4 mt-6">{children}</h1>,
          h2: ({children}) => <h2 className="text-xl font-bold text-[#D4AF37] mb-3 mt-5">{children}</h2>,
          h3: ({children}) => <h3 className="text-lg font-semibold text-[#D4AF37] mb-2 mt-4">{children}</h3>,
          // Paragraph styling
          p: ({children}) => <p className="text-gray-200 leading-relaxed mb-3">{children}</p>,
          // List styling
          ul: ({children}) => <ul className="list-disc list-inside space-y-1 text-gray-200 mb-3">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal list-inside space-y-1 text-gray-200 mb-3">{children}</ol>,
          li: ({children}) => <li className="text-gray-200">{children}</li>,
          // Strong/Bold styling
          strong: ({children}) => <strong className="text-[#D4AF37] font-semibold">{children}</strong>,
          // Emphasis/Italic
          em: ({children}) => <em className="text-gray-300 italic">{children}</em>,
          // Blockquote
          blockquote: ({children}) => (
            <blockquote className="border-l-4 border-[#D4AF37] pl-4 my-4 italic text-gray-300 bg-white/5 py-2 rounded-r">
              {children}
            </blockquote>
          ),
          // Code blocks
          code: ({children}) => (
            <code className="bg-white/10 px-2 py-0.5 rounded text-[#D4AF37] text-sm">{children}</code>
          ),
          // Horizontal rule
          hr: () => <hr className="border-white/20 my-4" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

// Zodiac colors
const ZODIAC_COLORS = {
  mesh: "from-red-500 to-orange-500",
  vrishabh: "from-green-500 to-emerald-500",
  mithun: "from-yellow-400 to-amber-500",
  kark: "from-blue-400 to-cyan-500",
  singh: "from-orange-500 to-red-500",
  kanya: "from-emerald-500 to-teal-500",
  tula: "from-pink-400 to-rose-500",
  vrishchik: "from-purple-600 to-violet-600",
  dhanu: "from-indigo-500 to-purple-500",
  makar: "from-gray-600 to-slate-700",
  kumbh: "from-cyan-500 to-blue-500",
  meen: "from-teal-400 to-cyan-500",
};

// Decorative Card Component
const DecorativeCard = ({ children, className = "", gradient = "from-purple-900/50 to-indigo-900/50" }) => (
  <div className={`relative overflow-hidden rounded-2xl ${className}`}>
    {/* Decorative border */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/30 via-transparent to-[#8B1538]/30 rounded-2xl" />
    <div className={`absolute inset-[1px] bg-gradient-to-br ${gradient} rounded-2xl backdrop-blur-xl`} />
    {/* Corner decorations */}
    <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#D4AF37]/50 rounded-tl-2xl" />
    <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[#D4AF37]/50 rounded-tr-2xl" />
    <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[#D4AF37]/50 rounded-bl-2xl" />
    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#D4AF37]/50 rounded-br-2xl" />
    {/* Content */}
    <div className="relative z-10 p-6 md:p-8">{children}</div>
  </div>
);

// Feature Card for main tabs
const FeatureCard = ({ icon: Icon, title, subtitle, gradient, onClick, isActive, testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`group relative w-full overflow-hidden rounded-xl p-5 transition-all duration-300 ${
      isActive ? "scale-[1.02] shadow-2xl" : "hover:scale-[1.01]"
    }`}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-${isActive ? "100" : "70"} transition-opacity group-hover:opacity-100`} />
    <div className="absolute inset-0 bg-black/20" />
    <div className={`absolute inset-0 ${isActive ? "ring-2 ring-[#D4AF37] ring-inset" : ""} rounded-xl`} />
    <div className="relative z-10 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shadow-lg ${isActive ? "animate-pulse" : ""}`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <div className="text-left">
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <p className="text-white/70 text-sm">{subtitle}</p>
      </div>
      <ChevronRight className={`w-5 h-5 text-white/50 ml-auto transition-transform ${isActive ? "rotate-90" : "group-hover:translate-x-1"}`} />
    </div>
  </button>
);

// Tarot Card Visual Component
const TarotCardVisual = ({ card, index, isRevealed = true }) => {
  const cardColors = [
    "from-purple-600 to-pink-600",
    "from-blue-600 to-cyan-600",
    "from-amber-600 to-orange-600",
    "from-emerald-600 to-teal-600",
    "from-rose-600 to-red-600",
    "from-indigo-600 to-violet-600"
  ];

  return (
    <div className={`relative group transition-all duration-500 ${isRevealed ? "animate-flip-in" : ""}`} style={{ animationDelay: `${index * 200}ms` }}>
      <div className="w-28 sm:w-32 md:w-36 aspect-[2/3] relative">
        {/* Card glow */}
        <div className={`absolute -inset-2 bg-gradient-to-br ${cardColors[index % cardColors.length]} rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity`} />
        {/* Card body */}
        <div className={`relative w-full h-full bg-gradient-to-br ${cardColors[index % cardColors.length]} rounded-xl shadow-2xl overflow-hidden border-2 border-[#D4AF37]/50`}>
          {/* Card pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-4 border border-white/30 rounded-lg" />
            <div className="absolute inset-6 border border-white/20 rounded-lg" />
          </div>
          {/* Card content */}
          <div className="relative h-full flex flex-col items-center justify-center p-3 text-center">
            <div className="text-4xl sm:text-5xl mb-2 filter drop-shadow-lg">🎴</div>
            <div className="text-white font-bold text-xs sm:text-sm leading-tight">{card.name}</div>
            <div className="text-[#D4AF37] text-[10px] sm:text-xs mt-1">{card.hindi}</div>
          </div>
          {/* Card number */}
          <div className="absolute top-2 left-2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{index + 1}</span>
          </div>
        </div>
      </div>
      {/* Position label */}
      <div className="mt-2 text-center">
        <span className="text-gray-400 text-xs">{card.meaning?.split(",")[0]}</span>
      </div>
    </div>
  );
};

// Number Display Card
const NumberCard = ({ number, label, gradient, delay = 0 }) => (
  <div className="animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
    <div className={`relative overflow-hidden rounded-xl p-4 bg-gradient-to-br ${gradient} shadow-xl group hover:scale-105 transition-transform`}>
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      <div className="relative text-center">
        <div className="text-4xl sm:text-5xl font-bold text-white drop-shadow-lg">{number}</div>
        <div className="text-white/80 text-xs sm:text-sm mt-1 font-medium">{label}</div>
      </div>
    </div>
  </div>
);

export default function AstroPage() {
  const [user, setUser] = useState(null);
  const [zodiacSigns, setZodiacSigns] = useState([]);
  const [mainTab, setMainTab] = useState("rashifal");
  
  // Rashifal states
  const [selectedRashi, setSelectedRashi] = useState(null);
  const [rashifal, setRashifal] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Numerology states
  const [numName, setNumName] = useState("");
  const [numDob, setNumDob] = useState("");
  const [numerologyResult, setNumerologyResult] = useState(null);
  
  // Tarot states
  const [tarotQuestion, setTarotQuestion] = useState("");
  const [tarotSpread, setTarotSpread] = useState("single");
  const [tarotResult, setTarotResult] = useState(null);
  const [cardsRevealed, setCardsRevealed] = useState(false);
  
  // Panchang states
  const [panchangLocation, setPanchangLocation] = useState("New Delhi, India");
  const [panchangResult, setPanchangResult] = useState(null);
  
  // Personalized states
  const [birthDetails, setBirthDetails] = useState(null);
  const [birthForm, setBirthForm] = useState({ name: "", date_of_birth: "", time_of_birth: "", place_of_birth: "", gender: "male" });
  const [personalizedTab, setPersonalizedTab] = useState("kundli");
  const [kundliData, setKundliData] = useState(null);
  const [myNumerology, setMyNumerology] = useState(null);
  const [myTarot, setMyTarot] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSessionId, setChatSessionId] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  // Stars animation
  const [stars] = useState(() => 
    [...Array(100)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2
    }))
  );

  useEffect(() => {
    fetchZodiacSigns();
    checkUser();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const fetchZodiacSigns = async () => {
    try {
      const response = await axios.get(`${API}/astro/zodiac-signs`);
      setZodiacSigns(response.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const checkUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
      const astroResponse = await axios.get(`${API}/astro/my-profile`, { withCredentials: true });
      if (astroResponse.data) setBirthDetails(astroResponse.data);
    } catch (error) {
      setUser(null);
    }
  };

  // Rashifal
  const fetchRashifal = async (rashiId) => {
    setLoading(true);
    setRashifal(null);
    try {
      const response = await axios.post(`${API}/astro/daily-rashifal`, { rashi_id: rashiId, period: "daily" });
      setRashifal(response.data);
    } catch (error) {
      toast.error("Rashifal load nahi ho paya");
    }
    setLoading(false);
  };

  // Numerology
  const fetchNumerology = async () => {
    if (!numName || !numDob) {
      toast.error("Name aur Date of Birth daalein");
      return;
    }
    setLoading(true);
    setNumerologyResult(null);
    try {
      const response = await axios.post(`${API}/astro/numerology`, { name: numName, date_of_birth: numDob });
      setNumerologyResult(response.data);
    } catch (error) {
      toast.error("Numerology calculate nahi ho payi");
    }
    setLoading(false);
  };

  // Tarot
  const fetchTarot = async () => {
    setLoading(true);
    setTarotResult(null);
    setCardsRevealed(false);
    try {
      const response = await axios.post(`${API}/astro/tarot/draw`, { question: tarotQuestion, spread_type: tarotSpread });
      setTarotResult(response.data);
      // Trigger card reveal animation
      setTimeout(() => setCardsRevealed(true), 300);
    } catch (error) {
      toast.error("Tarot reading nahi aa payi");
    }
    setLoading(false);
  };

  // Panchang
  const fetchPanchang = async () => {
    setLoading(true);
    setPanchangResult(null);
    try {
      const response = await axios.post(`${API}/astro/panchang`, { location: panchangLocation });
      setPanchangResult(response.data);
    } catch (error) {
      toast.error("Panchang load nahi ho paya");
    }
    setLoading(false);
  };

  // Personalized functions
  const saveBirthDetails = async () => {
    if (!birthForm.name || !birthForm.date_of_birth || !birthForm.time_of_birth || !birthForm.place_of_birth) {
      toast.error("Sabhi details bharein");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/astro/save-profile`, birthForm, { withCredentials: true });
      setBirthDetails(response.data.profile);
      // Clear old cached data
      setKundliData(null);
      setMyNumerology(null);
      setMyTarot(null);
      setChatMessages([]);
      toast.success("Profile saved! 🌟");
      fetchKundli();
    } catch (error) {
      toast.error("Details save nahi ho payi");
    }
    setLoading(false);
  };

  const deleteBirthProfile = async () => {
    if (!window.confirm("Kya aap apni birth details delete karna chahte ho? Saari predictions bhi delete ho jayengi.")) return;
    setLoading(true);
    try {
      await axios.delete(`${API}/astro/my-profile`, { withCredentials: true });
      setBirthDetails(null);
      setKundliData(null);
      setMyNumerology(null);
      setMyTarot(null);
      setChatMessages([]);
      setBirthForm({ name: "", date_of_birth: "", time_of_birth: "", place_of_birth: "", gender: "male" });
      toast.success("Profile deleted! Ab aap naya profile bana sakte ho.");
    } catch (error) {
      toast.error("Profile delete nahi ho payi");
    }
    setLoading(false);
  };

  const fetchKundli = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/astro/my-kundli`, { withCredentials: true });
      setKundliData(response.data);
    } catch (error) {
      toast.error("Kundli load nahi ho payi");
    }
    setLoading(false);
  };

  const fetchMyNumerology = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/astro/my-numerology`, { withCredentials: true });
      setMyNumerology(response.data);
    } catch (error) {
      toast.error("Numerology load nahi ho payi");
    }
    setLoading(false);
  };

  const fetchMyTarot = async () => {
    setLoading(true);
    setCardsRevealed(false);
    try {
      const response = await axios.post(`${API}/astro/my-tarot`, { spread_type: "three_card" }, { withCredentials: true });
      setMyTarot(response.data);
      setTimeout(() => setCardsRevealed(true), 300);
    } catch (error) {
      toast.error("Tarot load nahi ho payi");
    }
    setLoading(false);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { type: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const response = await axios.post(`${API}/astro/personalized-chat`, { message: userMsg, session_id: chatSessionId }, { withCredentials: true });
      setChatSessionId(response.data.session_id);
      setChatMessages(prev => [...prev, { type: "ai", text: response.data.response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { type: "ai", text: "🙏 Technical issue hai. Thodi der mein try karein." }]);
    }
    setChatLoading(false);
  };

  // Loading Spinner
  const LoadingSpinner = ({ text = "Loading..." }) => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-[#D4AF37]/30 rounded-full" />
        <div className="absolute inset-0 w-20 h-20 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-2 w-16 h-16 border-4 border-[#8B1538]/50 border-b-transparent rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
      </div>
      <p className="text-gray-400 mt-4 animate-pulse">{text}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a1a3e] to-[#0f0f23] relative overflow-hidden">
      <SEO 
        title="Free Astrology, Rashifal & Kundli - Vedic Predictions"
        description="Get free daily rashifal, personalized kundli, numerology readings, tarot card predictions & panchang. AI-powered Vedic astrology by Paridhaan Creations."
        keywords="rashifal, daily horoscope, kundli, numerology, tarot cards, panchang, vedic astrology, free astrology, zodiac predictions, rashi, nakshatra, janm kundli"
        type="website"
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Astrology', url: '/astro' }
        ]}
      />
      {/* Animated Stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {stars.map((star, i) => (
          <div key={i} className="absolute rounded-full bg-white animate-twinkle"
            style={{ left: star.left, top: star.top, width: `${star.size}px`, height: `${star.size}px`, animationDelay: `${star.delay}s`, animationDuration: `${star.duration}s` }} />
        ))}
        {[...Array(5)].map((_, i) => (
          <div key={`shoot-${i}`} className="shooting-star absolute" style={{ left: `${10 + i * 20}%`, top: `${5 + i * 10}%`, animationDelay: `${i * 3}s` }} />
        ))}
      </div>

      {/* Nebula Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8B1538]/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Header */}
      <div className="relative z-10 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-[#D4AF37] to-[#8B1538] rounded-full flex items-center justify-center shadow-2xl">
                <span className="text-5xl">🔮</span>
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-[#D4AF37] to-[#8B1538] rounded-full blur-lg opacity-50 animate-pulse" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-3">
            <span className="text-[#D4AF37]">ज्योतिष</span> Astro
          </h1>
          <p className="text-gray-400 text-lg">Complete Vedic Astrology • Numerology • Tarot • Panchang</p>
          <p className="text-[#D4AF37]/70 text-sm mt-2">✨ AI-Powered Personalized Predictions ✨</p>
        </div>
      </div>

      {/* Feature Cards - Main Navigation */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FeatureCard
            icon={Sun}
            title="📅 Rashifal"
            subtitle="Daily Horoscope"
            gradient="from-orange-500 to-red-600"
            onClick={() => setMainTab("rashifal")}
            isActive={mainTab === "rashifal"}
            testId="tab-rashifal"
          />
          <FeatureCard
            icon={Hash}
            title="🔢 Numerology"
            subtitle="Life Path Numbers"
            gradient="from-purple-500 to-pink-600"
            onClick={() => setMainTab("numerology")}
            isActive={mainTab === "numerology"}
            testId="tab-numerology"
          />
          <FeatureCard
            icon={Layers}
            title="🃏 Tarot"
            subtitle="Card Reading"
            gradient="from-indigo-500 to-purple-600"
            onClick={() => setMainTab("tarot")}
            isActive={mainTab === "tarot"}
            testId="tab-tarot"
          />
          <FeatureCard
            icon={BookOpen}
            title="📿 Panchang"
            subtitle="Drik Calendar"
            gradient="from-emerald-500 to-teal-600"
            onClick={() => setMainTab("panchang")}
            isActive={mainTab === "panchang"}
            testId="tab-panchang"
          />
          <FeatureCard
            icon={user ? User : Lock}
            title="🔮 My Profile"
            subtitle={user ? "Personalized" : "Login Required"}
            gradient="from-[#8B1538] to-[#D4AF37]"
            onClick={() => setMainTab("personalized")}
            isActive={mainTab === "personalized"}
            testId="tab-profile"
          />
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-16">
        {/* ========== RASHIFAL TAB ========== */}
        {mainTab === "rashifal" && (
          <div className="animate-fade-in">
            <DecorativeCard gradient="from-orange-900/30 to-red-900/30">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <span className="text-3xl">🪔</span> अपनी राशि चुनें
              </h2>
              <p className="text-gray-400 mb-6">Select your zodiac sign for today's horoscope</p>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {zodiacSigns.map((sign) => (
                  <button
                    key={sign.id}
                    onClick={() => { setSelectedRashi(sign); fetchRashifal(sign.id); }}
                    className={`group relative p-4 rounded-xl transition-all duration-300 ${
                      selectedRashi?.id === sign.id
                        ? `bg-gradient-to-br ${ZODIAC_COLORS[sign.id]} text-white shadow-xl scale-105 ring-2 ring-white/50`
                        : "bg-white/10 text-gray-300 hover:bg-white/20 hover:scale-105"
                    }`}
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{sign.symbol}</div>
                    <div className="font-semibold text-sm">{sign.name}</div>
                    <div className="text-xs opacity-70">{sign.english}</div>
                  </button>
                ))}
              </div>
            </DecorativeCard>

            {selectedRashi && (
              <div className="mt-6 animate-slide-up">
                <DecorativeCard gradient="from-slate-900/50 to-slate-800/50">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${ZODIAC_COLORS[selectedRashi.id]} flex items-center justify-center text-3xl shadow-lg ring-4 ring-white/20`}>
                        {selectedRashi.symbol}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{selectedRashi.name} Rashifal</h3>
                        <p className="text-[#D4AF37]">{selectedRashi.english} • {selectedRashi.dates}</p>
                      </div>
                    </div>
                    <button onClick={() => fetchRashifal(selectedRashi.id)} disabled={loading} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                      <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {loading ? (
                    <LoadingSpinner text="Rashifal generate ho raha hai..." />
                  ) : rashifal ? (
                    <FormatResponse text={rashifal.rashifal} />
                  ) : null}
                </DecorativeCard>
              </div>
            )}
          </div>
        )}

        {/* ========== NUMEROLOGY TAB ========== */}
        {mainTab === "numerology" && (
          <div className="animate-fade-in">
            <DecorativeCard gradient="from-purple-900/30 to-pink-900/30">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-xl">
                  <Hash className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Numerology Calculator</h2>
                  <p className="text-gray-400">Discover your Life Path, Destiny & Soul Numbers</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-300 mb-2 font-medium">Full Name (as per birth certificate)</label>
                  <input
                    type="text"
                    value={numName}
                    onChange={(e) => setNumName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37] placeholder-gray-500 border border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2 font-medium">Date of Birth</label>
                  <input
                    type="date"
                    value={numDob}
                    onChange={(e) => setNumDob(e.target.value)}
                    className="w-full bg-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37] border border-white/10"
                  />
                </div>
              </div>
              
              <button
                onClick={fetchNumerology}
                disabled={loading}
                className="w-full md:w-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5" /> Calculate My Numbers</>}
              </button>
            </DecorativeCard>

            {numerologyResult && (
              <div className="mt-6 animate-slide-up">
                <DecorativeCard gradient="from-slate-900/50 to-purple-900/30">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Gem className="w-6 h-6 text-[#D4AF37]" /> Your Core Numbers
                  </h3>
                  
                  {/* Number Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
                    <NumberCard number={numerologyResult.calculations.life_path.life_path} label="Life Path" gradient="from-purple-500 to-pink-500" delay={0} />
                    <NumberCard number={numerologyResult.calculations.name_numbers.expression} label="Expression" gradient="from-blue-500 to-cyan-500" delay={100} />
                    <NumberCard number={numerologyResult.calculations.name_numbers.soul_urge} label="Soul Urge" gradient="from-green-500 to-emerald-500" delay={200} />
                    <NumberCard number={numerologyResult.calculations.name_numbers.personality} label="Personality" gradient="from-orange-500 to-red-500" delay={300} />
                    <NumberCard number={numerologyResult.calculations.life_path.day} label="Birthday" gradient="from-indigo-500 to-purple-500" delay={400} />
                  </div>
                  
                  <FormatResponse text={numerologyResult.reading} />
                </DecorativeCard>
              </div>
            )}
          </div>
        )}

        {/* ========== TAROT TAB ========== */}
        {mainTab === "tarot" && (
          <div className="animate-fade-in">
            <DecorativeCard gradient="from-indigo-900/30 to-purple-900/30">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-xl">
                  <Layers className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Tarot Card Reading</h2>
                  <p className="text-gray-400">Receive divine guidance through the cards</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2 font-medium">Your Question (Optional)</label>
                <input
                  type="text"
                  value={tarotQuestion}
                  onChange={(e) => setTarotQuestion(e.target.value)}
                  placeholder="What would you like guidance on?"
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37] placeholder-gray-500 border border-white/10"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-3 font-medium">Card Spread</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: "single", label: "Single Card", desc: "Quick guidance", icon: "🎴" },
                    { id: "three_card", label: "3 Cards", desc: "Past-Present-Future", icon: "🃏🃏🃏" },
                    { id: "six_card", label: "6 Cards", desc: "Detailed reading", icon: "✨" },
                  ].map((spread) => (
                    <button
                      key={spread.id}
                      onClick={() => setTarotSpread(spread.id)}
                      className={`px-5 py-3 rounded-xl transition-all flex items-center gap-2 ${
                        tarotSpread === spread.id
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg scale-105"
                          : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                    >
                      <span>{spread.icon}</span>
                      <span>{spread.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={fetchTarot}
                disabled={loading}
                className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5" /> Draw Cards</>}
              </button>
            </DecorativeCard>

            {tarotResult && (
              <div className="mt-6 animate-slide-up">
                <DecorativeCard gradient="from-slate-900/50 to-indigo-900/30">
                  <h3 className="text-xl font-bold text-white mb-6 text-center">Your Cards</h3>
                  
                  {/* Tarot Cards Display */}
                  <div className="flex flex-wrap justify-center gap-6 mb-8">
                    {tarotResult.cards.map((card, idx) => (
                      <TarotCardVisual key={idx} card={card} index={idx} isRevealed={cardsRevealed} />
                    ))}
                  </div>
                  
                  <FormatResponse text={tarotResult.reading} />
                </DecorativeCard>
              </div>
            )}
          </div>
        )}

        {/* ========== PANCHANG TAB ========== */}
        {mainTab === "panchang" && (
          <div className="animate-fade-in">
            <DecorativeCard gradient="from-emerald-900/30 to-teal-900/30">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-xl">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Drik Panchang</h2>
                  <p className="text-gray-400">Today's शुभ मुहूर्त, तिथि, नक्षत्र</p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-2 font-medium">Location</label>
                <input
                  type="text"
                  value={panchangLocation}
                  onChange={(e) => setPanchangLocation(e.target.value)}
                  placeholder="City, Country"
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37] placeholder-gray-500 border border-white/10"
                />
              </div>
              
              <button
                onClick={fetchPanchang}
                disabled={loading}
                className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><BookOpen className="w-5 h-5" /> Get Today's Panchang</>}
              </button>
            </DecorativeCard>

            {panchangResult && (
              <div className="mt-6 animate-slide-up">
                <DecorativeCard gradient="from-slate-900/50 to-emerald-900/30">
                  {/* Date Header Card */}
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 mb-6 text-center shadow-xl">
                    <div className="text-white text-3xl font-bold mb-1">{panchangResult.date}</div>
                    <div className="text-white/90 text-lg">{panchangResult.weekday}</div>
                    <div className="text-[#D4AF37] text-xl font-semibold">{panchangResult.hindi_weekday}</div>
                    <div className="text-white/70 text-sm mt-2 flex items-center justify-center gap-2">
                      <MapPin className="w-4 h-4" /> {panchangResult.location}
                    </div>
                  </div>
                  
                  <FormatResponse text={panchangResult.panchang} />
                </DecorativeCard>
              </div>
            )}
          </div>
        )}

        {/* ========== PERSONALIZED TAB ========== */}
        {mainTab === "personalized" && (
          <div className="animate-fade-in">
            {!user ? (
              <DecorativeCard gradient="from-[#8B1538]/30 to-[#D4AF37]/20">
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#8B1538] rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Lock className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto">Personalized predictions ke liye login karein. Aapki birth details ke basis pe accurate readings milenge.</p>
                  <button onClick={() => navigate("/login?redirect=/astro")} className="bg-gradient-to-r from-[#D4AF37] to-[#8B1538] text-white py-4 px-8 rounded-xl font-semibold shadow-lg hover:shadow-[#D4AF37]/25 transition-all">
                    🙏 Login / Register
                  </button>
                </div>
              </DecorativeCard>
            ) : !birthDetails ? (
              <DecorativeCard gradient="from-[#8B1538]/30 to-[#D4AF37]/20">
                <div className="max-w-lg mx-auto">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#8B1538] rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Enter Birth Details</h2>
                    <p className="text-gray-400 mt-2">Accurate predictions ke liye sahi jaankari dein</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Full Name</label>
                      <input type="text" value={birthForm.name} onChange={(e) => setBirthForm({...birthForm, name: e.target.value})} placeholder="As per birth certificate" className="w-full bg-white/10 text-white px-4 py-3 rounded-xl placeholder-gray-500 border border-white/10 focus:ring-2 focus:ring-[#D4AF37] focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-300 mb-2">Date of Birth</label>
                        <input type="date" value={birthForm.date_of_birth} onChange={(e) => setBirthForm({...birthForm, date_of_birth: e.target.value})} className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-[#D4AF37] focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-2">Time of Birth</label>
                        <input type="time" value={birthForm.time_of_birth} onChange={(e) => setBirthForm({...birthForm, time_of_birth: e.target.value})} className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-[#D4AF37] focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Place of Birth</label>
                      <input type="text" value={birthForm.place_of_birth} onChange={(e) => setBirthForm({...birthForm, place_of_birth: e.target.value})} placeholder="City, State, Country" className="w-full bg-white/10 text-white px-4 py-3 rounded-xl placeholder-gray-500 border border-white/10 focus:ring-2 focus:ring-[#D4AF37] focus:outline-none" />
                    </div>
                    <button onClick={saveBirthDetails} disabled={loading} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#8B1538] text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-[#D4AF37]/25 transition-all">
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Save & Generate Kundli"}
                    </button>
                  </div>
                </div>
              </DecorativeCard>
            ) : (
              <div>
                {/* User Info Card */}
                <div className="bg-gradient-to-r from-[#8B1538]/50 to-[#D4AF37]/30 rounded-xl px-5 py-4 mb-6 border border-[#D4AF37]/30">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#8B1538] rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">{birthDetails.name}</div>
                        <div className="text-gray-400 text-sm flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {birthDetails.date_of_birth}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {birthDetails.time_of_birth}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {birthDetails.place_of_birth}</span>
                        </div>
                      </div>
                    </div>
                    {/* Delete/Change Profile Button */}
                    <button
                      onClick={deleteBirthProfile}
                      className="px-4 py-2 bg-red-500/20 text-red-400 text-sm rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Change Profile
                    </button>
                  </div>
                </div>

                {/* Sub Tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {[
                    { id: "kundli", label: "📊 Kundli", gradient: "from-orange-500 to-red-500" },
                    { id: "numerology", label: "🔢 My Numbers", gradient: "from-purple-500 to-pink-500" },
                    { id: "tarot", label: "🃏 My Tarot", gradient: "from-indigo-500 to-purple-500" },
                    { id: "chat", label: "💬 Ask Pandit Ji", gradient: "from-emerald-500 to-teal-500" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setPersonalizedTab(tab.id);
                        if (tab.id === "kundli" && !kundliData) fetchKundli();
                        if (tab.id === "numerology" && !myNumerology) fetchMyNumerology();
                        if (tab.id === "tarot" && !myTarot) fetchMyTarot();
                      }}
                      className={`px-5 py-3 rounded-xl font-medium transition-all ${
                        personalizedTab === tab.id 
                          ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg scale-105` 
                          : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Kundli */}
                {personalizedTab === "kundli" && (
                  <DecorativeCard gradient="from-orange-900/30 to-red-900/30">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">📊</span> Your Personal Kundli
                      </h3>
                      <button onClick={fetchKundli} disabled={loading} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    {loading ? (
                      <LoadingSpinner text="Kundli generate ho rahi hai..." />
                    ) : kundliData ? (
                      <FormatResponse text={kundliData.kundli} />
                    ) : (
                      <button onClick={fetchKundli} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-semibold">
                        Generate Kundli
                      </button>
                    )}
                  </DecorativeCard>
                )}

                {/* My Numerology */}
                {personalizedTab === "numerology" && (
                  <DecorativeCard gradient="from-purple-900/30 to-pink-900/30">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🔢</span> Your Personal Numbers
                      </h3>
                      <button onClick={fetchMyNumerology} disabled={loading} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    {loading ? (
                      <LoadingSpinner text="Numbers calculate ho rahe hain..." />
                    ) : myNumerology ? (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
                          <NumberCard number={myNumerology.calculations.life_path.life_path} label="Life Path" gradient="from-purple-500 to-pink-500" delay={0} />
                          <NumberCard number={myNumerology.calculations.name_numbers.expression} label="Expression" gradient="from-blue-500 to-cyan-500" delay={100} />
                          <NumberCard number={myNumerology.calculations.name_numbers.soul_urge} label="Soul Urge" gradient="from-green-500 to-emerald-500" delay={200} />
                          <NumberCard number={myNumerology.calculations.name_numbers.personality} label="Personality" gradient="from-orange-500 to-red-500" delay={300} />
                          <NumberCard number={myNumerology.calculations.life_path.day} label="Birthday" gradient="from-indigo-500 to-purple-500" delay={400} />
                        </div>
                        <FormatResponse text={myNumerology.reading} />
                      </>
                    ) : (
                      <button onClick={fetchMyNumerology} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold">
                        Get My Numbers
                      </button>
                    )}
                  </DecorativeCard>
                )}

                {/* My Tarot */}
                {personalizedTab === "tarot" && (
                  <DecorativeCard gradient="from-indigo-900/30 to-purple-900/30">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🃏</span> Your Personal Tarot
                      </h3>
                      <button onClick={fetchMyTarot} disabled={loading} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    {loading ? (
                      <LoadingSpinner text="Cards shuffle ho rahe hain..." />
                    ) : myTarot ? (
                      <>
                        <div className="flex flex-wrap justify-center gap-6 mb-8">
                          {myTarot.cards.map((card, idx) => (
                            <TarotCardVisual key={idx} card={card} index={idx} isRevealed={cardsRevealed} />
                          ))}
                        </div>
                        <FormatResponse text={myTarot.reading} />
                      </>
                    ) : (
                      <button onClick={fetchMyTarot} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-xl font-semibold">
                        Draw My Cards
                      </button>
                    )}
                  </DecorativeCard>
                )}

                {/* Chat */}
                {personalizedTab === "chat" && (
                  <DecorativeCard gradient="from-emerald-900/30 to-teal-900/30" className="p-0">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 rounded-t-2xl">
                      <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <span className="text-2xl">🙏</span> Ask Pandit Ji
                      </h3>
                      <p className="text-white/80 text-sm">Based on YOUR Kundli - Personalized answers</p>
                    </div>
                    <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-900/50 to-slate-800/50">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="text-6xl mb-4">🔮</div>
                          <p className="text-gray-300 text-lg">Kuch bhi puchho!</p>
                          <p className="text-gray-500 text-sm mt-2">Career, relationships, health, finance...</p>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl ${
                              msg.type === "user" 
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-sm" 
                                : "bg-white/10 text-gray-100 rounded-bl-sm border border-white/10"
                            }`}>
                              <FormatResponse text={msg.text} />
                            </div>
                          </div>
                        ))
                      )}
                      {chatLoading && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                          <span className="ml-2">Soch raha hoon...</span>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="p-4 border-t border-white/10 flex gap-3 bg-slate-900/50 rounded-b-2xl">
                      <input 
                        type="text" 
                        value={chatInput} 
                        onChange={(e) => setChatInput(e.target.value)} 
                        onKeyPress={(e) => e.key === "Enter" && sendChatMessage()} 
                        placeholder="Apna sawaal puchho..." 
                        className="flex-1 bg-white/10 text-white px-4 py-3 rounded-xl placeholder-gray-400 border border-white/10 focus:ring-2 focus:ring-[#D4AF37] focus:outline-none" 
                      />
                      <button onClick={sendChatMessage} disabled={chatLoading} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg">
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </DecorativeCard>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        .animate-twinkle { animation: twinkle ease-in-out infinite; }
        
        @keyframes shooting {
          0% { transform: translateX(0) translateY(0) rotate(-45deg); opacity: 1; width: 0; }
          30% { opacity: 1; width: 150px; }
          100% { transform: translateX(600px) translateY(600px) rotate(-45deg); opacity: 0; width: 150px; }
        }
        .shooting-star {
          width: 0; height: 2px;
          background: linear-gradient(90deg, #D4AF37, #fff, transparent);
          animation: shooting 4s ease-out infinite;
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.5s ease-out; }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
        
        @keyframes flip-in {
          0% { opacity: 0; transform: rotateY(90deg) scale(0.8); }
          100% { opacity: 1; transform: rotateY(0) scale(1); }
        }
        .animate-flip-in { animation: flip-in 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
}
