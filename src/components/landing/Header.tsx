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
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => scrollToSection('hero')}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-300"
              >
                <div>
                  <img src="/shuhna-logo.png" alt="Shuhna Express Logo" className="h-16 w-auto" />
                </div>
              </button>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-x-12">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`nav-link text-base font-medium transition-all duration-300 ${
                    activeSection === item.id ? 'text-[#FFD000] active' : 'text-white hover:text-[#FFD000]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-x-6">
               <a href="/app.html" className="px-6 py-3 rounded-lg text-base border-2 border-white/80 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-300 font-semibold">
                {t('navLogin')}
              </a>
              <button
                onClick={() => scrollToSection('tracking')}
                className="bg-[#FFD000] text-[#061A40] px-8 py-3 rounded-lg font-semibold hover:bg-[#e6bb00] transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center"
              >
                <Package className="inline h-5 w-5 me-2" />
                {t('navTrackShipment')}
              </button>
              <button
                onClick={() => setLanguage(currentLang === 'en' ? 'ar' : 'en')}
                className="px-6 py-3 rounded-lg border-2 border-[#FFD000] text-[#FFD000] hover:bg-[#FFD000] hover:text-[#061A40] transition-all duration-300 font-semibold"
              >
                {currentLang === 'en' ? 'AR' : 'EN'}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-3 text-white hover:text-[#FFD000] transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mobile-menu-slide bg-[#061A40]/95 backdrop-blur-md rounded-lg mt-3 mb-6 p-6">
              <div className="space-y-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left px-6 py-4 rounded-lg transition-all duration-300 text-base ${
                      activeSection === item.id 
                        ? 'bg-[#FFD000] text-[#061A40] font-semibold' 
                        : 'text-white hover:bg-[#FFD000]/10 hover:text-[#FFD000]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="flex space-x-4 pt-4 border-t border-white/20">
                   <a href="/app.html" className="flex-1 text-center bg-transparent border-2 border-white/80 text-white/80 px-6 py-3 rounded-lg font-semibold">
                      {t('navLogin')}
                   </a>
                  <button
                    onClick={() => scrollToSection('tracking')}
                    className="flex-1 bg-[#FFD000] text-[#061A40] px-6 py-3 rounded-lg font-semibold text-center"
                  >
                    {t('navTrackShipment')}
                  </button>
                  <button
                    onClick={() => setLanguage(currentLang === 'en' ? 'ar' : 'en')}
                    className="px-6 py-3 rounded-lg border-2 border-[#FFD000] text-[#FFD000] font-semibold"
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