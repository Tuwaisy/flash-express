import React from 'react';

// Using a type for props to be explicit
type IconProps = {
  className?: string;
};

// --- NEW ICONS FOR BOLT DESIGN ---
export const SidebarSimpleIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V200H40V56ZM96,56V200H40V56Z"></path></svg>
);

export const SignOutIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="currentColor" viewBox="0 0 256 256"><path d="M112,216a8,8,0,0,1-8,8H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h56a8,8,0,0,1,0,16H48V208h56A8,8,0,0,1,112,216Zm109.66-92.69-48-48a8,8,0,0,0-11.32,11.32L196.69,120H104a8,8,0,0,0,0,16h92.69l-34.35,34.35a8,8,0,0,0,11.32,11.32l48-48A8,8,0,0,0,221.66,123.31Z"></path></svg>
);

export const GearSixIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="currentColor" viewBox="0 0 256 256"><path d="M222.6,110.8l-27.42-10.32a8,8,0,0,1-4.48-11L200.25,66a8,8,0,0,0-2.45-9.28L174.4,33.28a8,8,0,0,0-9.28-2.45l-23.5,9.55a8,8,0,0,1-11-4.48L110.8,8.48A8,8,0,0,0,102.48,2H81.52a8,8,0,0,0-8.32,6.48l-10.32,27.42a8,8,0,0,1-11,4.48L28.4,30.83a8,8,0,0,0-9.28,2.45L.68,56.68a8,8,0,0,0,2.45,9.28l23.5,23.5a8,8,0,0,1,4.48,11L8.48,127.8A8,8,0,0,0,2,136.12v21.36a8,8,0,0,0,6.48,8.32l27.42,10.32a8,8,0,0,1,4.48,11L30.83,210.6a8,8,0,0,0,2.45,9.28l23.4,23.44a8,8,0,0,0,9.28,2.45l23.5-9.55a8,8,0,0,1,11,4.48l10.32,27.42A8,8,0,0,0,110.08,254h21.36a8,8,0,0,0,8.32-6.48l10.32-27.42a8,8,0,0,1,11-4.48l23.5,9.55a8,8,0,0,0,9.28-2.45l23.4-23.44a8,8,0,0,0,2.45-9.28l-9.55-23.5a8,8,0,0,1,4.48-11l27.42-10.32A8,8,0,0,0,238,157.48V136.12A8,8,0,0,0,232.2,127.8ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z"></path></svg>
);

export const CreditCardIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="currentColor" viewBox="0 0 256 256"><path d="M224,56H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V72A16,16,0,0,0,224,56Zm0,16V96H32V72ZM32,184V112H224V184Z"></path></svg>
);
// --- End New Icons ---


export const LogoIcon = ({ className = 'w-10 h-10' }: IconProps) => (
  <svg viewBox="0 0 200 165" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Truck and Bolt Group */}
    <g transform="translate(0, 5)">
        {/* Truck outline */}
        <path d="M17,67 v-20 h20 l15-20 h50 v40 h20 v-15 h15 v20 h10 v-20 h-5" stroke="#061A40" strokeWidth="6" fill="#061A40" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M37,47 v20" stroke="#061A40" strokeWidth="6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M17,57 H7" stroke="#061A40" strokeWidth="6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        
        {/* Wheels */}
        <circle cx="45" cy="67" r="12" stroke="#061A40" strokeWidth="6" fill="#FFFFFF" />
        <circle cx="125" cy="67" r="12" stroke="#061A40" strokeWidth="6" fill="#FFFFFF" />
        <circle cx="45" cy="67" r="5" fill="#FFD000" />
        <circle cx="125" cy="67" r="5" fill="#FFD000" />
        
        {/* Lightning Bolt */}
        <path d="M87,25 L70,48 L85,48 L75,70 L92,45 L77,45 Z" fill="#FFD000" stroke="none" />
    </g>

    {/* Text */}
    <text x="100" y="115" fontFamily="Arial, Helvetica, sans-serif" fontSize="36" fontWeight="bold" fill="#061A40" textAnchor="middle">FLASH</text>
    <text x="100" y="140" fontFamily="Arial, Helvetica, sans-serif" fontSize="16" fontWeight="500" fill="#FFD000" textAnchor="middle" letterSpacing="0.5">EXPRESS SHIPPING</text>
  </svg>
);
// ... keep existing icons ...
export const DashboardIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
);

export const PackageIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
);

export const TruckIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
);

export const UsersIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="currentColor" viewBox="0 0 256 256"><path d="M240,128a113.33,113.33,0,0,1-48.84,92.51,16,16,0,0,1-19.82-24.64,80.1,80.1,0,0,0-86.68,0A16,16,0,0,1,64.84,220.51,112,112,0,1,1,240,128ZM128,144a40,40,0,1,0-40-40A40,40,0,0,0,128,144Z"></path></svg>
);

export const WalletIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
);

export const LogoutIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
);

export const ChartBarIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
);

export const ClipboardListIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
);

export const PlusCircleIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);

export const ChevronDownIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

export const CheckCircleIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);

export const XCircleIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);

export const InformationCircleIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const PrinterIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
);

export const PencilIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"></path></svg>
);

export const PhoneIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
);

export const TrashIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
);

export const KeyIcon = ({ className = 'w-5 h-5' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4v-3l1.258-1.258a6 6 0 015.742-10.485A6 6 0 0115 7z"></path></svg>
);

export const ArrowUpCircleIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z"></path></svg>
);

export const DocumentDownloadIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
);

export const ReplyIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4"></path></svg>
);

export const SwitchHorizontalIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
);

export const UserCircleIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);

export const MapPinIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
);

export const TrendingUpIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
);

export const QrcodeIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11v1m-6-16v1m12 11v1M4 12H3m10 6H3m10-12H3m18 12h-1M4 20v-1m0-6V3m0 18v-1M20 4v1m0 12v1M4 4h1m15 15h1M4 8h1m15 7h1m-6-4h.01M12 12h.01M8 12h.01M12 16h.01M16 12h.01M16 16h.01M8 16h.01M12 8h.01M16 8h.01M8 8h.01"></path></svg>
);

export const BellIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
);

export const MailIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
);

export const CurrencyDollarIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 14v3m-3-3h6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

export const UploadCloudIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V16a4 4 0 01-4 4h-1m-4-8h12"></path></svg>
);

export const DownloadIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
);

export const UploadIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12"></path></svg>
);

export const ClockIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);

export const XIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
);

export const MenuIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
);

export const CogIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
);

export const LockClosedIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
);

export const CameraIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
);

export const ArchiveBoxIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12l-8 4-8-4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6" /></svg>
);

export const TagIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l-4 4 4 4" /></svg>
);

export const ShieldIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944a11.955 11.955 0 019-2.606 11.955 11.955 0 019 2.606 12.02 12.02 0 00-2.382-9.008z"></path></svg>
);

export const AwardIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2m-2-2a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

export const CrownIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm-3-7a9 9 0 01.121 17.804m-2.121-2.121a1.5 1.5 0 00-2.121 2.121M12 21a9 9 0 01-9-9h18a9 9 0 01-9 9z" transform="rotate(-45 12 12)" /><path d="M14 21L12 19l-2 2" /><path d="M12 3v2" /><path d="M5.636 5.636l1.414 1.414M18.364 5.636l-1.414 1.414" /></svg>
);

export const WrenchIcon = ({ className = 'w-4 h-4' }: IconProps) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
);

export const SunIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="currentColor" viewBox="0 0 256 256"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160ZM232,128A8,8,0,0,1,224,136H200a8,8,0,0,1,0-16h24A8,8,0,0,1,232,128ZM128,24a8,8,0,0,1-8-8V8a8,8,0,0,1,16,0V16A8,8,0,0,1,128,24Zm-80,42.34A8,8,0,0,0,59.31,77.66l17-17a8,8,0,0,0-11.32-11.32l-17,17A8,8,0,0,0,48,66.34ZM183,183a8,8,0,0,0-11.31-11.31l-17,17a8,8,0,0,0,11.31,11.31l17-17A8,8,0,0,0,183,183ZM128,232a8,8,0,0,1,8,8v8a8,8,0,0,1-16,0v-8A8,8,0,0,1,128,232ZM56,128a8,8,0,0,1-8-8V96a8,8,0,0,1,16,0v24A8,8,0,0,1,56,128ZM197.66,48a8,8,0,0,0-11.32,0l-17,17a8,8,0,0,0,11.32,11.32l17-17A8,8,0,0,0,197.66,48ZM76.34,197.66,59.31,180.69a8,8,0,0,0-11.31,11.31l17,17a8,8,0,0,0,11.31-11.31Z"></path></svg>
);

export const MoonIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="currentColor" viewBox="0 0 256 256"><path d="M216.7,152.61A95.82,95.82,0,0,1,103.39,39.3a8,8,0,0,0-10.9-10.9,111.94,111.94,0,0,0,16.5,152.91A112,112,0,0,0,227.6,227.6a8,8,0,0,0-10.9-10.9A95.82,95.82,0,0,1,216.7,152.61Z"></path></svg>
);

export const DatabaseResetIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="currentColor" viewBox="0 0 256 256"><path d="M128,24C74.17,24,32,48.6,32,80v96c0,31.4,42.17,56,96,56s96-24.6,96-56V80C224,48.6,181.83,24,128,24Zm80,56c0,13.25-35.82,40-80,40S48,93.25,48,80s35.82-40,80-40S208,66.75,208,80ZM48,105.61c18.11,10.14,48.44,18.39,80,18.39s61.89-8.25,80-18.39V128c0,13.25-35.82,40-80,40S48,141.25,48,128Zm160,70.78c-18.11,10.14-48.44,18.39-80,18.39s-61.89-8.25-80-18.39V176c0,13.25,35.82,40,80,40s80-26.75,80-40Z"></path></svg>
);

export const RefreshIcon = ({ className = 'w-6 h-6' }: IconProps) => (
    <svg className={className} fill="currentColor" viewBox="0 0 256 256"><path d="M197.67,186.37a8,8,0,0,1,0,11.29C196.58,198.73,165.23,228,128,228c-37.23,0-68.58-29.27-69.67-30.34a8,8,0,1,1,11.3-11.32C70.73,187.44,97.83,212,128,212s57.27-24.56,58.37-25.66A8,8,0,0,1,197.67,186.37ZM128,44c37.23,0,68.58,29.27,69.67,30.34a8,8,0,1,0,11.3-11.32C208.58,62.93,165.23,28,128,28S47.42,62.93,47.03,63.02a8,8,0,1,0,11.3,11.32C59.42,73.27,90.77,44,128,44ZM184,128a56,56,0,1,1-56-56A56.06,56.06,0,0,1,184,128Z"></path></svg>
);