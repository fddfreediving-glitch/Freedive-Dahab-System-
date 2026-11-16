import type { CustomerRequestItemInput, PosCatalogCurrency, PosCatalogGroup } from '../types';

export interface PosCatalogSeedItem {
  id: string;
  group: PosCatalogGroup;
  name: string;
  category: CustomerRequestItemInput['category'];
  price?: number;
  priceCurrency?: PosCatalogCurrency;
  unit?: string;
  description?: string;
  tier?: { minimumQuantity: number; unitPrice: number };
  stayDiscount?: boolean;
}

export const initialPosCatalog: PosCatalogSeedItem[] = [
  { id: 'ssi-freediver', group: 'Courses', name: 'SSI Freediver', category: 'course', price: 310, priceCurrency: 'EUR' },
  { id: 'ssi-advanced', group: 'Courses', name: 'Advanced Freediver', category: 'course', price: 360, priceCurrency: 'EUR' },
  { id: 'ssi-performance', group: 'Courses', name: 'Performance Freediver', category: 'course', price: 480, priceCurrency: 'EUR' },
  { id: 'instructor-tuition', group: 'Courses', name: 'Instructor Course tuition', category: 'course', price: 1245, priceCurrency: 'EUR' },
  { id: 'instructor-kit', group: 'Courses', name: 'Instructor Course kit & fees', category: 'course', price: 200, priceCurrency: 'EUR' },
  { id: 'advanced-instructor-tuition', group: 'Courses', name: 'Advanced Instructor tuition', category: 'course', price: 1245, priceCurrency: 'EUR' },
  { id: 'advanced-instructor-kit', group: 'Courses', name: 'Advanced Instructor kit & fees', category: 'course', price: 200, priceCurrency: 'EUR' },
  { id: 'performance-instructor-day', group: 'Courses', name: 'Performance Instructor training', category: 'course', price: 120, priceCurrency: 'EUR', unit: 'day' },
  { id: 'performance-instructor-cert', group: 'Courses', name: 'Performance Instructor certification', category: 'course', price: 60, priceCurrency: 'EUR' },
  { id: 'react-right', group: 'Courses', name: 'React Right', category: 'course', price: 130, priceCurrency: 'EUR' },
  { id: 'marine-ecology', group: 'Courses', name: 'Marine Ecology', category: 'course', price: 150, priceCurrency: 'EUR' },
  { id: 'equalization-online', group: 'Courses', name: 'Equalization Class (online)', category: 'course', price: 55, priceCurrency: 'EUR' },
  { id: 'mouthfill', group: 'Courses', name: 'Mouthfill', category: 'course', price: 120, priceCurrency: 'EUR' },
  { id: 'beginner-week', group: 'Packages', name: 'Beginner Week', category: 'package', price: 450, priceCurrency: 'EUR', description: 'Beginner Week — diving only' },
  { id: 'advanced-week', group: 'Packages', name: 'Advanced Week', category: 'package', price: 490, priceCurrency: 'EUR' },
  { id: 'beginner-advanced-combo', group: 'Packages', name: 'Beginner + Advanced Combo', category: 'package', price: 690, priceCurrency: 'EUR' },
  { id: 'training-week-diving', group: 'Packages', name: 'Training Week — diving only', category: 'package', price: 300, priceCurrency: 'EUR' },
  { id: 'training-week-low', group: 'Packages', name: 'Training Week — 8 nights, low season', category: 'package', price: 445, priceCurrency: 'EUR' },
  { id: 'training-week-high', group: 'Packages', name: 'Training Week — 8 nights, high season', category: 'package', price: 485, priceCurrency: 'EUR' },
  { id: 'master-program', group: 'Packages', name: 'Master Program — from €335 / 2 weeks', category: 'package', description: 'Master Program — 2–5 weeks; confirm duration and final price' },
  { id: 'zero-to-hero', group: 'Packages', name: 'Zero to Hero', category: 'package', price: 2945, priceCurrency: 'EUR', description: 'Zero to Hero (website normal price €3,310)' },
  { id: 'training-techniques', group: 'Training', name: 'Training Techniques', category: 'course', price: 160, priceCurrency: 'EUR', tier: { minimumQuantity: 2, unitPrice: 135 } },
  { id: 'monofin-class', group: 'Training', name: 'Monofin class', category: 'course', price: 125, priceCurrency: 'EUR', tier: { minimumQuantity: 2, unitPrice: 110 } },
  { id: 'monofin-open-water', group: 'Training', name: 'Monofin full open-water version', category: 'course', price: 205, priceCurrency: 'EUR', tier: { minimumQuantity: 2, unitPrice: 190 } },
  { id: 'no-fins', group: 'Training', name: 'No-Fins', category: 'course', price: 125, priceCurrency: 'EUR', tier: { minimumQuantity: 2, unitPrice: 100 } },
  { id: 'variable-weight', group: 'Training', name: 'Variable Weight', category: 'course', price: 115, priceCurrency: 'EUR', tier: { minimumQuantity: 2, unitPrice: 100 } },
  { id: 'advanced-training-2', group: 'Training', name: 'Advanced Training — 2 weeks / 10 sessions', category: 'package', price: 375, priceCurrency: 'EUR' },
  { id: 'advanced-training-3', group: 'Training', name: 'Advanced Training — 3 weeks / 15 sessions', category: 'package', price: 535, priceCurrency: 'EUR' },
  { id: 'advanced-training-4', group: 'Training', name: 'Advanced Training — 4 weeks / 20 sessions', category: 'package', price: 665, priceCurrency: 'EUR' },
  { id: 'group-training', group: 'Training', name: 'Group training session', category: 'course', unit: 'session', description: 'Group training — confirm location and group-size rate' },
  { id: 'private-training', group: 'Training', name: 'Private training session', category: 'course', unit: 'session', description: 'Private training — confirm location and rate' },
  { id: 'ras-mohamed', group: 'Activities', name: 'Ras Mohamed', category: 'other', price: 78, priceCurrency: 'EUR' },
  { id: 'night-freedive', group: 'Activities', name: 'Night Freedive', category: 'other', price: 38, priceCurrency: 'EUR' },
  { id: 'desert-bbq', group: 'Activities', name: 'Desert BBQ', category: 'other', price: 20, priceCurrency: 'EUR' },
  { id: 'ice-bath', group: 'Activities', name: 'Ice Bath', category: 'other', price: 200, priceCurrency: 'EGP' },
  { id: 'yoga-morning', group: 'Activities', name: 'Yoga — morning', category: 'other', price: 4, priceCurrency: 'EUR' },
  { id: 'yoga-sunset', group: 'Activities', name: 'Yoga — Sunday sunset', category: 'other', price: 8, priceCurrency: 'EUR' },
  { id: 'room-lighthouse-low-single', group: 'Accommodation', name: 'Lighthouse Room · single · low season', category: 'accommodation', price: 25, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-lighthouse-low-double', group: 'Accommodation', name: 'Lighthouse Room · double · low season', category: 'accommodation', price: 35, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-lighthouse-high-single', group: 'Accommodation', name: 'Lighthouse Room · single · high season', category: 'accommodation', price: 30, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-lighthouse-high-double', group: 'Accommodation', name: 'Lighthouse Room · double · high season', category: 'accommodation', price: 40, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-blue-hole-low-single', group: 'Accommodation', name: 'Blue Hole Room · single · low season', category: 'accommodation', price: 25, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-blue-hole-low-double', group: 'Accommodation', name: 'Blue Hole Room · double · low season', category: 'accommodation', price: 35, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-blue-hole-high-single', group: 'Accommodation', name: 'Blue Hole Room · single · high season', category: 'accommodation', price: 30, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-blue-hole-high-double', group: 'Accommodation', name: 'Blue Hole Room · double · high season', category: 'accommodation', price: 40, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-eal-garden-low-single', group: 'Accommodation', name: 'Eal Garden Room · single · low season', category: 'accommodation', price: 25, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-eal-garden-low-double', group: 'Accommodation', name: 'Eal Garden Room · double · low season', category: 'accommodation', price: 35, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-eal-garden-high-single', group: 'Accommodation', name: 'Eal Garden Room · single · high season', category: 'accommodation', price: 30, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-eal-garden-high-double', group: 'Accommodation', name: 'Eal Garden Room · double · high season', category: 'accommodation', price: 40, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-islands-low-single', group: 'Accommodation', name: 'Islands Room · single · low season', category: 'accommodation', price: 25, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-islands-low-double', group: 'Accommodation', name: 'Islands Room · double · low season', category: 'accommodation', price: 35, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-islands-high-single', group: 'Accommodation', name: 'Islands Room · single · high season', category: 'accommodation', price: 30, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'room-islands-high-double', group: 'Accommodation', name: 'Islands Room · double · high season', category: 'accommodation', price: 40, priceCurrency: 'EUR', unit: 'night', stayDiscount: true },
  { id: 'nose-clip', group: 'Shop', name: 'Freedive Dahab nose clip', category: 'shop' },
  { id: 't-shirt', group: 'Shop', name: 'Freedive Dahab T-shirt', category: 'shop' },
  { id: 'poncho', group: 'Shop', name: 'Freedive Dahab poncho', category: 'shop' },
];
