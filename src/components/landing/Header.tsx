import React, { useState, useEffect } from 'react';
import { Zap, Menu, X, Package } from 'lucide-react';

interface HeaderProps {
  currentLang: string;
  setLanguage: (lang: 'en' | 'ar') => void;
  t: (key: string) => string;
}

const Header: React.FC<HeaderProps> = ({ currentLang, setLanguage, t }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      
      const sections = ['hero', 'tracking', 'services', 'about', 'pricing', 'subscriptions', 'testimonials', 'contact'];
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      sections.forEach((section) => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= windowHeight / 2 && rect.bottom >= windowHeight / 2) {
            setActiveSection(section);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  const navItems = [
    { id: 'hero', label: t('navHome') },
    { id: 'services', label: t('navServices') },
    { id: 'about', label: t('navAbout') },
    { id: 'pricing', label: t('navPricing') },
    { id: 'subscriptions', label: t('navSubscriptions') },
    { id: 'testimonials', label: t('navTestimonials') },
    { id: 'contact', label: t('navContact') }
  ];

  return (
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'header-blur shadow-xl' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="logo-bounce">
                <img src="/shuhna-logo.png" alt="Shuhna Express Logo" className="h-10 w-auto" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#FFD000] to-[#FFF700] bg-clip-text text-transparent">
                Shuhna Express
              </h1>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-x-8">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`nav-link text-sm font-medium transition-all duration-300 ${
                    activeSection === item.id ? 'text-[#FFD000] active' : 'text-white hover:text-[#FFD000]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-x-4">
               <a href="/app.html" className="px-4 py-2 rounded-lg text-sm border-2 border-white/80 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-300 font-semibold">
                {t('navLogin')}
              </a>
              <button
                onClick={() => scrollToSection('tracking')}
                className="bg-[#FFD000] text-[#061A40] px-6 py-2 rounded-lg font-semibold hover:bg-[#e6bb00] transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center"
              >
                <Package className="inline h-4 w-4 me-2" />
                {t('navTrackShipment')}
              </button>
              <button
                onClick={() => setLanguage(currentLang === 'en' ? 'ar' : 'en')}
                className="px-4 py-2 rounded-lg border-2 border-[#FFD000] text-[#FFD000] hover:bg-[#FFD000] hover:text-[#061A40] transition-all duration-300 font-semibold"
              >
                {currentLang === 'en' ? 'AR' : 'EN'}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-white hover:text-[#FFD000] transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mobile-menu-slide bg-[#061A40]/95 backdrop-blur-md rounded-lg mt-2 mb-4 p-4">
              <div className="space-y-3">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left px-4 py-3 rounded-lg transition-all duration-300 ${
                      activeSection === item.id 
                        ? 'bg-[#FFD000] text-[#061A40] font-semibold' 
                        : 'text-white hover:bg-[#FFD000]/10 hover:text-[#FFD000]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="flex space-x-3 pt-3 border-t border-white/20">
                   <a href="/app.html" className="flex-1 text-center bg-transparent border-2 border-white/80 text-white/80 px-4 py-2 rounded-lg font-semibold">
                      {t('navLogin')}
                   </a>
                  <button
                    onClick={() => scrollToSection('tracking')}
                    className="flex-1 bg-[#FFD000] text-[#061A40] px-4 py-2 rounded-lg font-semibold text-center"
                  >
                    {t('navTrackShipment')}
                  </button>
                  <button
                    onClick={() => setLanguage(currentLang === 'en' ? 'ar' : 'en')}
                    className="px-4 py-2 rounded-lg border-2 border-[#FFD000] text-[#FFD000] font-semibold"
                  >
                    {currentLang === 'en' ? 'AR' : 'EN'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
  );
};

export default Header;