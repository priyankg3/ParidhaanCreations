import React from "react";
import { Flame, Sparkles, Clock, XCircle, Star, TrendingUp, Award, Tag } from "lucide-react";

const ProductBadge = ({ type, className = "" }) => {
  if (!type) return null;

  const badges = {
    'new': {
      label: 'NEW ARRIVAL',
      bgColor: 'bg-gradient-to-r from-green-500 to-emerald-600',
      icon: Sparkles,
      position: 'top-4 left-4'
    },
    'hot': {
      label: 'HOT',
      bgColor: 'bg-gradient-to-r from-red-500 to-orange-600',
      icon: Flame,
      position: 'top-4 left-4'
    },
    'trending': {
      label: 'TRENDING',
      bgColor: 'bg-gradient-to-r from-purple-500 to-pink-600',
      icon: TrendingUp,
      position: 'top-4 left-4'
    },
    'limited': {
      label: 'LIMITED',
      bgColor: 'bg-gradient-to-r from-amber-500 to-yellow-600',
      icon: Clock,
      position: 'top-4 left-4'
    },
    'out-of-stock': {
      label: 'OUT OF STOCK',
      bgColor: 'bg-gray-500',
      icon: XCircle,
      position: 'top-4 right-4'
    },
    'featured': {
      label: 'FEATURED',
      bgColor: 'bg-gradient-to-r from-secondary to-accent',
      icon: Star,
      position: 'top-4 left-4'
    },
    'bestseller': {
      label: 'BESTSELLER',
      bgColor: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      icon: Award,
      position: 'top-4 left-4'
    },
    'sale': {
      label: 'SALE',
      bgColor: 'bg-gradient-to-r from-rose-500 to-red-600',
      icon: Tag,
      position: 'top-4 left-4'
    }
  };

  const badge = badges[type];
  if (!badge) return null;

  const Icon = badge.icon;

  return (
    <div className={`absolute ${badge.position} z-10 ${className}`}>
      <div className={`${badge.bgColor} text-white px-3 py-1 text-xs font-bold tracking-wider flex items-center space-x-1 shadow-lg animate-pulse`}>
        <Icon className="w-3 h-3" />
        <span>{badge.label}</span>
      </div>
      {/* Ribbon tail effect */}
      <div className={`absolute -bottom-1 left-0 w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] ${
        type === 'hot' ? 'border-t-red-700' :
        type === 'new' ? 'border-t-green-700' :
        type === 'trending' ? 'border-t-purple-700' :
        type === 'limited' ? 'border-t-amber-700' :
        type === 'out-of-stock' ? 'border-t-gray-700' :
        type === 'bestseller' ? 'border-t-blue-700' :
        type === 'sale' ? 'border-t-rose-700' :
        'border-t-accent'
      }`}></div>
    </div>
  );
};

export default ProductBadge;
