import React from 'react';
import {
  Utensils,
  Home,
  Car,
  HeartPulse,
  Smile,
  GraduationCap,
  Tv,
  MoreHorizontal,
  Briefcase,
  Coins,
  TrendingUp,
  RotateCcw,
  Landmark,
  CreditCard,
  Wallet,
  ShoppingBag,
  Coffee,
  Plane,
  ShieldCheck,
  Palmtree,
  Sparkles,
  HelpCircle
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Utensils,
  Home,
  Car,
  HeartPulse,
  Smile,
  GraduationCap,
  Tv,
  MoreHorizontal,
  Briefcase,
  Coins,
  TrendingUp,
  RotateCcw,
  Landmark,
  CreditCard,
  Wallet,
  ShoppingBag,
  Coffee,
  Plane,
  ShieldCheck,
  Palmtree,
  Sparkles
};

interface CategoryIconProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
  circle?: boolean;
}

export function CategoryIcon({
  name,
  color = '#10B981',
  size = 20,
  className = '',
  circle = true
}: CategoryIconProps) {
  const IconComponent = ICON_MAP[name] || HelpCircle;

  if (circle) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl flex-shrink-0 transition-transform ${className}`}
        style={{
          backgroundColor: `${color}18`,
          color: color,
          width: size * 2,
          height: size * 2
        }}
      >
        <IconComponent size={size} strokeWidth={2.2} />
      </div>
    );
  }

  return <IconComponent size={size} strokeWidth={2.2} style={{ color }} className={className} />;
}
