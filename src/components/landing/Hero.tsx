import React, { useEffect, useState } from 'react';
import { ArrowRight, Zap, Truck, Clock } from 'lucide-react';

interface HeroProps {
  t: (key: string) => string;
}

const Hero: React.FC<HeroProps> = ({ t }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
      <section id="hero" className="hero-bg min-h-screen flex items-center justify-center py-20">
        <div className="hero-content container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto">
            {/* Floating Elements */}
            <div className="absolute top-20 left-10 floating-element">
              <Zap className="h-16 w-16 text-[#FFD000] lightning-bolt opacity-30" />
            </div>
            <div className="absolute top-32 right-20 floating-element" style={{ animationDelay: '2s' }}>
              <Truck className="h-12 w-12 text-[#FFD000] hero-truck opacity-20 transform scale-x-[-1]" />
            </div>
            <div className="absolute bottom-40 left-20 floating-element" style={{ animationDelay: '4s' }}>
              <Clock className="h-10 w-10 text-[#FFD000] opacity-25" />
            </div>
            
            {/* Main Content */}
            <div className="relative z-10">
              <div className="mb-8">
                <Zap className="h-20 w-20 mx-auto text-[#FFD000] lightning-bolt" />
              </div>
              
              <h1 className="will-animate text-4xl md:text-7xl font-black leading-tight mb-6 text-white hero-title" dangerouslySetInnerHTML={{ __html: t('heroTitle') }}></h1>

              <p className="will-animate text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8 hero-subtitle">
                {t('heroSubtitle')}
              </p>
              
              <div className="will-animate flex flex-col sm:flex-row gap-6 justify-center items-center hero-cta">
                <button
                  onClick={() => {
                    const element = document.getElementById('pricing');
                    if (element) {
                      const headerHeight = 80;
                      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                      const offsetPosition = elementPosition - headerHeight;
                      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                    }
                  }}
                  className="pulse-glow bg-[#FFD000] text-[#061A40] px-8 py-4 rounded-xl text-xl font-bold hover:bg-[#e6bb00] transition-all duration-300 flex items-center group"
                >
                  {t('heroCTA')}
                  <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button
                  onClick={() => {
                    const element = document.getElementById('about');
                    if (element) {
                      const headerHeight = 80;
                      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                      const offsetPosition = elementPosition - headerHeight;
                      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                    }
                  }}
                  className="border-2 border-[#FFD000] text-[#FFD000] px-8 py-4 rounded-xl text-xl font-bold hover:bg-[#FFD000] hover:text-[#061A40] transition-all duration-300"
                >
                  {t('learnMore')}
                </button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
                <div className="will-animate stats-counter text-center">
                  <div className="text-4xl font-black text-[#FFD000] mb-2">99.9%</div>
                  <div className="text-gray-300">{t('heroStat1Text')}</div>
                </div>
                <div className="will-animate stats-counter text-center" style={{ animationDelay: '0.2s' }}>
                  <div className="text-4xl font-black text-[#FFD000] mb-2">24/7</div>
                  <div className="text-gray-300">{t('heroStat2Text')}</div>
                </div>
                <div className="will-animate stats-counter text-center" style={{ animationDelay: '0.4s' }}>
                  <div className="text-4xl font-black text-[#FFD000] mb-2">{t('heroStat3Value')}</div>
                  <div className="text-gray-300">{t('heroStat3Text')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
};

export default Hero;