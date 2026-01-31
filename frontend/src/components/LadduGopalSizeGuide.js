import React, { useState } from "react";
import { X, Ruler, HelpCircle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

// Standard Laddu Gopal Size Chart Data
const SIZE_CHART_DATA = [
  { size: "0", murtiHeight: "1.5 - 2.0", dressDiameter: "4 - 4.5", description: "Sabse chhota size" },
  { size: "1", murtiHeight: "2.2 - 2.5", dressDiameter: "5 - 5.5", description: "Small size" },
  { size: "2", murtiHeight: "2.75 - 3.0", dressDiameter: "6 - 6.5", description: "Medium small" },
  { size: "3", murtiHeight: "3.15 - 3.5", dressDiameter: "7 - 7.5", description: "Medium size" },
  { size: "4", murtiHeight: "3.5 - 4.0", dressDiameter: "8 - 8.5", description: "Medium large" },
  { size: "5", murtiHeight: "4.0 - 4.5", dressDiameter: "10 - 10.5", description: "Large size" },
  { size: "6", murtiHeight: "4.5 - 5.0", dressDiameter: "12 - 12.5", description: "Extra large" },
  { size: "6+", murtiHeight: "5.0+", dressDiameter: "12.5+", description: "Sabse bada size" }
];

// Size Guide Modal Component
export function LadduGopalSizeGuideModal({ isOpen, onClose, onSelectSize }) {
  const [selectedSize, setSelectedSize] = useState(null);

  if (!isOpen) return null;

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    if (onSelectSize) {
      onSelectSize(size);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Ruler className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">🕉️ Laddu Gopal Size Guide</h2>
                <p className="text-amber-100 text-sm">Apne Kanha ji ke liye perfect poshak chunein</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* How to Measure Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5" />
              Murti Kaise Measure Karein?
            </h3>
            <div className="text-sm text-amber-700 space-y-1">
              <p>• <strong>Height:</strong> Murti ki base se crown (mukut) tak ki height measure karein</p>
              <p>• <strong>Vertical measurement:</strong> Seedhi line mein upar se niche measure karein</p>
              <p>• <strong>Tip:</strong> Agar murti curved hai toh seedhi line mein measure karein</p>
            </div>
          </div>

          {/* Size Chart Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-orange-100 to-amber-100">
                  <th className="border border-amber-200 px-4 py-3 text-left font-semibold text-amber-900">Size No.</th>
                  <th className="border border-amber-200 px-4 py-3 text-left font-semibold text-amber-900">Murti Height (inch)</th>
                  <th className="border border-amber-200 px-4 py-3 text-left font-semibold text-amber-900">Dress Diameter (inch)</th>
                  <th className="border border-amber-200 px-4 py-3 text-center font-semibold text-amber-900">Select</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART_DATA.map((item, index) => (
                  <tr 
                    key={item.size}
                    className={`hover:bg-amber-50 transition-colors cursor-pointer ${
                      selectedSize === item.size ? 'bg-amber-100 ring-2 ring-amber-400' : ''
                    } ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    onClick={() => handleSizeSelect(item.size)}
                  >
                    <td className="border border-amber-200 px-4 py-3">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold rounded-full shadow">
                        {item.size}
                      </span>
                    </td>
                    <td className="border border-amber-200 px-4 py-3 font-medium">{item.murtiHeight} inch</td>
                    <td className="border border-amber-200 px-4 py-3">{item.dressDiameter} inch</td>
                    <td className="border border-amber-200 px-4 py-3 text-center">
                      {selectedSize === item.size ? (
                        <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
                      ) : (
                        <div className="w-6 h-6 border-2 border-gray-300 rounded-full mx-auto hover:border-amber-400 transition-colors" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected Size Action */}
          {selectedSize && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-green-800 font-semibold">
                    ✅ Size {selectedSize} selected!
                  </p>
                  <p className="text-green-600 text-sm">
                    Ab aap Size {selectedSize} ke liye available dresses dekh sakte hain
                  </p>
                </div>
                <Link
                  to={`/products?category=pooja&laddu_gopal_size=${selectedSize}`}
                  onClick={onClose}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Size {selectedSize} Dresses देखें →
                </Link>
              </div>
            </div>
          )}

          {/* Tips Section */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-semibold text-blue-800 mb-2">💡 Pro Tip</h4>
              <p className="text-sm text-blue-700">
                Agar aapki murti do sizes ke beech mein hai, toh bada size lein - poshak thodi dhili rehna better hai tight se.
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h4 className="font-semibold text-purple-800 mb-2">🛡️ Exchange Policy</h4>
              <p className="text-sm text-purple-700">
                Agar size fit nahi aaya toh 7 din mein exchange kar sakte hain (unused condition mein).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact Size Badge for Product Cards
export function LadduGopalSizeBadge({ sizes }) {
  if (!sizes || sizes.length === 0) return null;
  
  const sizeText = sizes.length === 1 
    ? `Size ${sizes[0]}` 
    : `Size ${sizes[0]}-${sizes[sizes.length - 1]}`;

  return (
    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
      <Ruler className="w-3 h-3" />
      {sizeText}
    </span>
  );
}

// Size Guide Button (Small)
export function SizeGuideButton({ onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-amber-600 hover:text-amber-800 text-sm font-medium transition-colors ${className}`}
    >
      <Ruler className="w-4 h-4" />
      Size Guide
    </button>
  );
}

// Homepage Section Component
export function LadduGopalSizeSelector() {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      <section className="py-12 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-amber-200">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left - Image/Visual */}
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-8 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">🙏</div>
                  <h3 className="text-3xl font-bold mb-2">Laddu Gopal</h3>
                  <p className="text-amber-100">Poshak Size Guide</p>
                </div>
              </div>
              
              {/* Right - Content */}
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  अपने कान्हा जी के लिए Perfect पोशाक खोजें
                </h2>
                <p className="text-gray-600 mb-6">
                  Tension mat lo ki "Kya ye poshak mere Kanha ko fit aayegi?" - 
                  Humare Size Guide se apni murti ka correct size jaanein aur perfect fitting poshak paayein.
                </p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {SIZE_CHART_DATA.slice(0, 7).map((item) => (
                    <Link
                      key={item.size}
                      to={`/products?category=pooja&laddu_gopal_size=${item.size}`}
                      className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-800 font-bold rounded-full border-2 border-amber-300 hover:border-amber-400 transition-all shadow hover:shadow-md"
                    >
                      {item.size}
                    </Link>
                  ))}
                </div>
                
                <button
                  onClick={() => setShowGuide(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <Ruler className="w-5 h-5" />
                  Complete Size Guide देखें
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LadduGopalSizeGuideModal 
        isOpen={showGuide} 
        onClose={() => setShowGuide(false)} 
      />
    </>
  );
}

export { SIZE_CHART_DATA };
export default LadduGopalSizeGuideModal;
